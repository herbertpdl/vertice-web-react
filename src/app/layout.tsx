import type { Metadata } from "next";
import { connection } from "next/server";
import { Inter, Space_Grotesk } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vertice",
  description: "Vertice Coach web application",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render every page per request: `src/proxy.ts` puts a fresh CSP nonce on each one, and Next
  // can only stamp it on its scripts at request time (a prerendered page has none).
  await connection();
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-base bg-[var(--color-bg)] text-[color:var(--color-text-primary)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
