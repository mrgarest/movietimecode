/**
 * Copying text to the clipboard.
 * @param text 
 * @returns true if the text was copied
 */
export const copy = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    return false;
  }
};
