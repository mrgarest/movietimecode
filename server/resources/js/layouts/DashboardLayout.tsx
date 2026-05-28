import SideNavbar from "@/components/dashboard/SideNavbar";
import { PropsWithChildren } from "react";
import { Toaster } from 'react-hot-toast';

export default function DashboardLayout({ children }: PropsWithChildren) {
    return (
        <>
            <div className="container grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 min-h-screen">
                <SideNavbar />
                <main className="pt-6">{children}</main>
            </div>
            <Toaster
                position="top-right"
                reverseOrder={true}
            />
        </>
    );
}

