"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import { Button } from "./ui";

export function SubmitButton({
  children,
  pendingText,
  confirm,
  pending: pendingOverride,
  disabled,
  ...props
}: ComponentProps<typeof Button> & { pendingText?: string; confirm?: string; pending?: boolean }) {
  const status = useFormStatus();
  // Forms submitted via useSubmitWithoutReset aren't tracked by useFormStatus, so they pass `pending`.
  const pending = pendingOverride ?? status.pending;
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      {...props}
    >
      {pending ? (pendingText ?? "Saving…") : children}
    </Button>
  );
}
