import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { DesktopUpdateProvider } from "@/components/providers/DesktopUpdateProvider";
import FloatingTaskButton from "@/components/navigation/FloatingTaskButton";
import { Toaster } from "@/components/ui/toaster";
import { NextAuthProvider } from "@/providers/auth-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Imagine This - AI 图像处理平台",
  description: "专业的 AI 图像处理平台，支持背景替换、图像扩展、高清化等功能。",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <NextAuthProvider>
          <DesktopUpdateProvider>
            {children}
            <FloatingTaskButton />
            <Toaster />
          </DesktopUpdateProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
