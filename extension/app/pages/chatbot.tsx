import React, { useEffect, useState } from 'react';
import SettingsCard from '@/app/components/settings-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"
import i18n from '@/lib/i18n';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Form, FormControl, FormField, FormItem } from '../components/ui/form';
import { z } from "zod"
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { Input } from '../components/ui/input';
import { ChatbotAccess, ChatbotAction } from '@/enums/chatbot';
import { CirclePlus, Trash2 } from 'lucide-react';
import toast from "react-hot-toast";
import { useSyncSetting } from '@/hooks/useSyncSetting';
import { getSettings, SettingsDefault, updateSetting } from '@/utils/settings';

/**
 * Form validation scheme
 */
const formSchema = z.object({
    commands: z.array(
        z.object({
            enabled: z.boolean(),
            command: z.string().min(2).max(40),
            action: z.string().min(1, {
                message: i18n.t("selectAction")
            }),
            access: z.string().min(1, {
                message: i18n.t("selectAccess")
            }),
        })
    ),
})

export default function ChatbotPage() {
    const [chatbotEnabled, setChatbotEnabled] = useState<boolean>(SettingsDefault.chatbotEnabled);
    const { sync } = useSyncSetting();

    // Form initialization
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            commands: []
        },
    });

    const { fields: commandsFields, append: appendCommand, remove: removeCommand } = useFieldArray({
        control: form.control,
        name: "commands",
    });

    useEffect(() => {
        getSettings().then(settings => {
            setChatbotEnabled(settings.chatbotEnabled);
            form.reset({ commands: settings.chatbotCommands })
        });
    }, []);

    /**
    * Saves commands
    */
    const onSubmit = async (values: z.infer<typeof formSchema>) => {
       updateSetting('chatbotCommands', values.commands);
        toast.success(i18n.t("changesSaved"));
    };

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <h1 className="text-h1">{i18n.t('chatbot')}</h1>
                <div className="space-y-1">
                    <p className="text-sm text-foreground font-normal">{i18n.t("chatbotDescription")}</p>
                    <p className="text-sm text-foreground font-normal">{i18n.t("twitchAuthWarning")}</p>
                </div>
            </div>
            <div className="space-y-4">
                <SettingsCard
                    title={i18n.t("enableChatbot")}
                    description={i18n.t("enableChatbotDescription")}>
                    <Switch
                        checked={chatbotEnabled}
                        onCheckedChange={sync("chatbotEnabled", setChatbotEnabled)}
                    />
                </SettingsCard>
                <hr />
            </div>
            <div className="space-y-4">
                <h4 className="text-xl font-bold">{i18n.t("chatCommands")}</h4>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 items-center">
                            {commandsFields.map((field, index) => (
                                <React.Fragment key={field.id}>
                                    <FormField
                                        control={form.control}
                                        name={`commands.${index}.enabled`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Switch
                                                        name={field.name}
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`commands.${index}.command`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl
                                                    className="w-full min-w-26">
                                                    <Input
                                                        placeholder="!command or command"
                                                        value={field.value}
                                                        disabled={field.disabled}
                                                        onChange={(e) => {
                                                            let value = e.target.value.toLocaleLowerCase();

                                                            value = value.replace(/[ыъёэ;%:~#$^*()\-_+\/\\<>{}|@"№`']/g, '');

                                                            if (value.startsWith('!')) {
                                                                value = value.replace(/\s+/g, '');
                                                            }

                                                            field.onChange(value);
                                                        }}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`commands.${index}.action`}
                                        render={({ field }) => (
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full max-w-42">
                                                        <SelectValue placeholder={i18n.t("selectAction")} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value={ChatbotAction.movieTitle}>{i18n.t("chatbotAction.movieTitle")}</SelectItem>
                                                    <SelectItem value={ChatbotAction.currentMovieTime}>{i18n.t("chatbotAction.currentMovieTime")}</SelectItem>
                                                    <SelectItem value={ChatbotAction.blur}>{i18n.t("blur")}</SelectItem>
                                                    <SelectItem value={ChatbotAction.unblur}>{i18n.t("unblur")}</SelectItem>
                                                    <SelectItem value={ChatbotAction.showPlayer}>{i18n.t("showPlayer")}</SelectItem>
                                                    <SelectItem value={ChatbotAction.hidePlayer}>{i18n.t("hidePlayer")}</SelectItem>
                                                    <SelectItem value={ChatbotAction.mute}>{i18n.t("mute")}</SelectItem>
                                                    <SelectItem value={ChatbotAction.unmute}>{i18n.t("unmute")}</SelectItem>
                                                    <SelectItem value={ChatbotAction.pause}>{i18n.t("pause")}</SelectItem>
                                                    <SelectItem value={ChatbotAction.play}>{i18n.t("play")}</SelectItem>
                                                    <SelectItem value={ChatbotAction.fastForwardRewind}>{i18n.t("chatbotAction.fastForwardRewind")}</SelectItem>
                                                    <SelectItem value={ChatbotAction.stop}>{i18n.t("chatbotAction.stop")}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`commands.${index}.access`}
                                        render={({ field }) => (
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full max-w-36">
                                                        <SelectValue placeholder={i18n.t("selectAccess")} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value={ChatbotAccess.users}>{i18n.t("chatbotAccess.users")}</SelectItem>
                                                    <SelectItem value={ChatbotAccess.vip}>VIP</SelectItem>
                                                    <SelectItem value={ChatbotAccess.moderators}>{i18n.t("chatbotAccess.moderators")}</SelectItem>
                                                    <SelectItem value={ChatbotAccess.onlyMe}>{i18n.t("chatbotAccess.onlyMe")}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    <div><Trash2
                                        size={36}
                                        strokeWidth={1.5}
                                        onClick={() => removeCommand(index)}
                                        className="-ml-2 p-2 hover:bg-red-500/15 rounded-lg duration-300 cursor-pointer text-red-500" /></div>

                                </React.Fragment>))}</div>

                        <div className="flex items-center gap-4">
                            <Button
                                type="submit">{i18n.t("save")}</Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => appendCommand({
                                    enabled: false,
                                    command: '',
                                    action: '',
                                    access: '',
                                })}>
                                <CirclePlus strokeWidth={2} />{i18n.t("addCommand")}</Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
}