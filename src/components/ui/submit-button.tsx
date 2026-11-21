"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import { Button } from "./button";

/** Pulsante di invio che mostra lo stato di caricamento del modulo. */
export function SubmitButton({
  children,
  pendingText,
  ...props
}: Omit<ComponentProps<typeof Button>, "type" | "loading"> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} {...props}>
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
