import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "番时表｜2026 年新番",
  description: "按北京时间查看 2026 年 1 月、4 月和 7 月番的首播、集数与周播时间。",
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
