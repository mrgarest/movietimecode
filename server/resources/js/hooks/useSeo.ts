import { useCallback } from "react";

interface SEOProps {
    title?: string;
    description?: string;
    image?: string;
}

export const useSeo = () => {
    const setSeo = useCallback(({ title, description, image = '/images/b35hj3.jpg' }: SEOProps) => {
        if (title) {
            // Add suffix if not on the main page
            if (window.location.pathname !== "/") {
                title += " | Movie Timecode";
            }

            if (document.title !== title) {
                document.title = title;
            }
        }

        // Meta tag map for updating
        const metaMap = [
            { selector: 'meta[name="description"]', value: description },
            { selector: 'meta[property="og:description"]', value: description },
            { selector: 'meta[property="og:title"]', value: title },
            { selector: 'meta[property="og:image"]', value: image },
            { selector: 'meta[name="twitter:title"]', value: title },
            {
                selector: 'meta[name="twitter:description"]',
                value: description,
            },
            { selector: 'meta[name="twitter:image"]', value: image },
        ];

        metaMap.forEach(({ selector, value }) => {
            if (value) {
                const element = document.querySelector(selector);
                if (element) {
                    element.setAttribute("content", value);
                }
            }
        });
    }, []);

    return { setSeo };
};
