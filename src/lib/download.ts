import type { DownloadedFile } from "@/lib/api/client";

/**
 * Hands a fetched file to the browser as a download (`a[download]` on an object URL). The file is
 * fetched first, not navigated to, so a 413 or 429 can be shown on the page instead of as a JSON
 * error document.
 */
export function saveFile({ blob, filename }: DownloadedFile): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next task: the click has started the download by then.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
