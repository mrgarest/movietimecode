import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"
import { SettingsOBSClientNull } from '@/types/settings'
import { Input } from '@/app/components/ui/input';
import config from 'config';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { OBSClient } from "@/lib/obs/client"
import { Button } from "@/app/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/app/components/ui/form"
import toast from 'react-hot-toast';
import SettingsCard from '@/app/components/settings-card';
import { cn } from '@/lib/utils';
import i18n from '@/lib/i18n';
import { settings } from '@/utils/settings';
import { OBSSourceAction, OBSSourceRule, OBSType, Scene, SceneItem } from '@/types/obs';
import OBSSourcesDialog from '@/app/components/obs-sources-dialog';
import { ChevronRight, Eye, EyeOff } from 'lucide-react';

const formSchemaConnection = z.object({
    host: z.string().ip(),
    port: z.number().min(1),
    auth: z.string().min(1),
    type: z.string().min(1),
});

export default function OBSControlPage() {
    const [obsClient, setObsClient] = useState<SettingsOBSClientNull>(null);
    const [isConnectionEnabled, setConnectionEnabled] = useState<boolean>(true);
    const [obsSourceRules, setObsSourceRules] = useState<OBSSourceRule[]>([]);
    const [isSourcesDialog, setSourcesDialog] = useState<boolean>(false);
    const [isSourcesTestRunning, setSourcesTestRunning] = useState<boolean>(false);
    const [isAuthVisible, setAuthVisible] = useState<boolean>(false);

    const formConnection = useForm<z.infer<typeof formSchemaConnection>>({
        resolver: zodResolver(formSchemaConnection),
        defaultValues: settings.get("obsClient") || {
            host: '127.0.0.1',
            port: 0,
            auth: '',
            type: ''
        },
    });

    useEffect(() => {
        const obs = settings.get("obsClient");

        if (obs) {
            formConnection.setValue('host', obs.host);
            formConnection.setValue('port', obs.port);
            formConnection.setValue('auth', obs.auth);
            formConnection.setValue('type', obs.type);
            setObsClient(obs);
        } else setObsClient(null);

        setObsSourceRules(settings.get("obsSourceRules") ?? []);
    }, []);

    /**
     * Handles the connection form to OBS and checks the connection.
     * @param values 
     * @returns 
     */
    const handleConnection = async (values: z.infer<typeof formSchemaConnection>) => {
        if (!isConnectionEnabled) return;
        try {
            setConnectionEnabled(false);
            const obsClientSettings: SettingsOBSClientNull = {
                type: values.type,
                host: values.host,
                port: values.port,
                auth: values.auth
            };

            const obsClient = new OBSClient(obsClientSettings);
            obsClient.onError((_msg) => {
                setConnectionEnabled(true);
            });

            const isConnected = await obsClient.connect();
            obsClient.disconnect();
            if (isConnected) {
                // Scenes and sources belong to the old program, they do not exist in the new one
                const previousType = settings.get("obsClient")?.type;
                const isTypeChanged = !!previousType && previousType !== obsClientSettings.type;
                if (isTypeChanged) setObsSourceRules([]);

                setObsClient(obsClientSettings);
                settings.set({
                    obsClient: obsClientSettings,
                    ...(isTypeChanged ? { obsSourceRules: [] } : {}),
                });
                toast.success(i18n.t("obsSuccessfullyConnected"))
                setConnectionEnabled(true);
                return;
            }
        } catch (e) {
            if (config.debug) console.error(e);
        }
        toast.error(i18n.t("connectionFailed"));
        setObsClient(null);
        settings.set({ obsClient: null });
        setConnectionEnabled(true);
    }

    /**
     * Saves the source rules chosen in the OBS window.
     */
    function handleSaveSourceRules(rules: OBSSourceRule[], removed: number) {
        settings.sync("obsSourceRules", setObsSourceRules)(rules);
        setSourcesDialog(false);
        toast.success(removed > 0 ? i18n.t("sourcesSavedRemoved", { removed }) : i18n.t("sourcesSaved"));
    }

    /**
     * Applies the source rules as during censorship, waits and restores them.
     */
    async function handleTestSources() {
        if (!obsClient || obsSourceRules.length === 0 || isSourcesTestRunning) return;
        setSourcesTestRunning(true);
        const client = new OBSClient(obsClient);
        try {
            if (!(await client.connect())) throw new Error("Failed to connect to OBS");
            const scenes = await client.getScene();
            const itemsByScene = new Map<string, SceneItem[]>();
            const targets: { scene: Scene; item: SceneItem; action: OBSSourceAction }[] = [];
            for (const rule of obsSourceRules) {
                const scene = scenes.find((s) => s.name === rule.sceneName);
                if (!scene) continue;
                if (!itemsByScene.has(scene.id)) itemsByScene.set(scene.id, await client.getSceneItems(scene));
                const item = itemsByScene.get(scene.id)!.find((i) => i.name === rule.sourceName);
                if (item) targets.push({ scene, item, action: rule.action });
            }
            if (targets.length === 0) throw new Error("No sources found");

            const apply = (isCensored: boolean) => Promise.all(targets.map(({ scene, item, action }) =>
                client.setSceneItemEnabled(scene, item, action === OBSSourceAction.show ? isCensored : !isCensored)));

            if ((await apply(true)).includes(false)) throw new Error("Failed to toggle sources");
            toast(i18n.t("sourcesTestStarted"), { duration: 5000 });
            await delay(5000);
            if ((await apply(false)).includes(false)) throw new Error("Failed to restore sources");

            toast.success(targets.length < obsSourceRules.length
                ? i18n.t("sourcesTestPartiallyPassed", { found: targets.length, total: obsSourceRules.length })
                : i18n.t("sourcesTestPassed"));
        } catch (e) {
            if (config.debug) console.error(e);
            toast.error(i18n.t("sourcesTestFailed"));
        }
        client.disconnect();
        setSourcesTestRunning(false);
    }

    const delay = (m: number) => new Promise((resolve) => setTimeout(resolve, m));

    const guideLink = (text: string, image: string) => <a href={`/images/guide/${image}`} target="_blank" className="text-link">{text}</a>;

    return (
        <>
            <div className="space-y-8">
                <h1 className="text-h1">{i18n.t('obsManagement')}</h1>
                <Form {...formConnection}>
                    <form onSubmit={formConnection.handleSubmit(handleConnection)} className="space-y-4">
                        <div className="space-y-2">
                            <h4 className="text-xl font-bold">{i18n.t("connection")}</h4>
                            <p className="text-xs text-foreground font-medium">{i18n.t("descriptionObsConnectionManagement")}</p>
                            <p className="text-xs text-foreground font-medium">{i18n.t("obsConnectionInstructions")} {guideLink('Streamlabs', 'streamlabs.png')}, {guideLink('OBS Studio', 'obsstudio.png')}.</p>
                        </div>
                        <FormField
                            control={formConnection.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{i18n.t("obsType")}</FormLabel>
                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}>
                                        <FormControl>
                                            <SelectTrigger className="w-full order-3 sm:order-2 max-sm:col-span-2">
                                                <SelectValue placeholder={i18n.t("selectObsType")} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={OBSType.streamlabs}>Streamlabs</SelectItem>
                                            <SelectItem value={OBSType.obsstudio}>OBS Studio</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                        <div className="space-y-2">
                            <div className="grid grid-cols-[1fr_auto] items-start gap-4">
                                <FormField
                                    control={formConnection.control}
                                    name="host"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{i18n.t("host")}</FormLabel>
                                            <FormControl>
                                                <Input readOnly placeholder='127.0.0.1' {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={formConnection.control}
                                    name="port"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{i18n.t("port")}</FormLabel>
                                            <FormControl>
                                                <Input {...field} value={field.value || ''}
                                                    onChange={(e) => field.onChange(Number(e.target.value))} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                        <FormField
                            control={formConnection.control}
                            name="auth"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{i18n.t("passwordToken")}</FormLabel>
                                    <div className="relative">
                                        <FormControl>
                                            <Input {...field} type={isAuthVisible ? "text" : "password"} autoComplete="off" className="pr-10" />
                                        </FormControl>
                                        <Button type="button" size="icon" variant="ghost"
                                            className="absolute right-1 top-1/2 -translate-y-1/2 size-7 text-muted-foreground"
                                            title={isAuthVisible ? i18n.t("hidePassword") : i18n.t("showPassword")}
                                            onClick={() => setAuthVisible((visible) => !visible)}>
                                            {isAuthVisible ? <EyeOff /> : <Eye />}
                                        </Button>
                                    </div>
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={!isConnectionEnabled}>{i18n.t("connect")}</Button>
                        <hr />
                    </form>
                </Form>

                <div className="space-y-4">
                    <h4 className="text-xl font-bold">{i18n.t("sources")}</h4>
                    <SettingsCard
                        title={i18n.t("sourceControl")}
                        description={i18n.t("sourceControlDescription")}>
                        <></>
                    </SettingsCard>
                    {obsSourceRules.length > 0 ? (
                        <div className="rounded-lg border border-border divide-y divide-border">
                            {obsSourceRules.map((rule) => (
                                <div key={`${rule.sceneName}/${rule.sourceName}`} className="flex items-center gap-2 px-3 py-2 text-sm">
                                    <span className="text-muted-foreground truncate max-w-48 min-w-0" title={rule.sceneName}>{rule.sceneName}</span>
                                    <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                                    <span className="font-medium truncate flex-1 min-w-0" title={rule.sourceName}>{rule.sourceName}</span>
                                    <span className={cn("flex items-center gap-1 text-xs font-medium rounded px-2 py-0.5 shrink-0",
                                        rule.action === OBSSourceAction.hide ? "bg-red-500/15 text-red-400" : "bg-green-500/15 text-green-400")}>
                                        {rule.action === OBSSourceAction.hide ? <EyeOff size={12} /> : <Eye size={12} />}
                                        {rule.action === OBSSourceAction.hide ? i18n.t("hide") : i18n.t("sourceActionShow")}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">{i18n.t("noSourceRules")}</p>
                    )}
                    <div className="flex gap-2">
                        <Button onClick={() => setSourcesDialog(true)} disabled={!obsClient}>{i18n.t("configureSources")}</Button>
                        <Button variant="outline" onClick={handleTestSources}
                            disabled={!obsClient || obsSourceRules.length === 0 || isSourcesTestRunning}>{i18n.t("testSources")}</Button>
                    </div>
                </div>
            </div>
            {isSourcesDialog && obsClient && <OBSSourcesDialog
                obsClient={obsClient}
                rules={obsSourceRules}
                onSave={handleSaveSourceRules}
                onClose={() => setSourcesDialog(false)}
            />}
        </>
    );
}