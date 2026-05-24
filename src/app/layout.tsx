import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "日報",
  description: "日報入力フォーム",
  // iOS「ホーム画面に追加」でフルスクリーン起動
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "日報",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2563eb", // Chromeのアドレスバー色
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
