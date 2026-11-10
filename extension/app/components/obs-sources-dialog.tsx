import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppWindow, Aperture, Ban, Camera, Clapperboard, Eye, EyeOff, Film, Folder, Gamepad2, Globe, Image, Layers, LucideIcon, Monitor, RefreshCw, Square, Type, X } from "lucide-react";
import config from "config";
import toast from "react-hot-toast";
import { OBSClient } from "@/lib/obs/client";
import { OBSSourceAction, OBSSourceRule, OBSType, Scene, SceneItem } from "@/types/obs";
import { SettingsOBSClient } from "@/types/settings";
import { Button } from "@/app/components/ui/button";
import { Spinner } from "@/app/components/ui/spinner";
import { cn } from "@/lib/utils";
import i18n from "@/lib/i18n";

interface OBSSourcesDialogProps {
    obsClient: SettingsOBSClient;
    rules: OBSSourceRule[];
    onSave: (rules: OBSSourceRule[], removed: number) => void;
    onClose: () => void;
}

const ruleKey = (sceneName: string, sourceName: string) => `${sceneName}\u0000${sourceName}`;

/**
 * Audio-only inputs (mic, desktop audio, app audio): hiding them does nothing on screen, so they are not listed.
 */
const isAudioSource = (kind?: string | null): boolean =>
    /audio|wasapi|coreaudio|pulse|alsa|jack/.test((kind ?? "").toLowerCase());

/**
 * Picks an icon that resembles the one OBS shows for the source type.
 */
const sourceIcon = (kind?: string | null): LucideIcon => {
    const k = (kind ?? "").toLowerCase();
    if (k === "scene") return Clapperboard;
    if (k === "group") return Folder;
    if (/window/.test(k)) return AppWindow;
    if (/monitor|display|screen/.test(k)) return Monitor;
    if (/game/.test(k)) return Gamepad2;
    if (/browser/.test(k)) return Globe;
    if (/image|slideshow/.test(k)) return Image;
    if (/text/.test(k)) return Type;
    if (/ffmpeg|vlc|media|video/.test(k)) return Film;
    if (/dshow|av_capture|avcapture|v4l2|webcam|camera/.test(k)) return Camera;
    if (/color/.test(k)) return Square;
    return Layers;
};

/**
 * A window that mirrors the OBS "Scenes" and "Sources" docks, so the user can pick which sources are hidden or shown while censorship is active.
 */
