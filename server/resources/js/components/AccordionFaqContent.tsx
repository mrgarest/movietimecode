import { cn } from "@/lib/utils"
import { AccordionContent } from "./ui/accordion"
import { FaqItem } from "@/interfaces/faq"
import ModalImage from "react-modal-image"

export default function AccordionFaqContent({ item }: { item: FaqItem }) {
    return (
        <AccordionContent className={cn("sm:text-base", item.content.length > 0 && "space-y-4")}>{item.content.map((content, i) => {
            if (content.type === "text") {
                return <p key={`${item.value}-${i}`}>{content.value}</p>
            }

            if (content.type === "image") {
                return (
                    <div
                        key={`${item.value}-${i}`}
                        className={cn(content.alt && "relative")}>
                        <ModalImage
                            small={content.src}
                            large={content.src}
                            alt={content.alt}
                            hideDownload={true}
                            hideZoom={true}
                            className="rounded-lg border select-none"
                        />
                        {content.alt && <div className="absolute top-0 left-0 z-10 px-2 py-1 backdrop-blur-xl bg-black/50 rounded-tl-lg rounded-br-lg text-xs font-medium select-none pointer-events-none">{content.alt}</div>}
                    </div>
                )
            }

            return null
        })}</AccordionContent>
    )
}