"use client";

import { toast as sonnerToast } from "sonner";

type ToastKind = "success" | "error" | "info" | "warning";

type ToastOptions = {
  title?: string;
  message: string;
};

function show(kind: ToastKind, { title, message }: ToastOptions) {
  const content = title ?? message;
  const description = title ? message : undefined;
  const options = {
    description,
    duration: 3500,
    closeButton: true,
  };

  switch (kind) {
    case "success":
      sonnerToast.success(content, options);
      break;
    case "error":
      sonnerToast.error(content, options);
      break;
    case "info":
      sonnerToast.info(content, options);
      break;
    case "warning":
      sonnerToast.warning(content, options);
      break;
  }
}

export const toast = {
  success: (opts: ToastOptions) => show("success", opts),
  error: (opts: ToastOptions) => show("error", opts),
  info: (opts: ToastOptions) => show("info", opts),
  warning: (opts: ToastOptions) => show("warning", opts),
};
