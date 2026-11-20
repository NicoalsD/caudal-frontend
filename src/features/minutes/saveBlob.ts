/** How long the object URL lives after the click: some browsers cancel a download if it goes sooner. */
const REVOKE_DELAY_MS = 1000;

/**
 * Saves a Blob as a file: a temporary object URL, a link with `download` clicked once, and the URL
 * revoked afterwards. The blob never reaches the DOM as a page, only as the file.
 */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, REVOKE_DELAY_MS);
}
