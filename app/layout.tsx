import type { Metadata } from "next";
import "./globals.css";
import { PostHogProvider } from "./providers";
import PageView from "./PageView";

export const metadata: Metadata = {
  title: "GreenVac Services — Professional Cleaning",
  description:
    "GreenVac Services offers eco-friendly residential and commercial cleaning solutions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <PostHogProvider>
          <PageView />
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
