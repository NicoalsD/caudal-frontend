/**
 * Puts text on the clipboard. Resolves to false when the browser has no clipboard or refuses, so
 * the screen can show the text to copy by hand instead.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard === undefined) {
      return false;
    }
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
