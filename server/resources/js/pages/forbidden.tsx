import { ErrorCode } from "@/components/ErrorCode";
import { MetaTag } from "@/components/MetaTag";

export default function ForbiddenPage() {
    return (
        <>
            <MetaTag
                title="403 - Access denied"
                description="Access denied"
            />
            <ErrorCode code={403} />
        </>
    );
}
