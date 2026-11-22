import { cloneElement, ComponentChildren, createContext, isValidElement, VNode } from "preact";
import { useContext, useId } from "preact/hooks";
import {
    FormProvider,
    useController,
    useFormContext,
    useFormState,
    type Control,
    type ControllerFieldState,
    type ControllerRenderProps,
    type FieldPath,
    type FieldValues,
    type UseFormReturn,
} from "react-hook-form";
import { cn } from "@/lib/utils";

/**
 * Form components for content scripts with the same API as the site's shadcn/ui Form:
 *
 * <Form {...form}>
 *     <form onSubmit={...}>
 *         <FormField control={form.control} name="username" render={({ field }) => (
 *             <FormItem>
 *                 <FormLabel>Username</FormLabel>
 *                 <FormControl>
 *                     <Input {...field} />
 *                 </FormControl>
 *                 <FormMessage />
 *             </FormItem>
 *         )} />
 *     </form>
 * </Form>
 */

// The React JSX typings used by the editor don't accept react-hook-form's FormProvider under Preact,
// so it is narrowed to a plain component.
const Form = FormProvider as unknown as <TFieldValues extends FieldValues>(
    props: UseFormReturn<TFieldValues> & { children: ComponentChildren }
) => null;

interface FormFieldContextValue {
    name: string;
}

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

// The React JSX typings used by the editor don't accept Preact's Provider type.
const FormFieldProvider = FormFieldContext.Provider as unknown as (props: {
    value: FormFieldContextValue;
    children: ComponentChildren;
}) => null;

interface FormFieldProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>> {
    control: Control<TFieldValues>;
    name: TName;
    render: (props: {
        field: ControllerRenderProps<TFieldValues, TName>;
        fieldState: ControllerFieldState;
    }) => ComponentChildren;
}

function FormField<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>({
    control,
    name,
    render,
}: FormFieldProps<TFieldValues, TName>) {
    const { field, fieldState } = useController({ control, name });

    return (
        <FormFieldProvider value={{ name }}>
            <>{render({ field, fieldState })}</>
        </FormFieldProvider>
    );
}

interface FormItemContextValue {
    id: string;
}

const FormItemContext = createContext<FormItemContextValue | null>(null);

const FormItemProvider = FormItemContext.Provider as unknown as (props: {
    value: FormItemContextValue;
    children: ComponentChildren;
}) => null;

const useFormField = () => {
    const fieldContext = useContext(FormFieldContext);
    const itemContext = useContext(FormItemContext);
    const { getFieldState } = useFormContext();
    const formState = useFormState({ name: fieldContext?.name });

    if (!fieldContext) throw new Error("useFormField should be used within <FormField>");
    if (!itemContext) throw new Error("useFormField should be used within <FormItem>");

    const fieldState = getFieldState(fieldContext.name, formState);
    const { id } = itemContext;

    return {
        id,
        name: fieldContext.name,
        formItemId: `${id}-form-item`,
        formDescriptionId: `${id}-form-item-description`,
        formMessageId: `${id}-form-item-message`,
        ...fieldState,
    };
};

function FormItem({ className, children }: { className?: string; children: ComponentChildren }) {
    const id = useId();

    return (
        <FormItemProvider value={{ id }}>
            <div data-slot="form-item" className={cn("mt-form-item", className)}>
                <>{children}</>
            </div>
        </FormItemProvider>
    );
}

function FormLabel({ className, children }: { className?: string; children: ComponentChildren }) {
    const { error, formItemId } = useFormField();

    return (
        <label
            data-slot="form-label"
            data-error={!!error}
            className={cn("mt-form-label", className)}
            htmlFor={formItemId}>
            <>{children}</>
        </label>
    );
}

/**
 * Passes id and aria attributes to its only child, like Radix Slot in shadcn/ui.
 */
function FormControl({ children }: { children: ComponentChildren }) {
    const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

    if (!isValidElement(children)) return <>{children}</>;

    return <>{cloneElement(children as VNode, {
        "data-slot": "form-control",
        id: formItemId,
        "aria-describedby": !error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`,
        "aria-invalid": !!error,
    })}</>;
}

function FormDescription({ className, children }: { className?: string; children: ComponentChildren }) {
    const { formDescriptionId } = useFormField();

    return (
        <p data-slot="form-description" id={formDescriptionId} className={cn("mt-form-description", className)}>
            <>{children}</>
        </p>
    );
}

function FormMessage({ className, children }: { className?: string; children?: ComponentChildren }) {
    const { error, formMessageId } = useFormField();
    const body = error ? String(error?.message ?? "") : children;

    if (!body) return null;

    return (
        <p data-slot="form-message" id={formMessageId} className={cn("mt-form-message", className)}>
            <>{body}</>
        </p>
    );
}

export {
    useFormField,
    Form,
    FormItem,
    FormLabel,
    FormControl,
    FormDescription,
    FormMessage,
    FormField,
};
