import type { Metadata, Viewport } from "next";
import { Newsreader, Public_Sans } from "next/font/google";
import { hero } from "@/content/landing";
import { images } from "@/content/images";
import { site } from "@/lib/site";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

const description = hero.intro[0];

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.shortName}: 26 Weeks to Learn. Build. Innovate.`,
    template: `%s | ${site.shortName}`,
  },
  description,
  applicationName: site.shortName,
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: site.name,
    title: site.name,
    description,
    images: [
      {
        url: images.campusGate.src,
        width: images.campusGate.width,
        height: images.campusGate.height,
        alt: images.campusGate.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: site.name,
    description,
    images: [images.campusGate.src],
  },
};

export const viewport: Viewport = {
  themeColor: "#f5f1e8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${newsreader.variable} ${publicSans.variable} antialiased`}>
      <body className="min-h-dvh bg-paper text-ink">{children}</body>
    </html>
  );
}
