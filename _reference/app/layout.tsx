import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Nucode",
    template: "Nucode - %s",
  },
  description:
    "Nucode - The complete Nutrient demo platform.",
  robots: "noindex, nofollow",
  icons: {
    icon: "/nutrient-logo.png",
    shortcut: "/nutrient-logo.png",
    apple: "/nutrient-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@700,500,400&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "hsl(0 0% 10%)",
              border: "1px solid hsl(0 0% 16%)",
              color: "hsl(0 0% 96%)",
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}
