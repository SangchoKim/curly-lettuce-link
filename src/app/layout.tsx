import type { Viewport } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={fontVariables}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
