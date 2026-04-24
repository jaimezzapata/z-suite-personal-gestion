export function normalizeHex(value: string) {
  const v = value.trim();
  if (!v) return "";
  const next = v.startsWith("#") ? v : `#${v}`;
  return next.toUpperCase();
}

export function isValidHex(value: string) {
  const v = value.trim();
  return /^#([0-9A-F]{3}|[0-9A-F]{6})$/.test(v.toUpperCase());
}

function hexToRgb(hex: string) {
  const h = normalizeHex(hex);
  if (!isValidHex(h)) return null;
  const raw = h.slice(1);
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => `${c}${c}`)
          .join("")
      : raw;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return { r, g, b };
}

function srgbToLinear(value: number) {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function isDarkHex(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 0.5;
}

