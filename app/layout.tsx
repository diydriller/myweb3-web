"use client";

import { WalletProvider } from "@/context/WalletContext";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <WalletProvider>
        <body>{children}</body>
      </WalletProvider>
    </html>
  );
}
