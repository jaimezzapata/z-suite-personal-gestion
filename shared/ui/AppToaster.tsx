"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      theme="light"
      position="top-right"
      richColors
      closeButton
      expand={false}
      visibleToasts={5}
      toastOptions={{
        duration: 3500,
        style: {
          borderRadius: 18,
          border: "1px solid rgba(148, 163, 184, 0.18)",
          background: "#ffffff",
          color: "#0f172a",
          boxShadow: "0 18px 48px rgba(15, 23, 42, 0.12)",
        },
      }}
    />
  );
}
