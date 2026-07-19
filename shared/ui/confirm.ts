"use client";

import type { CSSProperties } from "react";
import { toast as sonnerToast } from "sonner";

type ConfirmOptions = {
  title: string;
  message: string;
  okText?: string;
  cancelText?: string;
  variant?: "default" | "danger";
};

export async function confirm({
  title,
  message,
  okText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
}: ConfirmOptions): Promise<boolean> {
  if (typeof window === "undefined") return false;

  return await new Promise<boolean>((resolve) => {
    let settled = false;
    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const inferredDanger =
      variant === "danger" || /eliminar/i.test(title) || /eliminar/i.test(okText);

    const actionButtonStyle: CSSProperties = inferredDanger
      ? {
          minHeight: 40,
          padding: "0 14px",
          borderRadius: 12,
          border: "1px solid rgba(220, 38, 38, 0.35)",
          background: "rgba(220, 38, 38, 0.12)",
          color: "#b91c1c",
          fontWeight: 700,
          cursor: "pointer",
        }
      : {
          minHeight: 40,
          padding: "0 14px",
          borderRadius: 12,
          border: "1px solid rgba(37, 99, 235, 0.2)",
          background: "#2563eb",
          color: "#ffffff",
          fontWeight: 700,
          cursor: "pointer",
        };

    const cancelButtonStyle: CSSProperties = {
      minHeight: 40,
      padding: "0 14px",
      borderRadius: 12,
      border: "1px solid #dbe1ea",
      background: "#ffffff",
      color: "#0f172a",
      fontWeight: 700,
      cursor: "pointer",
    };

    const toastId = sonnerToast(title, {
      description: message,
      position: "top-center",
      duration: Number.POSITIVE_INFINITY,
      closeButton: false,
      dismissible: true,
      action: {
        label: okText,
        onClick: () => {
          settle(true);
          sonnerToast.dismiss(toastId);
        },
      },
      cancel: {
        label: cancelText,
        onClick: () => {
          settle(false);
          sonnerToast.dismiss(toastId);
        },
      },
      actionButtonStyle,
      cancelButtonStyle,
      style: {
        width: "min(92vw, 420px)",
        borderRadius: 18,
        border: inferredDanger
          ? "1px solid rgba(220, 38, 38, 0.18)"
          : "1px solid rgba(37, 99, 235, 0.12)",
        background: "#ffffff",
        boxShadow: "0 18px 48px rgba(15, 23, 42, 0.14)",
      },
      onDismiss: () => {
        settle(false);
      },
      onAutoClose: () => {
        settle(false);
      },
    });
  });
}
