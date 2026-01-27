/**
 * Copying text to the clipboard.
 * @param text 
 */
export const copy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {}
};
