/**
 * Large error code (e.g. 404, 403) with the site icon in place of the middle digit.
 */
export function ErrorCode({ code }: { code: number }) {
    const digits = String(code);

    return (
        <div className="flex items-center justify-center">
            <h1 className="text-8xl sm:text-9xl text-foreground font-bold select-none text-shadow-lg/40 text-shadow-white/30 flex items-end">
                <span>{digits[0]}</span>
                <img src="/images/icon.gif" className="size-18 sm:size-26 rounded-full mb-3 border-4 border-foreground" />
                <span>{digits[2]}</span>
            </h1>
        </div>
    );
}
