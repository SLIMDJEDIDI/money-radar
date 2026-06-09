import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MONEY RADAR • Command Center",
  description: "Real-time money distribution tracking and financial command center.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevents auto-zooming on input focus on iOS/mobile which breaks premium UX
  themeColor: "#000000",
};

export default function RootLayout({
  children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
  return (
    <html lang="en" className="dark bg-black select-none">
      <body className="antialiased min-h-screen text-white bg-black">
        {children}
      </body>
    </html>
  );
}
