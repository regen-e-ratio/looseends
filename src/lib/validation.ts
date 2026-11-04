import { z } from "zod";

/** A name: control characters and line breaks collapsed to single spaces (names end up in email subjects). */
export function oneLineName(message = "Please enter a name.", max = 120) {
  return z
    .string()
    .transform((s) => s.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim())
    .pipe(z.string().min(1, message).max(max));
}
