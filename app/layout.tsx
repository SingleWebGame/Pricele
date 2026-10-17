import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = "https://pricele.game";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Pricele — How well do you know what things cost?",
    template: "%s | Pricele",
  },
  description:
    "Five products. Five guesses. One daily challenge for your price intuition. Play Pricele free and see how close you can get.",
  applicationName: "Pricele",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  keywords: ["Pricele", "daily game", "price guessing game", "trivia", "daily challenge"],
  openGraph: {
    title: "Pricele — The daily price guessing game",
    description: "Five products. Five guesses. How close can you get?",
    url: siteUrl,
    siteName: "Pricele",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Pricele daily price guessing game" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricele — The daily price guessing game",
    description: "Five products. Five guesses. How close can you get?",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0b1016",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Pricele",
    url: siteUrl,
    description: "A daily price guessing game. Five products, five guesses, one score.",
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
        {children}
      </body>
    </html>
  );
}
