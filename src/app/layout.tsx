import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaInstall from "@/components/PwaInstall";
import PwaServiceWorker from "@/components/PwaServiceWorker";

export const metadata: Metadata = {
  title: "MONEY HUB • Sourcing Control",
  description: "Private financial command center.",
  applicationName: "Money Hub",
  manifest: "/manifest.webmanifest",
  // Pas de bloc `icons` ici : un bloc explicite ÉCRASE les fichiers icon.jpg /
  // apple-icon.jpg de src/app. Next génère les balises <link> tout seul à partir
  // de ces fichiers, avec un hash de version qui casse le cache du navigateur.
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
