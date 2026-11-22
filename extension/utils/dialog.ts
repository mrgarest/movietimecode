import { ReactNode } from "react";
import { createRoot, Root } from "react-dom/client";
import { setDisabledScroll } from "./page";

// React roots of the open dialogs, keyed by their container.
const roots = new WeakMap<HTMLDivElement, Root>();

export const renderDialog = (
  name: string,
  node: ReactNode,
  callback: (container: HTMLDivElement) => void,
) => {
  const container = document.createElement("div");
  container.className = "mt-flex mt-items-center mt-justify-center mt-fixed mt-top-left-right-bottom-0 mt-z-999 mt-bg-dialog mt-text-foreground font-inter mt-box-border mt-font-inter mt-scrollbar";
  container.setAttribute("data-mt-dialog", name);
  document.body.appendChild(container);
  setDisabledScroll(true);
  try {
    const root = createRoot(container);
    roots.set(container, root);
    root.render(node);
    callback(container);
  } catch {
    removeDialog(container);
  }
};

export const removeDialog = (container: HTMLDivElement) => {
  if (!container.isConnected) return;
  roots.get(container)?.unmount();
  roots.delete(container);
  container.remove();
  setDisabledScroll(false);
};
