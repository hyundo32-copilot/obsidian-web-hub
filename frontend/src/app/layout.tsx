import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "hyundo32의 옵시디언 웹 허브",
  description: "볼트 기반 개인 지식 검색",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 antialiased">{children}</body>
    </html>
  );
}
