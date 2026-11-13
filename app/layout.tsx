import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "蘑菇搭档 · 两个人，一起过关",
  description: "两部手机免登录完成四关冒险，从草地一路合作挑战到Boss，解锁合作成就，在本机手账记录最好成绩。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {width:"device-width",initialScale:1,viewportFit:"cover"};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
