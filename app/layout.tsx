import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "番时表｜新番日历",
  description: "按北京时间查看收录番剧的首播、集数与周播时间。",
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
