import { Routes, Route, Navigate } from "react-router-dom";
import SettingsPage from "./pages/settings";
import OBSControlPage from "./pages/obs-control";
import { SideNavLayout } from "@/app/components/layout";
import NotFoundPage from "./pages/not-found";
import TimecodePage from "./pages/timecode";
import UserPage from "./pages/user";
import HotkeysPage from "./pages/hotkeys";
import ChatbotPage from "./pages/chatbot";
import BackupPage from "./pages/backup";
import TwitchPage from "./pages/twitch";

export default function App() {
    return (
        <Routes>
            <Route path="/settings" element={<SideNavLayout />}>
                <Route index element={<SettingsPage />} />
                <Route path="obs-control" element={<OBSControlPage />} />
                <Route path="twitch" element={<TwitchPage />} />
                <Route path="chatbot" element={<ChatbotPage />} />
                <Route path="hotkeys" element={<HotkeysPage />} />
            </Route>
            <Route path="/" element={<SideNavLayout />}>
                <Route path="user" element={<UserPage />} />
                <Route path="backup" element={<BackupPage />} />
            </Route>
            <Route index element={<Navigate to="/settings" replace />} />
            <Route path="timecode" element={<TimecodePage />} />
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}