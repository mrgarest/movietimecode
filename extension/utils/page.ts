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
// Number of open dialogs that need the page scroll to be locked.
let scrollLockCount = 0;
// Inline styles of the page before the lock, restored on unlock.
let savedScrollStyles: { html: string; body: string; paddingRight: string } | null = null;

export const setDisabledScroll = (disabled: boolean) => {
  scrollLockCount = Math.max(0, scrollLockCount + (disabled ? 1 : -1));
  const html = document.documentElement;
  const body = document.body;

  if (scrollLockCount > 0 && !savedScrollStyles) {
    // Compensate the hidden scrollbar so the page does not jump.
    const scrollbarWidth = window.innerWidth - html.clientWidth;
    savedScrollStyles = {
      html: html.style.getPropertyValue("overflow"),
      body: body.style.getPropertyValue("overflow"),
      paddingRight: body.style.getPropertyValue("padding-right"),
    };
    html.style.setProperty("overflow", "hidden", "important");
    body.style.setProperty("overflow", "hidden", "important");
    if (scrollbarWidth > 0) {
      const padding = parseFloat(getComputedStyle(body).paddingRight) || 0;
      body.style.setProperty("padding-right", `${padding + scrollbarWidth}px`, "important");
    }
  } else if (scrollLockCount === 0 && savedScrollStyles) {
    html.style.setProperty("overflow", savedScrollStyles.html);
    body.style.setProperty("overflow", savedScrollStyles.body);
    body.style.setProperty("padding-right", savedScrollStyles.paddingRight);
    savedScrollStyles = null;
  }
};

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
