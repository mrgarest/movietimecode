/**
 * Waits for the DOM to load if it is not ready yet.
 */
export async function waitForDOMContentLoaded() {
  if (document.readyState !== "loading") {
    return;
  }

  await new Promise((resolve) =>
    window.addEventListener("DOMContentLoaded", resolve, { once: true }),
  );
}

/**
 * Asynchronously waits for an element to appear in the DOM with a specified selector.
 *
 * @template T - The type of element returned.
 * @param selector - Selector for searching for an element.
 * @param options.root - Root element.
 * @param options.timeout - Maximum wait time in milliseconds.
 * @param options.interval - The interval between checks in milliseconds.
 * @returns A promise that resolves with the found element or is rejected on timeout.
 */
export const waitForElement = <T extends Element = Element>(
  selector: string,
  options: {
    root?: ShadowRoot;
    timeout?: number;
    interval?: number;
  } = {},
): Promise<T> => {
  const { root, timeout = 10000, interval = 100 } = options;

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const context = root ?? document;

    const check = (): void => {
      const element = context.querySelector<T>(selector);

      if (element) {
        resolve(element);
      } else if (Date.now() - startTime >= timeout) {
        reject(
          new Error(
            `The element "${selector}" did not appear within ${timeout} ms`,
          ),
        );
      } else {
        setTimeout(check, interval);
      }
    };

    check();
  });
};

/**
 * Waits until the element behind the selector appears in the DOM and has a shadowRoot.
 * @param selector - Selector for searching for an element.
 * @param timeout - Maximum wait time in milliseconds.
 * @param interval - The interval between checks in milliseconds.
 */
export const waitForShadowRoot = (
  selector: string,
  timeout: number = 10000,
  interval: number = 100,
): Promise<ShadowRoot> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = (): void => {
      const shadowRoot =
        document.querySelector<HTMLElement>(selector)?.shadowRoot;

      if (shadowRoot) {
        resolve(shadowRoot);
      } else if (Date.now() - startTime >= timeout) {
        reject(
          new Error(
            `shadowRoot of "${selector}" did not appear within ${timeout} ms`,
          ),
        );
      } else {
        setTimeout(check, interval);
      }
    };

    check();
  });
};

/**
 * Enables or disables page scrolling.
 * @param disabled If true, scrolling will be disabled.
 */
export const setDisabledScroll = (disabled: boolean) =>
  document.body.classList.toggle("mt-no-scroll", disabled);

/**
 * Adds font support in head
 */
export const setHeaderFonts = () => {
  [
    "https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap",
    "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  ].forEach((href) => {
    if (document.querySelector(`link[href="${href}"]`)) return;

    const link = document.createElement("link");
    link.href = href;
    link.rel = "stylesheet";

    if (href.includes("fonts.googleapis.com")) {
      const preconnect = document.createElement("link");
      preconnect.rel = "preconnect";
      preconnect.href = "https://fonts.gstatic.com";
      preconnect.crossOrigin = "anonymous";
      document.head.appendChild(preconnect);
    }

    document.head.appendChild(link);
  });
};
