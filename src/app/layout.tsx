import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaInstall from "@/components/PwaInstall";
import PwaServiceWorker from "@/components/PwaServiceWorker";

export const metadata: Metadata = {
  title: "MONEY HUB • Sourcing Control",
  description: "Private financial command center.",
  applicationName: "Money Hub",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/brand-icon", type: "image/jpeg", sizes: "512x512" }],
    apple: [{ url: "/brand-icon", type: "image/jpeg", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Money Hub",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
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
        <PwaServiceWorker />
        {children}
        <PwaInstall />
      </body>
    </html>
  );
}
