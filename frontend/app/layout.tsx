import type { Metadata, Viewport } from "next";
import "./globals.css";

/* ─────────────────────────────────────────────────────────
   Metadate globale (fallback – suprascrise din API la CSR)
   ───────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: {
    default: "Nexus Dev Studio | Dezvoltare Web Modernă & Aplicații Scalabile",
    template: "%s | Nexus Dev Studio",
  },
  description:
    "Nexus Dev Studio construiește aplicații web imersive, platforme SaaS și experiențe digitale de top. Stack modern, design premium, performanță maximă.",
  keywords: [
    "dezvoltare web",
    "next.js",
    "react",
    "aplicații web",
    "full-stack",
    "node.js",
    "tailwind",
    "glassmorphism",
    "SaaS",
    "e-commerce",
    "PWA",
  ],
  authors: [{ name: "Nexus Dev Studio" }],
  creator: "Nexus Dev Studio",
  publisher: "Nexus Dev Studio",
  metadataBase: new URL("https://nexusdevstudio.ro"),
  openGraph: {
    type: "website",
    locale: "ro_RO",
    url: "https://nexusdevstudio.ro",
    siteName: "Nexus Dev Studio",
    title: "Nexus Dev Studio | Dezvoltare Web Modernă",
    description:
      "Nexus Dev Studio construiește aplicații web imersive, platforme SaaS și experiențe digitale de top.",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Nexus Dev Studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexus Dev Studio | Dezvoltare Web Modernă",
    description:
      "Nexus Dev Studio construiește aplicații web imersive, platforme SaaS și experiențe digitale de top.",
    images: ["/images/og-image.jpg"],
    creator: "@nexusdevstudio",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0D0A1A",
};

/* ─────────────────────────────────────────────────────────
   Root Layout
   ───────────────────────────────────────────────────────── */

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro" className="scroll-smooth">
      <head>
        {/* Preload fonturi pentru performanță */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Preload video hero */}
        <link
          rel="preload"
          href="/video/hero-bg.mp4"
          as="video"
          type="video/mp4"
        />
      </head>
      <body className="min-h-screen bg-nexus-dark text-white font-sans antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}