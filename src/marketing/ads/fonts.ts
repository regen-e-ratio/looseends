import { Caveat, Fraunces, JetBrains_Mono, Space_Grotesk } from "next/font/google";

/** Warm serif — older audiences. */
export const fraunces = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], display: "swap" });
/** Handwriting — letters. */
export const caveat = Caveat({ subsets: ["latin"], weight: ["500", "700"], display: "swap" });
/** Modern geometric sans — fintech / investors. */
export const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "700"], display: "swap" });
/** Monospace — crypto. */
export const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "700", "800"], display: "swap" });
