import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "番时表｜新番日历",
  description: "按北京时间查看收录番剧的首播、集数与周播时间。",
};

// 首屏前同步确定主题：手动选择（localStorage）优先，否则跟随系统；
// 结果写入 <html data-theme>，CSS 据此切换 token，避免暗色用户看到亮色闪屏。
const themeInitScript = `(function(){try{var s=localStorage.getItem("ac-theme");var t=s==="light"||s==="dark"?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="light";}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
      </body>
    </html>
  );
}
