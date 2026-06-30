import type { Metadata } from "next";
import fs from "fs";
import path from "path";
import "./globals.css";

let siteTitle = "옵시디언 웹 허브";
try {
  const configPath = path.resolve(process.cwd(), "../config/settings.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    if (config.site_title) {
      siteTitle = config.site_title;
    }
  }
} catch {
  // Config loading failed, fallback to default title
}

export const metadata: Metadata = {
  title: siteTitle,
  description: "볼트 기반 개인 지식 검색",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* 다크모드 플래시 방지 — React hydration 전에 실행 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('theme');
                if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-900 antialiased transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
