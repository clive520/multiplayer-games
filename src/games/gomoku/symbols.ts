export function formatGomokuSymbol(symbol: string): string {
  if (symbol === 'X') return '黑棋';
  if (symbol === 'O') return '白棋';
  return symbol;
}
