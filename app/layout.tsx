import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "番时表｜2026 夏番",
  description: "按北京时间查看 2026 年 7 月日本 TV 动画的最早首播。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
