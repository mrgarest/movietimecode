import { useEffect, useMemo, useState } from 'react';
import SettingsCard from '@/app/components/settings-card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"
import { TimecodeAction } from '@/enums/timecode';
import i18n from '@/lib/i18n';
import { Button } from '../components/ui/button';
import { DEFAULT_SETTINGS, settings } from '@/utils/settings';

const altKey: string = /Macintosh|MacIntel|MacPPC|Mac68K/i.test(navigator.userAgent) ? "⌥" : "Alt";


export default function HotkeysPage() {
    const [obsDisabled, setObsDisabled] = useState<boolean>(true);
    const [playerContentCensorshipCommand, setPlayerContentCensorshipCommand] = useState<TimecodeAction>(DEFAULT_SETTINGS.playerContentCensorshipCommand);
    const [playerContentCensorshipHotkey, setPlayerContentCensorshipHotkey] = useState<string>(`${altKey}+X`);

    useEffect(() => {
        setPlayerContentCensorshipCommand(settings.get("playerContentCensorshipCommand"));
        setObsDisabled(settings.get("obsClient") === null || settings.get("obsCensorScene") === null);
        if (chrome.commands) {
            chrome.commands.getAll((commands) => commands.forEach((command) => {
                switch (command.name) {
                    case "censoring-player-content":
                        setPlayerContentCensorshipHotkey(command.shortcut || `${altKey}+X`);
                        break;
                    default:
                        break;
                }
            }));
        }
    }, []);

    const selectItemBehavior = useMemo(() => {
        return [
            { disabled: false, value: TimecodeAction.noAction, text: i18n.t("inaction") },
            { disabled: false, value: TimecodeAction.blur, text: i18n.t("blur") },
            { disabled: false, value: TimecodeAction.hide, text: i18n.t("hide") },
            {
                disabled: obsDisabled,
                value: TimecodeAction.obsSceneChange,
                text: i18n.t("obsSceneSwitching"),
            },
        ];
    }, [obsDisabled]);

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <h1 className="text-h1">{i18n.t('hotkeys')}</h1>
                <div className="space-y-4 flex items-center justify-between gap-4">
                    <div className="text-sm text-foreground font-normal">{i18n.t("hotkeyAssignmentDescription")}</div>
                    <Button size="sm"
                        onClick={() => chrome.tabs.create({ url: "chrome://extensions/shortcuts" })}>{i18n.t("settings")}</Button>
                </div>
            </div>
            <div className="space-y-4">
                <SettingsCard
                    hotkey={playerContentCensorshipHotkey}
                    title={i18n.t("censoringPlayerContent")}
                    description={i18n.t("censoringPlayerContentDescription")}>
                    <Select
                        onValueChange={(value) => settings.sync("playerContentCensorshipCommand", setPlayerContentCensorshipCommand)(Number(value) as TimecodeAction)}
                        defaultValue={playerContentCensorshipCommand.toString()}
                        value={playerContentCensorshipCommand.toString()}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder={i18n.t("selectBehavior")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {selectItemBehavior.map((item, index) => <SelectItem key={index} disabled={item.disabled} value={item.value.toString()}>{item.text}</SelectItem>)}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </SettingsCard>
            </div>
        </div>
    );
}