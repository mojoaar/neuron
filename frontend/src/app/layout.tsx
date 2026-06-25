import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "NEURON // SYSTEM HUD",
  description: "AI-Native Software Project Lifecycle Manager Dashboard",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2220%22 fill=%22%230a0a0a%22/><path d=%22M30 30 L55 50 L30 70 M60 70 L75 70%22 fill=%22none%22 stroke=%22%2300ff66%22 stroke-width=%2210%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable}`}>
      <body className="font-mono selection:bg-terminal-green/30 selection:text-terminal-green antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
