import { useState } from 'react';
import { Settings } from '@/types/settings'
import i18n from '@/lib/i18n';
import { Button } from '../components/ui/button';
import { HardDriveDownload, HardDriveUpload } from 'lucide-react';
import toast from "react-hot-toast";
import { SpinnerFullScreen } from '../components/ui/spinner';
import { settings } from '@/utils/settings';

// ПFields we do not export/import
type ExcludedKeys = "installedAt" | "user" | "deviceToken" | "obsClient" | "obsCensorScene";
type ExportableSettings = Omit<Settings, ExcludedKeys>;

export default function BackupPage() {
    const [isSpinner, setSpinner] = useState<boolean>(false);

    /**
     * Processes export of settings.
     */
    const handleExport = async () => {
        setSpinner(true);
        try {
            const { user, deviceToken, obsClient, obsCensorScene, ...settingsForExport } = await settings.getAll();

            const blob = new Blob([JSON.stringify(settingsForExport, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `movietimecode-settings-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } finally {
            setSpinner(false);
        }
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
                    const imported = JSON.parse(text) as Partial<ExportableSettings>;

                    if (typeof imported !== "object" || imported === null) {
                        throw new Error("Invalid format");
                    }

                    await settings.set(imported);
                    toast.success(i18n.t("settingsImportedSuccessfully"));
                } catch {
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