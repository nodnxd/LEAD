import type { Metadata, Viewport } from "next";
import "./globals.css";

// 폰트는 next/font 대신 Google Fonts 링크 한 줄로.
// next/font는 이 한글 폰트들의 korean 서브셋을 안 받아와서 한글이 시스템 폰트로 떨어짐.
// css2 링크는 unicode-range로 쪼개져 있어 한글 파일은 실제로 한글이 나올 때만 내려옴.
const FONTS =
  "https://fonts.googleapis.com/css2" +
  "?family=Gothic+A1:wght@300;400;500;600;700;800;900" +   // 본문·컨트롤
  "&family=Archivo+Black" +                                 // 디스플레이 라틴 (1 weight)
  "&family=Black+Han+Sans" +                                // 디스플레이 한글 (1 weight)
  "&family=IBM+Plex+Mono:wght@400;500;600" +                // 라벨·카운트
  "&display=swap";

export const metadata: Metadata = {
  title: "LEAD by NEN",
  description: "음악 리드 · 피칭 관리",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "LEAD",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#f4f4f5" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.31.0/dist/tabler-icons.min.css" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
