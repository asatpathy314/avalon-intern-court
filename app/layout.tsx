import type { Metadata, Viewport } from "next";
import "./fonts/fonts.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Intern Court",
  description:
    "Avalon, played Jackbox-style: one screen for the court, every phone a private hand.",
};

export const viewport: Viewport = {
  themeColor: "#0B0D18",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <div className="grain" aria-hidden />
      </body>
    </html>
  );
}
