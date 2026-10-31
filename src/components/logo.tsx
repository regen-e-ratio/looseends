import Link from "next/link";
import { APP_NAME } from "@/lib/config";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold tracking-tight text-stone-900">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-700 text-white">✦</span>
      <span>{APP_NAME}</span>
    </Link>
  );
}
