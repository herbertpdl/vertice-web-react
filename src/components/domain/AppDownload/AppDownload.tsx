"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Apple, Play } from "lucide-react";
import { APP_DOWNLOAD_PATH, APP_STORE_URL, PLAY_STORE_URL, appLoginLink } from "@/lib/appLinks";

export type AppDownloadDevice = "phone" | "computer";

interface AppDownloadProps {
  /** The client's email, filled in on the app's login. */
  email: string;
  /** A phone gets the button and the store links (R10a, R10b); a computer the QR code (R10c). */
  device: AppDownloadDevice;
  /** The QR code's link; defaults to this site's `/baixar-app` (R10d). */
  downloadUrl?: string;
}

/** Sends a client to the Vertice mobile app after their first access (web-trainer-only-access). */
export function AppDownload({ email, device, downloadUrl }: AppDownloadProps) {
  if (device === "computer") return <AppQrCode url={downloadUrl ?? `${window.location.origin}${APP_DOWNLOAD_PATH}`} />;

  return (
    <div className="flex w-full flex-col gap-[var(--space-4)]">
      <a
        href={appLoginLink(email)}
        className="font-base inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-[20px] py-[10px] text-[length:var(--text-base)] font-semibold text-[color:var(--color-primary-text)] transition-colors hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)]"
      >
        Abrir o app
      </a>
      {/* Right under the button: if the app isn't installed, the tap fails (iOS shows an alert). */}
      <div className="flex flex-col gap-[var(--space-2)]">
        <p className="text-[12px] text-[color:var(--color-text-secondary)]">
          Ainda não tem o app? Baixe na sua loja:
        </p>
        <div className="flex gap-[var(--space-2)]">
          <StoreLink href={APP_STORE_URL} icon={<Apple size={18} aria-hidden />} small="Baixar na" label="App Store" />
          <StoreLink href={PLAY_STORE_URL} icon={<Play size={18} aria-hidden />} small="Disponível no" label="Google Play" />
        </div>
      </div>
    </div>
  );
}

function StoreLink({ href, icon, small, label }: { href: string; icon: React.ReactNode; small: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-1 items-center gap-[var(--space-2)] rounded-[var(--radius-md)] border border-[var(--color-border-strong)] px-[12px] py-[8px] text-[color:var(--color-text-primary)] transition-colors hover:border-[var(--color-primary)]"
    >
      {icon}
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] text-[color:var(--color-text-secondary)]">{small}</span>
        <span className="text-[13px] font-semibold">{label}</span>
      </span>
    </a>
  );
}

function AppQrCode({ url }: { url: string }) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" })
      .then((markup) => current && setSvg(markup))
      .catch(() => current && setSvg(null));
    return () => {
      current = false;
    };
  }, [url]);

  return (
    <div className="flex items-center gap-[var(--space-4)] rounded-[var(--radius-md)] border border-[var(--color-border)] p-[var(--space-4)]">
      <div className="flex h-[120px] w-[120px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-white p-[6px]">
        {svg && (
          // A data: URI (the CSP allows `img-src data:`), never injected markup.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
            alt="QR code para baixar o app Vertice"
            width={108}
            height={108}
          />
        )}
      </div>
      <div className="flex flex-col gap-[4px]">
        <p className="font-heading text-[15px] font-bold text-[color:var(--color-text-primary)]">Baixe o app Vertice</p>
        <p className="text-[12px] leading-[1.5] text-[color:var(--color-text-secondary)]">
          Aponte a câmera do celular para baixar o app Vertice.
        </p>
      </div>
    </div>
  );
}
