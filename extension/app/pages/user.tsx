import { Button } from "@/app/components/ui/button";
import { login } from "@/utils/navigation";
import { useEffect, useRef, useState } from "react";
import { User } from "@/types/user";
import { getUser, logout } from "@/utils/user";
import config from "config";
import i18n from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function UserPage() {
    const [user, setUser] = useState<User | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    const handleLogIn = async () => {
        login();

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        let count: number = 0;
        intervalRef.current = setInterval(async () => {
            const user: User | undefined = await getUser();
            if (user) {
                setUser(user);
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
                return;
            }
            count++;
            if (count >= 50 && intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }, 5000);
    };

    const handleLogOut = async () => {
        await logout();
        setUser(null);
    };

    useEffect(() => {
        /**
         * Checks authorization and launches a method to retrieve data from the backend.
         */
        const init = async () => {
            try {
                const user: User | undefined = await getUser();
                if (!user) {
                    return;
                }
                setUser(user);
            } catch (e) {
                if (config.debug) {
                    console.error(e);
                }
            }
        };
        init();
    }, []);

    return (
        <div className={cn(user == null ? "space-y-4" : "space-y-8")}>
            <div className="space-y-4">
                <h1 className="text-h1">{i18n.t('user')}</h1>
                {user == null && <p className="text-sm text-foreground font-normal" dangerouslySetInnerHTML={{
                    __html: i18n.t("authorizationDescription", {
                        url: config.privacyPolicyUrl,
                        interpolation: {
                            escapeValue: false,
                        },
                    })
                }} />}
            </div>

            {user == null && <div><Button onClick={handleLogIn}><svg xmlns="http://www.w3.org/2000/svg" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 24 24" width="24" height="24"><g id="Layer_1-2"><path fill="currentColor" d="M6,0L1.714,4.286v15.429h5.143V24l4.286-4.286h3.429L22.286,12V0H6z M20.571,11.143l-3.429,3.429h-3.429l-3,3v-3H6.857     V1.714h13.714V11.143z" /><rect fill="currentColor" x="16.286" y="4.714" width="1.714" height="5.143" /><rect x="11.571" fill="currentColor" y="4.714" width="1.714" height="5.143" /></g></svg>{i18n.t("logInTwitch")}</Button></div>}

            {user != null && <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <img className="bg-primary/10 size-12 flex items-center justify-center rounded-full" src={user.picture ?? "/images/avatar.png"} />
                    <div className="text-xl text-foreground font-bold">{user.username}</div>
                </div>
                <Button variant="destructive" onClick={handleLogOut}>{i18n.t("logout")}</Button>
            </div>}
        </div>
    );
}