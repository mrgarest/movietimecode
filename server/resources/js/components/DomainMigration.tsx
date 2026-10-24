"use client";

import { useEffect, useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";

/**
 * This component checks if the user is visiting the old domain and displays a dialog informing them about the domain migration.
 * If the user is on the old domain, it prompts them to continue to the new domain.
 */
export default function DomainMigration() {
    const [open, setOpen] = useState<boolean>(false);

    useEffect(() => {
        if (window.location.hostname === "movietimecode.mrgarest.com") {
            setOpen(true);
        }
    }, []);

    /**
     * This function constructs a new URL using the current pathname, search parameters, and hash, and then redirects the user to the new domain.
     */
    const handleContinue = () => {
        const { pathname, search, hash } = window.location;
        window.location.href = new URL(pathname + search + hash, "https://movietimecode.garest.net").toString();
    };

    return (
        <AlertDialog open={open}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>⚠️ Сайт переїхав</AlertDialogTitle>
                    <AlertDialogDescription>
                        <p>Сайт Movie Timecode тепер працює за новою адресою movietimecode.garest.net.</p>
                        <p>Якщо ви користуєтеся браузерним розширенням Movie Timecode, вам також слід оновити його до версії 4.2.0 або новішої.</p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={handleContinue}>Перейти на нову адресу</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}