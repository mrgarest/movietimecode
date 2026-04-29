export type FaqContent =
    | { type: "text"; value: string }
    | { type: "image"; src: string; alt?: string };

export interface FaqItem {
    value: string;
    title: string;
    content: FaqContent[];
}

export interface FaqSection {
    title: string;
    items: FaqItem[];
}
