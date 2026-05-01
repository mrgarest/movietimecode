import { useEffect, useState } from 'react';
import SettingsCard from '@/app/components/settings-card';
import i18n from '@/lib/i18n';
import { Switch } from '../components/ui/switch';
import { DEFAULT_SETTINGS, settings } from '@/utils/settings';

export default function TwitchPage() {
    const [checkStreamLive, setCheckStreamLive] = useState<boolean>(DEFAULT_SETTINGS.checkStreamLive);
    const [editTwitchContentClassification, setEditTwitchContentClassification] = useState<boolean>(DEFAULT_SETTINGS.editTwitchContentClassification);

    useEffect(() => {
        setCheckStreamLive(settings.get("checkStreamLive"));
        setEditTwitchContentClassification(settings.get("editTwitchContentClassification"));
    }, []);

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <h1 className="text-h1">Twitch</h1>
                <div className="space-y-1">
                    <p className="text-sm text-foreground font-normal">{i18n.t("twitchDescription")}</p>
                    <p className="text-sm text-foreground font-normal">{i18n.t("twitchAuthWarning")}</p>
                </div>
            </div>
            <div className="space-y-4">
                <SettingsCard
                    title={i18n.t("checkStreamLive")}
                    description={i18n.t("checkStreamLiveDescription")}>
                    <Switch
                        checked={checkStreamLive}
                        onCheckedChange={settings.sync("checkStreamLive", setCheckStreamLive)}
                    />
                </SettingsCard>
                <hr />
                <SettingsCard
                    title={i18n.t("editTwitchContentClassification")}
                    description={i18n.t("editTwitchContentClassificationDescription")}>
                    <Switch
                        checked={editTwitchContentClassification}
                        onCheckedChange={settings.sync("editTwitchContentClassification", setEditTwitchContentClassification)}
                    />
                </SettingsCard>
            </div>
        </div>
    );
}