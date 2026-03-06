import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { EditorChrome } from "@/components/editor-chrome";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Banana Icon - AI Game Asset Generator",
  description: "Generate game assets with Nano Banana AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={`${sans.variable} ${display.variable} antialiased`}>
        <div className="app-shell">
          <div className="app-frame">
            <main className="app-main">
              <EditorChrome />
              <div className="app-main-scroll">
                <div className="app-main-inner">{children}</div>
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
