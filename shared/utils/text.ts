export function normalizeUpper(input: string) {
  return input.trim().replace(/\s+/g, " ").toLocaleUpperCase("es-CO");
}

