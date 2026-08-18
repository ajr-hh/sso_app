import type { Metadata } from "next";
import { Darker_Grotesque } from "next/font/google";
import "./globals.css";

const darkerGrotesque = Darker_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Humanaut SOS",
  description: "In-the-moment support for members working toward their health goals.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${darkerGrotesque.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-canvas text-ink">{children}</body>
    </html>
  );
}
