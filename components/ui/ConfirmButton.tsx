"use client";

import { useState } from "react";
import { Button } from "./Button";
import type { ComponentProps } from "react";

type ButtonVariant = ComponentProps<typeof Button>["variant"];
type ButtonSize    = ComponentProps<typeof Button>["size"];

type Props = {
  onConfirm: () => Promise<void>;
  confirmMessage: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
};

export function ConfirmButton({
  onConfirm,
  confirmMessage,
  variant = "danger",
  size = "sm",
  children,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!window.confirm(confirmMessage)) return;
    setLoading(true);
    await onConfirm();
    setLoading(false);
  }

  return (
    <Button variant={variant} size={size} loading={loading} onClick={handleClick}>
      {children}
    </Button>
  );
}
