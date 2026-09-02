import type { Metadata, Viewport } from "next";
import "./globals.css";
import EscapeToClose from "@/components/EscapeToClose";

// 폰트는 next/font 대신 링크 한 줄로.
// next/font는 이 한글 폰트들의 korean 서브셋을 안 받아와서 한글이 시스템 폰트로 떨어짐.
// css2 링크는 unicode-range로 쪼개져 있어 한글 파일은 실제로 한글이 나올 때만 내려옴.
const FONTS =
  "https://fonts.googleapis.com/css2" +
  "?family=Archivo+Black" +                                 // 디스플레이 라틴 (1 weight)
  "&family=Black+Han+Sans" +                                // 디스플레이 한글 (1 weight)
  "&family=IBM+Plex+Mono:wght@400;500;600" +                // 라벨·카운트
  "&family=Outfit:wght@400;500;600;700;800" +              // 본문 라틴 (gdrinkme의 Halenoir 대역 — 기하학적·낮은 x높이)
  "&display=swap";

// 본문·컨트롤 (Wanted Sans, 가변 400–1000). Google Fonts에 없어서 jsDelivr에서 받는다.
// split 빌드라 92개 @font-face가 unicode-range로 쪼개져 있어 위 css2와 같은 방식으로
// 필요한 글자 범위만 내려온다. 이 앱은 300 이하 굵기를 쓰지 않으므로 400 하한은 문제없다.
const BODY_FONT =
  "https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.3" +
  "/packages/wanted-sans/fonts/webfonts/variable/split/WantedSansVariable.css";

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
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* 아이콘 웹폰트도 외부 오리진 — 연결을 미리 열어둔다 */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
        <link rel="stylesheet" href={BODY_FONT} />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.31.0/dist/tabler-icons.min.css" />
        {/* 페인트 전에 테마를 확정한다 — 안 그러면 라이트 사용자에게 다크가 한 번 번쩍인다.
            globals.css의 color-scheme이 이 속성을 보고 네이티브 스크롤바·입력창을 맞춘다.
            next/script의 beforeInteractive는 이 자리에서 SSR HTML에 인라인되지 않아(플라이트
            페이로드로만 나감) 플래시를 못 막는다 — 서버 컴포넌트의 생 <script>여야 한다. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.theme=localStorage.getItem('lead_theme')==='light'?'light':'dark'}catch(e){document.documentElement.dataset.theme='dark'}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <EscapeToClose />
        {children}
      </body>
    </html>
  );
}
