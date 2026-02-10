import { useSeo } from "@/hooks/useSeo";

export default function NotFoundPage() {
    const { setSeo } = useSeo();
    setSeo({ title: '404 - Page not found' });

    return (
        <div className="flex items-center justify-center">
            <h1 className="text-8xl sm:text-9xl text-foreground font-bold select-none text-shadow-lg/40 text-shadow-white/30 flex items-end">
                <span>4</span>
                <img src="/images/icon.gif" className="size-18 sm:size-26 rounded-full mb-3 border-4 border-foreground" />
                <span>4</span>
            </h1>
        </div>
    );
}