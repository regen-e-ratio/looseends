import assert from "node:assert/strict";
import { redactUrl } from "./analytics";
const B = "https://www.looseends.life";
const cases: [string, string][] = [
  [`${B}/access/AbC_def-123xyz`, `${B}/access/[token]`],
  [`${B}/check-in?u=8b1f0e3e-1111-4222-8333-944445555666&t=secret`, `${B}/check-in`],
  [`${B}/auth/verify?token=secret`, `${B}/auth/verify`],
  [`${B}/items/8b1f0e3e-1111-4222-8333-944445555666`, `${B}/items/[id]`],
  [`${B}/preview/8b1f0e3e-1111-4222-8333-944445555666`, `${B}/preview/[id]`],
  [`${B}/login?from=crypto&utm_source=meta&fbclid=x&email=a@b.c`, `${B}/login?from=crypto&utm_source=meta`],
  [`${B}/for/family?utm_campaign=nov#how`, `${B}/for/family?utm_campaign=nov`],
  [`${B}/dashboard?saved=1`, `${B}/dashboard`],
];
for (const [input, expected] of cases) assert.equal(redactUrl(input), expected, input);
console.log(`redactUrl: ${cases.length} cases ok`);
