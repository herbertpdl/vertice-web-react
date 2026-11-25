/**
 * Which link clicks the unsaved-changes guard intercepts (client-anamnese spec D6): a plain
 * primary-button click, not already handled, on a same-origin link that opens in this tab and goes
 * to another page. Returns the path to navigate to on "Sair sem salvar", or `null` to let the
 * click through (a new tab, a download, a modifier click, a link to this same page).
 */
export interface LinkClick {
  button: number;
  defaultPrevented: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export interface LinkTarget {
  href: string;
  target: string;
  hasDownload: boolean;
}

export function guardedLinkPath(click: LinkClick, link: LinkTarget | null, here: URL): string | null {
  if (!link || click.defaultPrevented || click.button !== 0) return null;
  if (click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return null;
  if (link.hasDownload || (link.target !== "" && link.target !== "_self")) return null;
  let url: URL;
  try {
    url = new URL(link.href, here);
  } catch {
    return null;
  }
  if (url.origin !== here.origin || url.pathname === here.pathname) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}
