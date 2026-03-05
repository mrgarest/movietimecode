import { useSeo } from "@/hooks/useSeo";
import { useTranslation } from "react-i18next";
import { Accordion, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { FaqSection } from "@/interfaces/faq";
import { useEffect, useState } from "react";
import AccordionFaqContent from "@/components/AccordionFaqContent";

export default function FaqPage() {
    const [openItem, setOpenItem] = useState<string | undefined>(undefined);
    const { t } = useTranslation();
    const { setSeo } = useSeo();
    setSeo({
        title: t('frequentlAskedQuestion'),
        description: t('seoDescriptionFaq')
    });

    // Adds an anchor to the link
    useEffect(() => {
        const hash = window.location.hash.replace("#", "");
        if (hash) {
            setOpenItem(hash);
        }
    }, []);

    const items: FaqSection[] = [
        {
            title: t('frequentlAskedQuestion'),
            items: [
                {
                    value: "why-is-this-extension-needed",
                    title: t('faqItems.whyIsThisExtensionNeeded.title'),
                    content: [
                        { type: "text", value: t('faqItems.whyIsThisExtensionNeeded.content.0') },
                        { type: "text", value: t('faqItems.whyIsThisExtensionNeeded.content.1') }
                    ]
                },
                {
                    value: "how-to-add-timecodes",
                    title: t('faqItems.howToAddTimecodes.title'),
                    content: [
                        { type: "text", value: t('faqItems.howToAddTimecodes.content') },
                        { type: "image", src: "images/faq/add-timecodes.webp" }
                    ]
                },
                {
                    value: "can-i-connect-obs-or-streamlabs",
                    title: t('faqItems.canConnectObsOrStreamlabs.title'),
                    content: [
                        { type: "text", value: t('faqItems.canConnectObsOrStreamlabs.content.0') },
                        { type: "text", value: t('faqItems.canConnectObsOrStreamlabs.content.1') },
                        { type: "text", value: t('faqItems.canConnectObsOrStreamlabs.content.2') },
                        { type: "image", src: "images/faq/ws-obsstudio.webp", alt: "OBS" },
                        { type: "image", src: "images/faq/ws-streamlabs.webp", alt: "Streamlabs" }
                    ]
                }
            ]
        },
        {
            title: t('faqTwitch'),
            items: [
                {
                    value: "can-i-stream-movies-on-twitch",
                    title: t('faqItems.canStreamMoviesOnTwitch.title'),
                    content: [
                        { type: "text", value: t('faqItems.canStreamMoviesOnTwitch.content.0') },
                        { type: "text", value: t('faqItems.canStreamMoviesOnTwitch.content.1') }
                    ]
                },
                {
                    value: "what-sanctions-can-be-applied",
                    title: t('faqItems.whatSanctionsCanBeApplied.title'),
                    content: [
                        { type: "text", value: t('faqItems.whatSanctionsCanBeApplied.content.0') },
                        { type: "text", value: t('faqItems.whatSanctionsCanBeApplied.content.1') }
                    ]
                },
                {
                    value: "selective-baths",
                    title: t('faqItems.selectiveBaths.title'),
                    content: [
                        { type: "text", value: t('faqItems.selectiveBaths.content') }
                    ]
                },
                {
                    value: "who-can-block-your-stream",
                    title: t('faqItems.whoCanBlockYourStream.title'),
                    content: [
                        { type: "text", value: t('faqItems.whoCanBlockYourStream.content.0') },
                        { type: "text", value: t('faqItems.whoCanBlockYourStream.content.1') },
                        { type: "text", value: t('faqItems.whoCanBlockYourStream.content.2') }
                    ]
                },
                {
                    value: "which-studios-to-avoid",
                    title: t('faqItems.whichStudiosAvoid.title'),
                    content: [
                        { type: "text", value: t('faqItems.whichStudiosAvoid.content.0') },
                        { type: "text", value: t('faqItems.whichStudiosAvoid.content.1') }
                    ]
                },
                {
                    value: "how-to-protect-yourself-from-ban",
                    title: t('faqItems.howToProtectYourselfFromBan.title'),
                    content: [
                        { type: "text", value: t('faqItems.howToProtectYourselfFromBan.content.0') },
                        { type: "text", value: t('faqItems.howToProtectYourselfFromBan.content.1') },
                        { type: "text", value: t('faqItems.howToProtectYourselfFromBan.content.2') },
                        { type: "text", value: t('faqItems.howToProtectYourselfFromBan.content.3') }
                    ]
                }
            ]
        }
    ];

    /**
     * Handles value changes in Accordion.
     * @param val 
     */
    const handleValueChange = (val: string | undefined) => {
        setOpenItem(val);
        window.history.replaceState(null, "", val ? `#${val}` : window.location.pathname + window.location.search);
    };

    return (
        <div className="space-y-4 sm:space-y-6 pt-3 sm:pt-5">
            {items.map((section, sectionIndex) => <div
                key={sectionIndex}
                className="space-y-2">
                {sectionIndex == 0
                    ? <h1 className="text-xl sm:text-3xl md:text-4xl font-bold sm:text-center px-4">{section.title}</h1>
                    : <h2 className="text-lg sm:text-xl font-bold sm:text-center px-4">{section.title}</h2>}
                <Accordion
                    type="single"
                    collapsible
                    value={openItem}
                    onValueChange={handleValueChange}
                    className="w-full max-w-2xl mx-auto">
                    {section.items.map((item) => <AccordionItem
                        id={item.value}
                        key={item.value}
                        value={item.value}
                        className="border-b px-4 last:border-b-0">
                        <AccordionTrigger className="sm:text-base">{item.title}</AccordionTrigger>
                        <AccordionFaqContent item={item} />
                    </AccordionItem>)}
                </Accordion>
            </div>)}
        </div>
    )
};