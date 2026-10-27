/**
 * Where the web sends a client to the Vertice mobile app (web-trainer-only-access R10a–R10e).
 * The app is not published yet, so both store URLs are placeholders (R10e): replace them here when
 * it is, and every link and the QR code follow.
 */
export const APP_STORE_URL = "https://apps.apple.com/br/app/vertice/id0000000000";
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.vertice.mobile";

/** This app's route that sends a phone to its own store (R10d): what the QR code encodes. */
export const APP_DOWNLOAD_PATH = "/baixar-app";

export type Store = "app-store" | "play-store";

/** The store for a phone's user agent, or `null` when it is neither an iPhone/iPad nor Android. */
export function storeFor(userAgent: string): Store | null {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "app-store";
  if (/Android/i.test(userAgent)) return "play-store";
  return null;
}

/**
 * The mobile app's login with the email filled in (R10a), through its `verticemobile` scheme
 * (vertice-mobile `app.json`). Only the email travels: never the setup token.
 */
export function appLoginLink(email: string): string {
  return `verticemobile://login?email=${encodeURIComponent(email)}`;
}
