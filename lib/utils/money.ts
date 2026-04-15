const SYMBOL = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL ?? process.env.CURRENCY_SYMBOL ?? "DT";

export function formatMoney(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? parseFloat(value) : value ?? 0;
  if (!Number.isFinite(n)) return `0.000 ${SYMBOL}`;
  return `${n.toFixed(3)} ${SYMBOL}`;
}
