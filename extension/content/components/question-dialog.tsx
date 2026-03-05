import { playAlertSound } from "@/utils/alert";
import { Button, TButtonStyle } from "./ui/button";
import { removeDialog, renderDialog } from "@/utils/dialog";
import { useEffect } from "preact/hooks";

interface RootProps {
    id?: string;
    sound?: boolean;
    title: string;
    description?: string;
    buttons: QuestionDialogButton[],
    onDismiss?: () => void
};

interface QuestionDialogButton {
    text: string;
    style?: TButtonStyle;
    dismiss?: boolean;
    onClick?: () => void
};

/**
 * QuestionDialog component
 * Renders a dialog with title, description and buttons.
 * @param title - dialog title
 * @param description - dialog description
 * @param buttons - dialog buttons
 */
const QuestionDialog = ({ title, description = undefined, buttons, sound = false }: RootProps) => {
    useEffect(() => {
        sound && playAlertSound();
    }, [])

    return (
        <div className="mt-dialog-container mt-dialog-question">
            <div className="mt-title">{title}</div>
            {description && <div className="mt-description">{description}</div>}
            <div className="mt-buttons">{buttons.map((
                { style = "primary", text, dismiss = true, onClick = undefined }: QuestionDialogButton,
                index
            ) => <Button
                    key={index}
                    style={style}
                    text={text}
                    onClick={onClick || dismiss ? () => {
                        if (onClick) onClick();
                        if (dismiss) dismissQuestionDialog();
                    } : undefined}
                />)}
            </div>
        </div>
    )
};

/**
 * Renders the QuestionDialog in a dialog container.
 * @param props - dialog props
 */
let container: HTMLDivElement;
let id: string | undefined;
export const renderQuestionDialog = (props: RootProps) => {
    if (props.id !== undefined && id === props.id) return;
    id = props.id;
    renderDialog("question", <QuestionDialog {...props} />, (e) => container = e);
}

/**
 * Dismisses the QuestionDialog.
 */
export const dismissQuestionDialog = () => {
    if (!container) return;
    removeDialog(container);
    id = undefined;
};