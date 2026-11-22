import { ComponentChildren, createContext } from "preact";
import { useContext, useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lightweight Select for content scripts with the same API as the site's shadcn/ui Select:
 *
 * <Select value={value} onValueChange={setValue}>
 *     <SelectTrigger>
 *         <SelectValue placeholder="..." />
 *     </SelectTrigger>
 *     <SelectContent>
 *         <SelectItem value="1">One</SelectItem>
 *     </SelectContent>
 * </Select>
 */

interface Position {
    top: number;
    left: number;
    width: number;
}

interface SelectContextValue {
    value?: string;
    onValueChange: (value: string) => void;
    open: boolean;
    setOpen: (open: boolean) => void;
    position: Position | null;
    triggerRef: { current: HTMLDivElement | null };
    contentRef: { current: HTMLDivElement | null };
    labels: Record<string, ComponentChildren>;
    registerLabel: (value: string, label: ComponentChildren) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

// The React JSX typings used by the editor don't accept Preact's Provider type, so it is narrowed to a plain component.
const SelectProvider = SelectContext.Provider as unknown as (props: {
    value: SelectContextValue;
    children: ComponentChildren;
}) => null;

const useSelectContext = () => {
    const context = useContext(SelectContext);
    if (!context) throw new Error("Select components must be used within <Select>");
    return context;
};

interface SelectProps {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    children: ComponentChildren;
}

function Select({ value, defaultValue, onValueChange, children }: SelectProps) {
    const [innerValue, setInnerValue] = useState<string | undefined>(defaultValue);
    const [open, setOpenState] = useState<boolean>(false);
    const [position, setPosition] = useState<Position | null>(null);
    const [labels, setLabels] = useState<Record<string, ComponentChildren>>({});
    const triggerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const currentValue = value !== undefined ? value : innerValue;

    /**
     * Opens or closes the content and calculates its position under the trigger.
     * Fixed positioning keeps the content from being clipped by scrollable containers.
     */
    const setOpen = (next: boolean) => {
        if (next) {
            const rect = triggerRef.current?.getBoundingClientRect();
            if (!rect) return;
            setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
        }
        setOpenState(next);
    };

    const handleValueChange = (next: string) => {
        if (value === undefined) setInnerValue(next);
        onValueChange?.(next);
        setOpen(false);
    };

    const registerLabel = (itemValue: string, label: ComponentChildren) => {
        setLabels(prev => prev[itemValue] === label ? prev : { ...prev, [itemValue]: label });
    };

    // Close on outside click, Escape, scroll and resize.
    useEffect(() => {
        if (!open) return;
        const isInside = (target: EventTarget | null) =>
            !!target && (triggerRef.current?.contains(target as Node) || contentRef.current?.contains(target as Node));
        const close = () => setOpenState(false);
        const onPointerDown = (e: PointerEvent) => !isInside(e.target) && close();
        const onScroll = (e: Event) => !isInside(e.target) && close();
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            e.stopPropagation();
            close();
        };
        document.addEventListener("pointerdown", onPointerDown, true);
        document.addEventListener("keydown", onKeyDown, true);
        window.addEventListener("scroll", onScroll, true);
        window.addEventListener("resize", close);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown, true);
            document.removeEventListener("keydown", onKeyDown, true);
            window.removeEventListener("scroll", onScroll, true);
            window.removeEventListener("resize", close);
        };
    }, [open]);

    return (
        <SelectProvider value={{
            value: currentValue,
            onValueChange: handleValueChange,
            open,
            setOpen,
            position,
            triggerRef,
            contentRef,
            labels,
            registerLabel,
        }}>
            <>{children}</>
        </SelectProvider>
    );
}

interface SelectTriggerProps {
    className?: string;
    "aria-invalid"?: boolean;
    children: ComponentChildren;
}

function SelectTrigger({ className, children, "aria-invalid": invalid }: SelectTriggerProps) {
    const { open, setOpen, triggerRef, value } = useSelectContext();

    return (
        <div
            ref={triggerRef}
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid}
            data-placeholder={value ? undefined : ""}
            className={cn("mt-select-trigger", open && "mt-open", className)}
            onClick={() => setOpen(!open)}>
            <>{children}</>
            <ChevronDown />
        </div>
    );
}

function SelectValue({ placeholder }: { placeholder?: string }) {
    const { value, labels } = useSelectContext();
    const label = value ? labels[value] : undefined;

    return <span className="mt-select-value">{label !== undefined ? <>{label}</> : placeholder}</span>;
}

function SelectContent({ className, children }: { className?: string; children: ComponentChildren }) {
    const { open, position, contentRef } = useSelectContext();

    // Items stay mounted while closed so SelectValue knows the label of the selected item.
    if (!open || !position) return <div style={{ display: "none" }}><>{children}</></div>;

    return (
        <div
            ref={contentRef}
            role="listbox"
            className={cn("mt-select-content", className)}
            style={{ top: position.top, left: position.left, minWidth: position.width }}>
            <>{children}</>
        </div>
    );
}

interface SelectItemProps {
    value: string;
    className?: string;
    children: ComponentChildren;
}

function SelectItem({ value, className, children }: SelectItemProps) {
    const { value: selectedValue, onValueChange, registerLabel } = useSelectContext();
    const isSelected = selectedValue === value;

    // Re-register only when the text changes; JSX children get a new identity on every render.
    const labelKey = typeof children === "string" || typeof children === "number" ? children : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useLayoutEffect(() => registerLabel(value, children), [value, labelKey]);

    return (
        <div
            role="option"
            aria-selected={isSelected}
            className={cn("mt-select-item", className)}
            onClick={() => onValueChange(value)}>
            <span><>{children}</></span>
            {isSelected && <Check />}
        </div>
    );
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
