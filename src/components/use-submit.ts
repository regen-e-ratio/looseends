"use client";

import { useTransition, type FormEvent } from "react";

/**
 * Submits a form to a server action without React's automatic form reset (which also happens when the
 * server returns a validation error, wiping what the person typed).
 */
export function useSubmitWithoutReset(dispatch: (data: FormData) => void) {
  const [, start] = useTransition();
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    start(() => dispatch(data));
  };
}
