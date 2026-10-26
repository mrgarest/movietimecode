import { PropsWithChildren } from "react";
import HeaderNavbar from "../components/HeaderNavbar";
import Footer from "@/components/Footer";
import BackgroundGradient from "@/components/BackgroundGradient";
import { Toaster } from 'react-hot-toast';

export default function MainLayout({ children }: PropsWithChildren) {
    return (
        <>
            <div className="min-h-screen grid grid-rows-[auto_1fr_auto] w-full relative">
                <HeaderNavbar />
                {children}
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