import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"
import { SettingsOBSClientNull } from '@/interfaces/settings'
import { Input } from '@/app/components/ui/input';
import config from 'config';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import OBSClient, { OBSType, Scene } from "@/lib/obs-client"
import { Button } from "@/app/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
} from "@/app/components/ui/form"
import toast from 'react-hot-toast';
import SettingsCard from '@/app/components/settings-card';
import { cn } from '@/lib/utils';
import i18n from '@/lib/i18n';
import { ScrollArea } from '../components/ui/scroll-area';
import { useSyncSetting } from '@/hooks/useSyncSetting';
import { getSettings, updateSetting } from '@/utils/settings';

const formSchemaConnection = z.object({
    host: z.string().ip(),
    port: z.number().min(1),
    auth: z.string().min(1),
    type: z.string().min(1),
});

export default function OBSControlPage() {
    const [obsClient, setObsClient] = useState<SettingsOBSClientNull>(null);
    const [isConnectionEnabled, setConnectionEnabled] = useState<boolean>(true);
    const [isSceneEnabled, setSceneEnabled] = useState<boolean>(false);
    const [isTestEnabled, setTestEnabled] = useState<boolean>(false);
    const [obsCensorSceneName, setObsCensorSceneName] = useState<string | null>(null);
    const [isChangeSceneDialog, setChangeSceneDialog] = useState<boolean>(false);
    const [obsScene, setObsScene] = useState<Scene[]>([]);
    const [getTestLogs, setTestLog] = useState<{
        ok: boolean,
        msg: string
    }[]>([]);

    const formConnection = useForm<z.infer<typeof formSchemaConnection>>({
        resolver: zodResolver(formSchemaConnection),
        defaultValues: {
            host: '127.0.0.1',
            port: 0,
            auth: '',
            type: ''
        },
    });

    useEffect(() => {
        getSettings().then(settings => {
            if (settings.obsClient) {
                formConnection.setValue('host', settings.obsClient.host);
                formConnection.setValue('port', settings.obsClient.port);
                formConnection.setValue('auth', settings.obsClient.auth);
                formConnection.setValue('type', settings.obsClient.type);
                setTestEnabled(true);
                setSceneEnabled(true);
                setObsClient(settings.obsClient);
            } else setObsClient(null);

            setObsCensorSceneName(settings.obsCensorScene);
        });
    }, []);

    const setEnabledButtons = (enabled: boolean) => {
        setSceneEnabled(enabled);
        setTestEnabled(enabled);
        setConnectionEnabled(enabled);
    };

    /**
     * Handles the connection form to OBS and checks the connection.
     * @param values 
     * @returns 
     */
    const handleConnection = async (values: z.infer<typeof formSchemaConnection>) => {
        if (!isConnectionEnabled) return;
        try {
            setEnabledButtons(false);
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
                setObsClient(obsClientSettings);
                updateSetting('obsClient', obsClientSettings);
                toast.success(i18n.t("obsSuccessfullyConnected"))
                setEnabledButtons(true);
                return;
            }
        } catch (e) {

        }
        toast.error(i18n.t("connectionFailed"));
        setObsClient(null); 
        updateSetting('obsClient', null);
        setConnectionEnabled(true);
    }

    /**
     * Gets a list of scenes if possible and opens a dialog for scene selection.
     */
    async function heandleChangeScene() {
        if (!obsClient) {
            toast.error(i18n.t("connectionFailed"));
            return;
        }

        try {
            const client = new OBSClient(obsClient);
            const isConnected = await client.connect();
            if (!isConnected) {
                toast.error(i18n.t("connectionFailed"));
                client.disconnect();
                return;
            }
            const scenes = await client.getScene();
            if (!scenes || scenes.length == 0) {
                toast.error(i18n.t("failedGetScenes"));
                client.disconnect();
                return;
            }
            client.disconnect();
            setObsScene(scenes);
            setChangeSceneDialog(true);
        } catch (e) {
            if (config.debug) { console.error(e); }
            toast.error(i18n.t("unknownError"));
            setEnabledButtons(true);
        }
    };

    /**
     * Choosing a scene for censorship.
     * @param name 
     */
    function heandleSelectScene(name: string) {
        updateSetting('obsCensorScene', name);
        setObsCensorSceneName(name);
        setChangeSceneDialog(false);
        setObsScene([]);
        toast.success(i18n.t("newSceneSuccessfullyConnected"));
    };

    const delay = (m: number) => new Promise((resolve) => setTimeout(resolve, m));

    const handleTest = async () => {
        if (!isTestEnabled) return;
        if (!obsClient) {
            toast.error(i18n.t("connectionFailed"));
            return;
        }
        setEnabledButtons(false);
        setTestLog([]);

        try {
            const client = new OBSClient(obsClient);
            client.onError((_msg) => {
                setEnabledButtons(true);
            })

            const isConnected = await client.connect();
            if (isConnected) {
                setTestLog((prevLogs) => [...prevLogs, { ok: true, msg: i18n.t("obsSuccessfullyConnected") }]);
                const scenes = await client.getScene();
                if (!scenes) {
                    setTestLog((prevLogs) => [...prevLogs, { ok: false, msg: i18n.t("failedGetScenes") }]);
                    client.disconnect();
                    setEnabledButtons(true);
                    return;
                }

                const obsCensorScene = obsCensorSceneName;
                const censorScene = await client.findScene(obsCensorScene!, scenes);
                if (!censorScene) {
                    setTestLog((prevLogs) => [...prevLogs, { ok: false, msg: i18n.t("unableFindScene", { scene: obsCensorScene }) }]);
                    client.disconnect();
                    setEnabledButtons(true);
                    return;
                }
                setTestLog((prevLogs) => [...prevLogs, { ok: true, msg: i18n.t("sceneFound", { scene: obsCensorScene }) }]);

                const activeScene = await client.getActiveScene();
                if (!activeScene) {
                    setTestLog((prevLogs) => [...prevLogs, { ok: false, msg: i18n.t("unableFindActiveScene") }]);
                    client.disconnect();
                    setEnabledButtons(true);
                    return;
                }
                if (activeScene.id == censorScene.id) {
                    setTestLog((prevLogs) => [...prevLogs, { ok: false, msg: i18n.t("selectOtherSceneAndRepeatTest") }]);
                    client.disconnect();
                    setEnabledButtons(true);
                    return;
                }
                setTestLog((prevLogs) => [...prevLogs, { ok: true, msg: i18n.t("sceneFound", { scene: activeScene.name }) }]);

                const s = 10000;

                setTestLog((prevLogs) => [...prevLogs, { ok: true, msg: i18n.t("pause") + " ..." }]);
                await delay(s);
                let isSetScene = await client.setActiveScene(censorScene);

                if (!isSetScene) {
                    setTestLog((prevLogs) => [...prevLogs, { ok: false, msg: i18n.t("unableDisplayScene", { scene: obsCensorScene }) }]);
                    client.disconnect();
                    setEnabledButtons(true);
                    return;
                }
                setTestLog((prevLogs) => [...prevLogs, { ok: true, msg: i18n.t("sceneActivated", { scene: obsCensorScene }) }]);

                setTestLog((prevLogs) => [...prevLogs, { ok: true, msg: i18n.t("pause") + " ..." }]);
                await delay(s);
                isSetScene = await client.setActiveScene(activeScene);

                if (!isSetScene) {
                    setTestLog((prevLogs) => [...prevLogs, { ok: false, msg: i18n.t("unableDisplayScene", { scene: activeScene.name }) }]);
                    client.disconnect();
                    setEnabledButtons(true);
                    return;
                }
                setTestLog((prevLogs) => [...prevLogs, { ok: true, msg: i18n.t("sceneActivated", { scene: activeScene.name }) }]);

                client.disconnect();

                setTestLog((prevLogs) => [...prevLogs, { ok: true, msg: i18n.t("testSuccessfullyPassed") }]);
            } else {
                client.disconnect();
                setTestLog((prevLogs) => [...prevLogs, { ok: false, msg: i18n.t("connectionFailed") }]);
            }
        } catch (e) {
            if (config.debug) { console.error(e); }
            setTestLog((prevLogs) => [...prevLogs, { ok: false, msg: i18n.t("unknownError") }]);
        }
        setEnabledButtons(true);
    }


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
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={!isConnectionEnabled}>{i18n.t("connect")}</Button>
                        <hr />
                    </form>
                </Form>

                <div className="space-y-4">
                    <h4 className="text-xl font-bold">{i18n.t("scene")}</h4>
                    <SettingsCard
                        title={i18n.t("censorshipScene")}
                        description={i18n.t("selectSceneName")}>
                        {obsCensorSceneName ? <div className="space-y-2">
                            <div className="text-xs text-muted-foreground font-medium">{i18n.t("selectedScene")}</div>
                            <Input readOnly value={obsCensorSceneName || "N/A"} />
                        </div> : <></>}
                    </SettingsCard>
                    <Button onClick={heandleChangeScene} disabled={!isSceneEnabled}>{i18n.t("changeScene")}</Button>
                    <hr />
                </div>
                <div className="space-y-4">
                    <h4 className="text-xl font-bold">{i18n.t("testing")}</h4>
                    <div className="space-y-2 font-medium">
                        <div className="text-base">{i18n.t("instructionsTestingSceneSwitching")}</div>
                        <ol className="list-decimal text-sm pl-4 space-y-1">
                            <li>{i18n.t("instructionsTestingSceneSwitchingDescription.0")}</li>
                            <li>{i18n.t("instructionsTestingSceneSwitchingDescription.1")}</li>
                            <li>{i18n.t("instructionsTestingSceneSwitchingDescription.2")}</li>
                            <li>{i18n.t("instructionsTestingSceneSwitchingDescription.3")}</li>
                        </ol>
                    </div>
                    <Button onClick={handleTest} disabled={!isTestEnabled || obsCensorSceneName == null}>{i18n.t("runTest")}</Button>
                    {getTestLogs.length > 0 && (
                        <div className="bg-secondary text-xs font-semibold flex flex-col gap-0.5 p-2 rounded-md border">
                            {getTestLogs.map((log, index) => (
                                <code key={index} className={cn(log.ok ? "text-green-500" : "text-red-500")}>{log.msg}</code>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {isChangeSceneDialog && <div className="bg-background/40 backdrop-blur-xs fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center">
                <div className="w-xs  bg-background border border-border/50 rounded-xl py-4 space-y-4">
                    <h1 className="text-lg font-bold px-5">{i18n.t("selectScene")}</h1>
                    <ScrollArea className="w-full h-28">
                        <div className="flex flex-col gap-2 px-5 max-w-xs">{obsScene.map((item, index) => <div
                            key={index}
                            onClick={() => heandleSelectScene(item.name)}
                            className="text-sm font-medium border border-input/60 bg-secondary text-foreground rounded-lg px-2.5 py-1 duration-300 cursor-pointer hover:bg-foreground/25 truncate ">{item.name}</div>)}</div>
                    </ScrollArea>
                    <div className="text-right px-5 ">
                        <Button size="sm" onClick={() => setChangeSceneDialog(false)}>{i18n.t("close")}</Button>
                    </div>
                </div>
            </div>}
        </>
    );
}