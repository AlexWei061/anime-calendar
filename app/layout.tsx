import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "番时表｜2026 夏番",
  description: "按 YUC 排期查看 2026 年夏季动画的首播、集数与周播时间。",
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
