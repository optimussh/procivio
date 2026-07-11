import type { Metadata } from "next";
import "./globals.css";

import { LangProvider } from "@/lib/i18n";
import { Providers } from "@/components/providers";
import { TopNav } from "@/components/top-nav";

export const metadata: Metadata = {
  title: "Procivio",
  description:
    "Interview. Structure. Map. / 인터뷰·구조·맵 — process knowledge platform / 프로세스 지식 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="h-screen flex flex-col">
        <LangProvider>
          <TopNav />
          <main className="flex flex-1 flex-col min-h-0">
            <Providers>{children}</Providers>
          </main>
        </LangProvider>
      </body>
    </html>
  );
}
