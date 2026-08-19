import type { ReactNode } from "react";
import { AppProviders } from "./providers";
import "./globals.css";

export const metaMetadata = {
  title: "Business Reputation Hub",
  description: "Centralize sua reputação digital. Monitore Google, Instagram e Facebook em um único lugar.",
};

export default function RootLayout({
  children
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}