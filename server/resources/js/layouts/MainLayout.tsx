import { Outlet, ScrollRestoration } from "react-router-dom";
import HeaderNavbar from "../components/HeaderNavbar";
import Footer from "@/components/Footer";
import BackgroundGradient from "@/components/BackgroundGradient";
import { Toaster } from 'react-hot-toast';

export default function MainLayout() {
    return (
        <>
            <ScrollRestoration />
            <div className="min-h-screen grid grid-rows-[auto_1fr_auto] w-full relative">
                <HeaderNavbar />
                <Outlet />
                <Footer />

                <BackgroundGradient />
            </div>
            <Toaster
                position="top-right"
                reverseOrder={true}
            />
        </>
    );
}

