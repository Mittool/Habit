import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import PWALayout from "@/components/PWALayout";

export const metadata: Metadata = {
  title: "Trac - Habit & Focus Tracker",
  description: "Track habits, manage time, boost focus, and build your best self with AI-powered insights.",
  applicationName: "Trac",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Trac",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#5c7a5c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" sizes="180x180" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#5c7a5c" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
      </head>
      <body>
        <ThemeProvider>
          <PWALayout>{children}</PWALayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
