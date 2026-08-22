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
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.setAttribute('data-theme','dark')}catch(e){}" }} />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
