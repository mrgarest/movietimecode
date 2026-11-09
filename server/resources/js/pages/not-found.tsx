import { ErrorCode } from "@/components/ErrorCode";
import { MetaTag } from "@/components/MetaTag";

export default function NotFoundPage() {
    return (
        <>
            <MetaTag
                title="404 - Page not found"
                description="Page not found"
            />
            <ErrorCode code={404} />
        </>
    );
}
