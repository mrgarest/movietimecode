import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

interface Props {
    youtubeId: string;
    open: boolean;
    onClose: () => void;
}

export function TrailerModal({ youtubeId, open, onClose }: Props) {
    const [visible, setVisible] = useState<boolean>(false);

    useBodyScrollLock(open);

    useEffect(() => {
        if (open) {
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
        } else {
            setVisible(false);
        }
    }, [open]);

    if (!open || typeof document === "undefined") return null;

    return createPortal(
        <div
            className={cn(
                "fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 select-none backdrop-blur-sm transition-opacity duration-250",
                visible ? "opacity-100" : "opacity-0"
            )}
            onClick={onClose}
        >
            <div
                className={cn(
                    "relative w-full max-w-6xl transition-all duration-250",
                    visible ? "scale-100" : "scale-95"
                )}
                style={{ aspectRatio: '16/9', maxHeight: 'calc(100vh - 5rem)' }}
                onClick={e => e.stopPropagation()}
            >
                <iframe
                    className="w-full h-full rounded-xl"
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                    allow="accelerometer; autoplay; encrypted-media"
                    allowFullScreen
                />
                <X
                    className="absolute -top-9 right-0 w-7 h-7 text-white/70 hover:text-white cursor-pointer transition-colors"
                    onClick={onClose}
                />
            </div>
        </div>,
        document.body
    );
}

export function useTrailerModal() {
    const [open, setOpen] = useState<boolean>(false);

    const openTrailer = () => setOpen(true);

    const closeTrailer = () => {
        setOpen(false);
    };

    return { open, openTrailer, closeTrailer };
}
