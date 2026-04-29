export type ColombiaPayrollDeductions = {
  base: number;
  health: number;
  pension: number;
  total: number;
  net: number;
};

function roundPeso(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

export function computeColombiaPayrollDeductions(gross: number): ColombiaPayrollDeductions {
  const base = Math.max(0, gross);
  const health = roundPeso(base * 0.04);
  const pension = roundPeso(base * 0.04);
  const total = roundPeso(health + pension);
  const net = roundPeso(base - total);
  return { base: roundPeso(base), health, pension, total, net };
}

