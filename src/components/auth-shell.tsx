import type { ReactNode } from "react";
import { Logo } from "./logo";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center px-4 py-12">
      <Logo />
      <div className="mt-8 w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">{children}</div>
    </div>
  );
}
