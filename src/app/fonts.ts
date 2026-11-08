import localFont from "next/font/local";

// Bitter: a sturdy slab, like the stencil on a jute sack and the figures in a buying book.
export const latin = localFont({
  src: [
    { path: "./fonts/bitter-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/bitter-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/bitter-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-latin",
  display: "swap",
});

// Noto Sans Ethiopic for Amharic (Ge'ez script). Latin glyphs fall through to Bitter first.
export const ethiopic = localFont({
  src: [
    { path: "./fonts/noto-sans-ethiopic-ethiopic-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/noto-sans-ethiopic-ethiopic-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-ethiopic",
  display: "swap",
  preload: false,
});
