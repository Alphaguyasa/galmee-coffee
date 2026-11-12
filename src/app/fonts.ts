import localFont from "next/font/local";

// Atkinson Hyperlegible Next: built for legibility (I/l/1, 0/O are distinct),
// which matters on farmer names, kilos and amounts read in sunlight.
export const latin = localFont({
  src: [
    { path: "./fonts/atkinson-hyperlegible-next-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/atkinson-hyperlegible-next-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-latin",
  display: "swap",
});

// Noto Sans Ethiopic for Amharic (Ge'ez script). Latin glyphs fall through to Atkinson first.
export const ethiopic = localFont({
  src: [
    { path: "./fonts/noto-sans-ethiopic-ethiopic-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/noto-sans-ethiopic-ethiopic-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-ethiopic",
  display: "swap",
  preload: false,
});
