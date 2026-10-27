import { NextRequest, NextResponse } from "next/server";
import { APP_STORE_URL, PLAY_STORE_URL, storeFor } from "@/lib/appLinks";

/**
 * The link behind the "Senha definida" QR code (web-trainer-only-access R10d): one address for
 * every phone, sent on to its own store. Anything else (a computer, an unknown phone) gets both
 * store links on a bare page, so the link never dead-ends.
 */
export function GET(request: NextRequest) {
  const store = storeFor(request.headers.get("user-agent") ?? "");
  if (store) {
    return NextResponse.redirect(store === "app-store" ? APP_STORE_URL : PLAY_STORE_URL, 302);
  }
  const html =
    '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1"><title>Baixe o app Vertice</title></head>' +
    "<body><h1>Baixe o app Vertice</h1><ul>" +
    `<li><a href="${APP_STORE_URL}">App Store</a></li>` +
    `<li><a href="${PLAY_STORE_URL}">Google Play</a></li>` +
    "</ul></body></html>";
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