export default function OBSSourcesDialog({ obsClient, rules, onSave, onClose }: OBSSourcesDialogProps) {
    const clientRef = useRef<OBSClient | null>(null);
    const selectedSceneNameRef = useRef<string | null>(null);
    const [status, setStatus] = useState<"connecting" | "ready" | "error">("connecting");
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
    const [items, setItems] = useState<SceneItem[]>([]);
    const [itemsLoading, setItemsLoading] = useState<boolean>(false);
    const [itemsError, setItemsError] = useState<boolean>(false);
    const [isSaving, setSaving] = useState<boolean>(false);
    const [draft, setDraft] = useState<Map<string, OBSSourceRule>>(
        () => new Map(rules.map((rule) => [ruleKey(rule.sceneName, rule.sourceName), rule]))
    );

    const loadItems = useCallback(async (scene: Scene) => {
        const client = clientRef.current;
        if (!client) return;
        setItemsLoading(true);
        setItemsError(false);
        let result: SceneItem[] = [];
        let failed = false;
        try {
            result = await client.getSceneItems(scene);
        } catch (e) {
            if (config.debug) console.error(e);
            failed = true;
        }
        // Ignore a late answer for a scene the user has already left
        if (selectedSceneNameRef.current !== scene.name) return;
        setItems(result.filter((item) => !isAudioSource(item.kind)));
        setItemsError(failed);
        setItemsLoading(false);
    }, []);

    const load = useCallback(async () => {
        clientRef.current?.disconnect();
        setStatus("connecting");
        const client = new OBSClient(obsClient);
        clientRef.current = client;
        // OBS was closed while the window is open: nothing can be saved until it reconnects
        client.onClose(() => {
            if (clientRef.current === client) setStatus("error");
        });

        try {
            if (!(await client.connect())) throw new Error("Failed to connect to OBS");
            const [sceneList, programScene] = await Promise.all([client.getScene(), client.getActiveScene()]);
            if (clientRef.current !== client) return;

            setScenes(sceneList);
            setStatus("ready");

            // Keep the selected scene after a refresh, otherwise start from the scene that is on air
            const initial = sceneList.find((s) => s.name === selectedSceneNameRef.current)
                ?? sceneList.find((s) => s.id === programScene?.id)
                ?? sceneList[0]
                ?? null;
            setSelectedScene(initial);
            selectedSceneNameRef.current = initial?.name ?? null;
            if (initial) await loadItems(initial);
        } catch (e) {
            if (config.debug) console.error(e);
            if (clientRef.current === client) setStatus("error");
        }
    }, [obsClient, loadItems]);

    useEffect(() => {
        load();
        return () => {
            clientRef.current?.disconnect();
            clientRef.current = null;
        };
    }, [load]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    const selectScene = (scene: Scene) => {
        if (scene.id === selectedScene?.id) return;
        setSelectedScene(scene);
        selectedSceneNameRef.current = scene.name;
        loadItems(scene);
    };

    const setAction = (sourceName: string, action: OBSSourceAction | null) => {
        if (!selectedScene) return;
        const key = ruleKey(selectedScene.name, sourceName);
        setDraft((prev) => {
            const next = new Map(prev);
            if (action) next.set(key, { sceneName: selectedScene.name, sourceName, action });
            else next.delete(key);
            return next;
        });
    };

    /**
     * Saves the rules, dropping those whose scene or source was deleted in OBS.
     * Scenes and sources are re-read so changes made in OBS after the window was opened are taken into account.
     */
    const handleSave = async () => {
        const client = clientRef.current;
        if (!client || status !== "ready" || isSaving) return;
        setSaving(true);
        try {
            const sceneList = await client.getScene();
            const itemsByScene = new Map<string, SceneItem[]>();
            const kept: OBSSourceRule[] = [];

            for (const rule of draft.values()) {
                const scene = sceneList.find((s) => s.name === rule.sceneName);
                if (!scene) continue;
                if (!itemsByScene.has(scene.name)) {
                    itemsByScene.set(scene.name, await client.getSceneItems(scene));
                }
                if (itemsByScene.get(scene.name)!.some((item) => item.name === rule.sourceName)) {
                    kept.push(rule);
                }
            }

            onSave(kept, draft.size - kept.length);
        } catch (e) {
            if (config.debug) console.error(e);
            toast.error(i18n.t("failedGetSources"));
            setSaving(false);
        }
    };

    const rulesPerScene = useMemo(() => {
        const count = new Map<string, number>();
        draft.forEach((rule) => count.set(rule.sceneName, (count.get(rule.sceneName) ?? 0) + 1));
        return count;
    }, [draft]);

    const obsName = obsClient.type === OBSType.streamlabs ? "Streamlabs" : "OBS Studio";

    return (
        <div className="bg-background/40 backdrop-blur-xs fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="w-full max-w-3xl bg-background border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}>

                {/* Title bar */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-secondary/60">
                    <Aperture size={16} />
                    <div className="text-sm font-semibold">{obsName}</div>
                    <div className={cn("flex items-center gap-1.5 text-xs font-medium ml-2",
                        status === "ready" ? "text-green-500" : status === "error" ? "text-red-500" : "text-muted-foreground")}>
                        <span className={cn("size-1.5 rounded-full",
                            status === "ready" ? "bg-green-500" : status === "error" ? "bg-red-500" : "bg-muted-foreground animate-pulse")} />
                        {status === "ready" ? i18n.t("obsConnected") : status === "error" ? i18n.t("connectionFailed") : i18n.t("obsConnecting")}
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="size-7" title={i18n.t("refresh")}
                            disabled={status === "connecting"} onClick={load}>
                            <RefreshCw className={cn(status === "connecting" && "animate-spin")} />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7" title={i18n.t("close")} onClick={onClose}>
                            <X />
                        </Button>
                    </div>
                </div>

                {/* Docks */}
                <div className="grid grid-cols-[13rem_minmax(0,1fr)] h-80 bg-secondary/30">
                    <Dock title={i18n.t("scenes")} className="border-r border-border">
                        {scenes.map((scene) => {
                            const count = rulesPerScene.get(scene.name) ?? 0;
                            return (
                                <button
                                    key={scene.id}
                                    onClick={() => selectScene(scene)}
                                    className={cn("w-full flex items-center gap-2 text-left text-xs font-medium px-3 py-1.5 cursor-pointer",
                                        selectedScene?.id === scene.id ? "bg-primary text-primary-foreground" : "hover:bg-foreground/10")}>
                                    <span className="truncate flex-1 min-w-0" title={scene.name}>{scene.name}</span>
                                    {count > 0 && (
                                        <span className={cn("text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center",
                                            selectedScene?.id === scene.id ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground")}>{count}</span>
                                    )}
                                </button>
                            );
                        })}
                    </Dock>

                    <Dock title={i18n.t("sources")}>
                        {status === "connecting" || itemsLoading ? (
                            <div className="h-full flex items-center justify-center"><Spinner /></div>
                        ) : status === "error" ? (
                            <EmptyState text={i18n.t("unableConnectObsOrConnectionLost", { obs: obsName })} />
                        ) : itemsError ? (
                            <EmptyState text={i18n.t("failedGetSources")} />
                        ) : items.length === 0 ? (
                            <EmptyState text={i18n.t("noSourcesInScene")} />
                        ) : items.map((item) => {
                            const Icon = sourceIcon(item.kind);
                            const action = draft.get(ruleKey(selectedScene!.name, item.name))?.action ?? null;
                            return (
                                <div key={item.id}
                                    className={cn("flex items-center gap-2 px-3 py-1.5 text-xs font-medium border-l-2",
                                        action === OBSSourceAction.hide ? "border-red-500 bg-red-500/5"
                                            : action === OBSSourceAction.show ? "border-green-500 bg-green-500/5"
                                                : "border-transparent")}>
                                    <Icon size={14} className="shrink-0 text-muted-foreground" />
                                    <span className="truncate flex-1 min-w-0" title={item.name}>{item.name}</span>
                                    <span title={item.enabled ? i18n.t("sourceVisibleNow") : i18n.t("sourceHiddenNow")}
                                        className="text-muted-foreground shrink-0">
                                        {item.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                                    </span>
                                    <ActionPicker value={action} onChange={(value) => setAction(item.name, value)} />
                                </div>
                            );
                        })}
                    </Dock>
                </div>

                {/* Footer */}
                <div className="flex items-center gap-4 px-4 py-3 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground flex-1">{i18n.t("sourcesHint")}</p>
                    <Button size="sm" variant="ghost" onClick={onClose}>{i18n.t("cancel")}</Button>
                    <Button size="sm" disabled={status !== "ready" || isSaving} onClick={handleSave}>
                        {isSaving && <Spinner />}
                        {i18n.t("save")}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function Dock({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
    return (
        <div className={cn("flex flex-col min-h-0 min-w-0", className)}>
            <div className="text-[11px] font-semibold text-muted-foreground px-3 py-1.5 border-b border-border truncate">{title}</div>
            <div className="flex-1 overflow-y-auto py-1">{children}</div>
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return <div className="h-full flex items-center justify-center text-center text-xs text-muted-foreground px-6">{text}</div>;
}

function ActionPicker({ value, onChange }: { value: OBSSourceAction | null; onChange: (value: OBSSourceAction | null) => void }) {
    const options: { value: OBSSourceAction | null; text: string; icon?: LucideIcon; active: string }[] = [
        { value: null, text: i18n.t("sourceActionNone"), icon: Ban, active: "bg-white text-black shadow-xs" },
        { value: OBSSourceAction.hide, text: i18n.t("hide"), icon: EyeOff, active: "bg-red-500 text-white shadow-xs" },
        { value: OBSSourceAction.show, text: i18n.t("sourceActionShow"), icon: Eye, active: "bg-green-600 text-white shadow-xs" },
    ];
    return (
        <div className="flex shrink-0 rounded-md bg-secondary border border-border p-0.5">
            {options.map((option) => (
                <button
                    key={option.value ?? "none"}
                    title={option.text}
                    onClick={() => onChange(option.value)}
                    className={cn("flex items-center gap-1 text-xs font-medium rounded px-2 py-0.5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                        value === option.value ? option.active : "text-muted-foreground hover:text-foreground")}>
                    {option.icon && <option.icon size={12} />}
                    {option.text}
                </button>
            ))}
        </div>
    );
}
