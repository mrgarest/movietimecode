import { ComponentChild, render } from "preact";
import { setDisabledScroll } from "./page";

export const renderDialog = (
  name: string,
  vnode: ComponentChild,
  callback: (container: HTMLDivElement) => void,
) => {
  const container = document.createElement("div");
  container.className = "mt-flex mt-items-center mt-justify-center mt-fixed mt-top-left-right-bottom-0 mt-z-999 mt-bg-dialog mt-text-foreground font-inter mt-box-border mt-font-inter mt-scrollbar";
  container.setAttribute("data-mt-dialog", name);
  document.body.appendChild(container);
  setDisabledScroll(true);
  try {
    render(vnode, container);
    callback(container);
  } catch {
    removeDialog(container);
  }
};

export const removeDialog = (container: HTMLDivElement) => {
  render(null, container);
  container.remove();
  setDisabledScroll(false);
};
