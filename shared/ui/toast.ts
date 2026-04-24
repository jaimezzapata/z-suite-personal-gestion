"use client";

type ToastKind = "success" | "error" | "info" | "warning";

type ToastOptions = {
  title?: string;
  message: string;
};

let loadPromise: Promise<unknown> | null = null;

async function getIziToast(): Promise<Record<string, unknown> | null> {
  if (typeof window === "undefined") return null;
  if (!loadPromise) {
    loadPromise = import("izitoast").then((m) => (m as any).default ?? m);
  }
  return (await loadPromise) as Record<string, unknown>;
}

function show(kind: ToastKind, { title, message }: ToastOptions) {
  void getIziToast().then((iziToast) => {
    if (!iziToast) return;
    const fn = iziToast[kind] as unknown as (opts: Record<string, unknown>) => void;
    fn({
      title,
      message,
      position: "topRight",
      timeout: 3500,
      closeOnEscape: true,
      closeOnClick: true,
      pauseOnHover: true,
      progressBar: true,
    });
  });
}

export const toast = {
  success: (opts: ToastOptions) => show("success", opts),
  error: (opts: ToastOptions) => show("error", opts),
  info: (opts: ToastOptions) => show("info", opts),
  warning: (opts: ToastOptions) => show("warning", opts),
};
