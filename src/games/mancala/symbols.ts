export function formatMancalaSymbol(symbol: string): string {
  if (symbol === 'X') return '上排';
  if (symbol === 'O') return '下排';
  return symbol;
}
