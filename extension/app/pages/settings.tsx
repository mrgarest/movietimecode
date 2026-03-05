import { useEffect, useMemo, useState } from 'react';
import SettingsCard from '@/app/components/settings-card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"
import { BlurPower, TimecodeAction } from '@/enums/timecode';
import { Input } from '@/app/components/ui/input';
import i18n from '@/lib/i18n';
import { useSyncSetting } from '@/hooks/useSyncSetting';
import { getSettings, SettingsDefault, updateSetting } from '@/utils/settings';

export default function SettingsPage() {
    const [timeBuffer, setTimeBuffer] = useState<number>(SettingsDefault.timeBuffer);
    const [blurPower, setBlurPower] = useState<BlurPower>(SettingsDefault.blurPower);
    const [nudity, setNudity] = useState<TimecodeAction>(SettingsDefault.nudity);
    const [sexualContentWithoutNudity, setSexualContentWithoutNudity] = useState<TimecodeAction>(SettingsDefault.sexualContentWithoutNudity);
    const [violence, setViolence] = useState<TimecodeAction>(SettingsDefault.violence);
    const [sensitiveExpressions, setSensitiveExpressions] = useState<TimecodeAction>(SettingsDefault.sensitiveExpressions);
    const [useDrugsAlcoholTobacco, setUseDrugsAlcoholTobacco] = useState<TimecodeAction>(SettingsDefault.useDrugsAlcoholTobacco);
    const [prohibitedSymbols, setProhibitedSymbols] = useState<TimecodeAction>(SettingsDefault.prohibitedSymbols);
    const [obsDisabled, setObsDisabled] = useState<boolean>(true);
    const { sync } = useSyncSetting();

    useEffect(() => {
        getSettings().then(settings => {
            setTimeBuffer(settings.timeBuffer);
            setBlurPower(settings.blurPower);
            setNudity(settings.nudity);
            setViolence(settings.violence);
            setSensitiveExpressions(settings.sensitiveExpressions);
            setSexualContentWithoutNudity(settings.sexualContentWithoutNudity);
            setUseDrugsAlcoholTobacco(settings.useDrugsAlcoholTobacco);
            setProhibitedSymbols(settings.prohibitedSymbols);
            setObsDisabled(settings.obsClient === null || settings.obsCensorScene === null);
        });
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
    updateSetting('timeBuffer', value);
};

    return (
        <div className="space-y-8">
            <h1 className="text-h1">{i18n.t('settings')}</h1>
            <div className="space-y-4">
                <SettingsCard
                    title={i18n.t("blurStrength")}
                    description={i18n.t("blurStrengthDescription")}>
                    <Select
                        onValueChange={sync("blurPower", setBlurPower)}
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
                        onValueChange={sync("nudity", setNudity)}
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
                        onValueChange={sync("sexualContentWithoutNudity", setSexualContentWithoutNudity)}
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
                    title={i18n.t("violence")}
                    description={i18n.t("violenceDescription")}>
                    <Select
                        onValueChange={sync("violence", setViolence)}
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
                        onValueChange={sync("sensitiveExpressions", setSensitiveExpressions)}
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
                        onValueChange={sync("useDrugsAlcoholTobacco", setUseDrugsAlcoholTobacco)}
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
                        onValueChange={sync("prohibitedSymbols", setProhibitedSymbols)}
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