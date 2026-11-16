import type { Metadata } from "next";
import type { ReactNode } from "react";

import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Conduit",
  description: "RealWorld 全栈示例：FastAPI + Next.js",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
