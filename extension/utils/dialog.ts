import { ComponentChild, render } from "preact";
import { setDisabledScroll } from "./page";

export const renderDialog = (
  name: string,
  vnode: ComponentChild,
  callback: (container: HTMLDivElement) => void,
) => {
  const container = document.createElement("div");
  container.className = "mt-dialog";
  container.setAttribute("data-st-dialog", name);
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
