"use client";

type ConfirmOptions = {
  title: string;
  message: string;
  okText?: string;
  cancelText?: string;
  variant?: "default" | "danger";
};

let loadPromise: Promise<any> | null = null;

async function getIziToast(): Promise<any | null> {
  if (typeof window === "undefined") return null;
  if (!loadPromise) {
    loadPromise = import("izitoast").then((m) => (m as any).default ?? m);
  }
  return await loadPromise;
}

export async function confirm({
  title,
  message,
  okText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
}: ConfirmOptions): Promise<boolean> {
  const iziToast = await getIziToast();
  if (!iziToast) return false;

  return await new Promise<boolean>((resolve) => {
    let settled = false;
    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    console.groupCollapsed("[confirm]", title);
    console.log({ title, message, okText, cancelText, variant });
    console.groupEnd();

    const inferredDanger =
      variant === "danger" || /eliminar/i.test(title) || /eliminar/i.test(okText);

    const okStyle = inferredDanger
      ? [
          "height:44px",
          "padding:0 16px",
          "border-radius:16px",
          "border:1px solid rgba(220,38,38,0.35)",
          "background:rgba(220,38,38,0.12)",
          "color:#b91c1c",
          "font-weight:900",
          "font-size:14px",
          "display:inline-flex",
          "align-items:center",
          "justify-content:center",
          "cursor:pointer",
        ].join(";")
      : [
          "height:44px",
          "padding:0 16px",
          "border-radius:16px",
          "border:1px solid rgba(107,124,255,0.35)",
          "background:#6b7cff",
          "color:#ffffff",
          "font-weight:900",
          "font-size:14px",
          "display:inline-flex",
          "align-items:center",
          "justify-content:center",
          "cursor:pointer",
        ].join(";");

    const cancelStyle = [
      "height:44px",
      "padding:0 16px",
      "border-radius:16px",
      "border:1px solid #e8eaf6",
      "background:#f6f7ff",
      "color:#111827",
      "font-weight:900",
      "font-size:14px",
      "display:inline-flex",
      "align-items:center",
      "justify-content:center",
      "cursor:pointer",
    ].join(";");

    iziToast.show({
      title,
      message,
      position: "center",
      timeout: false,
      close: false,
      overlay: true,
      overlayClose: true,
      drag: false,
      backgroundColor: "#ffffff",
      progressBar: false,
      padding: 16,
      radius: 20,
      buttons: [
        [
          `<button type="button" style="${okStyle}">${okText}</button>`,
          (instance: any, toast: any) => {
            console.log("[confirm] ok click", { title });
            settle(true);
            instance.hide({ transitionOut: "fadeOut" }, toast, "button");
          },
          true,
        ],
        [
          `<button type="button" style="${cancelStyle}">${cancelText}</button>`,
          (instance: any, toast: any) => {
            console.log("[confirm] cancel click", { title });
            settle(false);
            instance.hide({ transitionOut: "fadeOut" }, toast, "button");
          },
          false,
        ],
      ],
      onClosing: () => {
        console.log("[confirm] closing", { title });
        settle(false);
      },
    });
  });
}
