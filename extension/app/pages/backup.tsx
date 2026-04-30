import { useState } from 'react';
import { Settings } from '@/types/settings'
import i18n from '@/lib/i18n';
import { Button } from '../components/ui/button';
import { HardDriveDownload, HardDriveUpload } from 'lucide-react';
import toast from "react-hot-toast";
import { SpinnerFullScreen } from '../components/ui/spinner';
import { getSettings, updateSettings } from '@/utils/settings';

export default function BackupPage() {
    const [isSpinner, setSpinner] = useState<boolean>(false);

    /**
     * Processes export of settings.
     */
    const handleExport = () => {
        if (!chrome?.storage?.sync) return;
        setSpinner(true);
        getSettings().then(curentSettings => {
            const {
                obsClient,
                obsCensorScene,
                ...settingsForExport
            } = curentSettings;

            const blob = new Blob([JSON.stringify(settingsForExport, null, 2)], { type: "application/json" });

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "movietimecode-settings.json";
            a.click();

            URL.revokeObjectURL(url);
            setSpinner(false);
        });
    };

    /**
     * Processes import settings
     */
    const handleImport = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";

        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                setSpinner(true);
                try {
                    const text = event.target?.result as string;
                    const imported = JSON.parse(text) as Partial<Settings>;

                    if (typeof imported !== "object" || imported === null) {
                        throw new Error("Invalid format");
                    }

                    // Delete keys that cannot be imported (security)
                    delete imported.obsClient;
                    delete imported.obsCensorScene;

                    // Storage updates
                    await updateSettings(imported);

                    toast.success(i18n.t("settingsImportedSuccessfully"));

                } catch (error) {
                    toast.error(i18n.t("settingsImportedError"));
                } finally {
                    setSpinner(false);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    return (
        <>
            <div className="space-y-4">
                <div className="space-y-4">
                    <h1 className="text-h1">{i18n.t('backup')}</h1>
                    <p className="text-sm text-foreground font-normal">{i18n.t("backupDescription")}</p>
                </div>
                <div className="flex items-center gap-4">
                    <Button onClick={handleExport}><HardDriveDownload strokeWidth={2.5} />{i18n.t("export")}</Button>
                    <Button onClick={handleImport}><HardDriveUpload strokeWidth={2.5} />{i18n.t("import")}</Button>
                </div>
            </div>
            {isSpinner && <SpinnerFullScreen />}
        </>
    );
}