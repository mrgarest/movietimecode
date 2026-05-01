import { useEffect, useMemo, useState } from 'react';
import SettingsCard from '@/app/components/settings-card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"
import { BlurPower, TimecodeAction } from '@/enums/timecode';
import { Input } from '@/app/components/ui/input';
import i18n from '@/lib/i18n';
import { DEFAULT_SETTINGS, settings } from '@/utils/settings';

export default function SettingsPage() {
    const [timeBuffer, setTimeBuffer] = useState<number>(DEFAULT_SETTINGS.timeBuffer);
    const [blurPower, setBlurPower] = useState<BlurPower>(DEFAULT_SETTINGS.blurPower);
    const [nudity, setNudity] = useState<TimecodeAction>(DEFAULT_SETTINGS.nudity);
    const [sexualContentWithoutNudity, setSexualContentWithoutNudity] = useState<TimecodeAction>(DEFAULT_SETTINGS.sexualContentWithoutNudity);
    const [eroticSounds, setEroticSounds] = useState<TimecodeAction>(DEFAULT_SETTINGS.eroticSounds);
    const [violence, setViolence] = useState<TimecodeAction>(DEFAULT_SETTINGS.violence);
    const [sensitiveExpressions, setSensitiveExpressions] = useState<TimecodeAction>(DEFAULT_SETTINGS.sensitiveExpressions);
    const [useDrugsAlcoholTobacco, setUseDrugsAlcoholTobacco] = useState<TimecodeAction>(DEFAULT_SETTINGS.useDrugsAlcoholTobacco);
    const [prohibitedSymbols, setProhibitedSymbols] = useState<TimecodeAction>(DEFAULT_SETTINGS.prohibitedSymbols);
    const [obsDisabled, setObsDisabled] = useState<boolean>(true);

    useEffect(() => {
        setTimeBuffer(settings.get("timeBuffer"));
        setBlurPower(settings.get("blurPower"));
        setNudity(settings.get("nudity"));
        setEroticSounds(settings.get("eroticSounds"));
        setViolence(settings.get("violence"));
        setSensitiveExpressions(settings.get("sensitiveExpressions"));
        setSexualContentWithoutNudity(settings.get("sexualContentWithoutNudity"));
        setUseDrugsAlcoholTobacco(settings.get("useDrugsAlcoholTobacco"));
        setProhibitedSymbols(settings.get("prohibitedSymbols"));
        setObsDisabled(settings.get("obsClient") === null || settings.get("obsCensorScene") === null);
    }, []);

    const selectItemBehavior = useMemo(() => {
        return [
            { disabled: false, value: TimecodeAction.noAction, text: i18n.t("inaction") },
            { disabled: false, value: TimecodeAction.blur, text: i18n.t("blur") },
            { disabled: false, value: TimecodeAction.hide, text: i18n.t("hide") },
            { disabled: false, value: TimecodeAction.skip, text: i18n.t("skip") },
            { disabled: false, value: TimecodeAction.pause, text: i18n.t("pause") },
            { disabled: false, value: TimecodeAction.mute, text: i18n.t("mute") },
            {
                disabled: obsDisabled,
                value: TimecodeAction.obsSceneChange,
                text: i18n.t("obsSceneSwitching"),
            },
        ];
    }, [obsDisabled]);

    const handleTimeBuffer = (event: React.ChangeEvent<HTMLInputElement>) => {
        let value = parseInt(event.target.value);

        if (isNaN(value)) value = 0;

        value = Math.max(0, Math.min(59, value));

        setTimeBuffer(value);
        settings.set({ timeBuffer: value });
    };

    return (
        <div className="space-y-8">
            <h1 className="text-h1">{i18n.t('settings')}</h1>
            <div className="space-y-4">
                <SettingsCard
                    title={i18n.t("blurStrength")}
                    description={i18n.t("blurStrengthDescription")}>
                    <Select
                        onValueChange={settings.sync("blurPower", setBlurPower)}
                        defaultValue={blurPower}
                        value={blurPower}>
                        <SelectTrigger className="w-36">
                            <SelectValue placeholder={i18n.t("selectBlurStrength")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value={BlurPower.light}>{i18n.t("blurStrengthOptions.light")}</SelectItem>
                                <SelectItem value={BlurPower.base}>{i18n.t("blurStrengthOptions.standard")}</SelectItem>
                                <SelectItem value={BlurPower.strong}>{i18n.t("blurStrengthOptions.strong")}</SelectItem>
                                <SelectItem value={BlurPower.max}>{i18n.t("blurStrengthOptions.maximum")}</SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </SettingsCard>
                <hr />
                <SettingsCard
                    title={i18n.t("timeBuffer")}
                    description={i18n.t("timeBufferDescription")}>
                    <Input type="number" min={0} max={59} value={timeBuffer} onChange={handleTimeBuffer} />
                </SettingsCard>
                <hr />
            </div>
            <div className="space-y-4">
                <h4 className="text-xl font-bold">{i18n.t("behavior")}</h4>
                <SettingsCard
                    title={i18n.t("nudity")}
                    description={i18n.t("nudityDescription")}>
                    <Select
                        onValueChange={(value) => settings.sync("nudity", setNudity)(Number(value) as TimecodeAction)}
                        defaultValue={nudity.toString()}
                        value={nudity.toString()}>
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
                <hr />
                <SettingsCard
                    title={i18n.t("sexualContentWithoutNudity")}
                    description={i18n.t("sexualContentWithoutNudityDescription")}>
                    <Select
                        onValueChange={(value) => settings.sync("sexualContentWithoutNudity", setSexualContentWithoutNudity)(Number(value) as TimecodeAction)}
                        defaultValue={sexualContentWithoutNudity.toString()}
                        value={sexualContentWithoutNudity.toString()}>
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
                <hr />
                <SettingsCard
                    title={i18n.t("eroticSounds")}
                    description={i18n.t("eroticSoundsDescription")}>
                    <Select
                        onValueChange={(value) => settings.sync("eroticSounds", setEroticSounds)(Number(value) as TimecodeAction)}
                        defaultValue={eroticSounds.toString()}
                        value={eroticSounds.toString()}>
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
                <hr />
                <SettingsCard
                    title={i18n.t("violence")}
                    description={i18n.t("violenceDescription")}>
                    <Select
                        onValueChange={(value) => settings.sync("violence", setViolence)(Number(value) as TimecodeAction)}
                        defaultValue={violence.toString()}
                        value={violence.toString()}>
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
                <hr />
                <SettingsCard
                    title={i18n.t("sensitiveExpressions")}
                    description={i18n.t("sensitiveExpressionsDescription")}>
                    <Select
                        onValueChange={(value) => settings.sync("sensitiveExpressions", setSensitiveExpressions)(Number(value) as TimecodeAction)}
                        defaultValue={sensitiveExpressions.toString()}
                        value={sensitiveExpressions.toString()}>
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
                <hr />
                <SettingsCard
                    title={i18n.t("useDrugsAlcoholTobacco")}
                    description={i18n.t("useDrugsAlcoholTobaccoDescription")}>
                    <Select
                        onValueChange={(value) => settings.sync("useDrugsAlcoholTobacco", setUseDrugsAlcoholTobacco)(Number(value) as TimecodeAction)}
                        defaultValue={useDrugsAlcoholTobacco.toString()}
                        value={useDrugsAlcoholTobacco.toString()}>
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
                <hr />
                <SettingsCard
                    title={i18n.t("prohibitedSymbols")}
                    description={i18n.t("prohibitedSymbolsDescription")}>
                    <Select
                        onValueChange={(value) => settings.sync("prohibitedSymbols", setProhibitedSymbols)(Number(value) as TimecodeAction)}
                        defaultValue={prohibitedSymbols.toString()}
                        value={prohibitedSymbols.toString()}>
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