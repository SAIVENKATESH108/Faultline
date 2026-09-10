import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import Providers from "./providers";
import "./globals.css";

// ── Fonts ─────────────────────────────────────────────────────────────────────
// IBM Plex Sans — body text, labels, captions, headings
const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// IBM Plex Mono — code blocks, node IDs, technical telemetry
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

// ── Viewport Specification (Mobile Optimization) ──────────────────────────────
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
};

// ── Comprehensive SEO Metadata ────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL("https://faultline.dev"),
  title: {
    default: "Faultline | Adaptive Cognitive Compiler & Misconception Diagnostics",
    template: "%s | Faultline",
  },
  description:
    "Debug the mind, not just the syntax. Faultline diagnoses programming misconceptions before they become compiler bugs with geological concept strata, native multi-language toolchains (C, C++, Python, Node.js, Java), interactive stdin, and surgical AI-guided line repairs.",
  keywords: [
    "faultline",
    "cognitive compiler",
    "programming misconceptions",
    "code diagnosis",
    "adaptive learning",
    "concept strata",
    "gemini 3.5",
    "c compiler",
    "python compiler",
    "pointer arithmetic",
    "surgical code repair",
    "developer education",
    "mental models",
    "interactive terminal",
    "online compiler",
    "gcc online",
    "data structures",
    "algorithmic thinking"
  ],
  authors: [{ name: "Faultline Core Team", url: "https://faultline.dev" }],
  creator: "Faultline",
  publisher: "Faultline",
  applicationName: "Faultline Cognitive Compiler",
  category: "Developer Tools & Education",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Faultline | Adaptive Cognitive Compiler & Misconception Diagnostics",
    description:
      "Stop fixing syntax errors. Debug your mental model with geological concept strata, native multi-language compilers, interactive stdin, and surgical AI Code Doctor.",
    url: "https://faultline.dev",
    siteName: "Faultline",
    images: [
      {
        url: "/showcase/strata-bst-dark.png",
        width: 1200,
        height: 630,
        alt: "Faultline Cognitive Strata Explorer & Diagnostic Probes",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Faultline | Adaptive Cognitive Compiler",
    description:
      "Diagnose programming misconceptions with geological concept strata, native GCC/Python compilation, and surgical AI Code Doctor.",
    images: ["/showcase/strata-bst-dark.png"],
    creator: "@faultline_dev",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

// ── Root layout ───────────────────────────────────────────────────────────────
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" sizes="any" />
        {/* Structured Data: JSON-LD for Google Rich Results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Faultline",
              "applicationCategory": "DeveloperApplication",
              "operatingSystem": "Any",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "description":
                "Adaptive cognitive compiler and misconception diagnosis engine for programmers with geological concept strata, native toolchains, and surgical AI Code Doctor.",
              "featureList": [
                "Geological Concept Strata",
                "Adaptive Diagnostic Questions",
                "Native C, C++, Python, Node.js, and Java Execution",
                "Interactive Standard Input (stdin)",
                "Surgical Line-Targeted Code Repairs",
                "Misconception Codex Encyclopedia"
              ]
            })
          }}
        />
        {/* Anti-FOUC script: set data-theme before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('faultline-theme') || localStorage.getItem('prometheus-theme');
                  var pref = saved ? saved : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
                  document.documentElement.setAttribute('data-theme', pref);
                } catch(e) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
