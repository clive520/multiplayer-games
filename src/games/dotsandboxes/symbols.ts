export function formatDotsAndBoxesSymbol(symbol: string): string {
  if (symbol === 'X') return '藍線';
  if (symbol === 'O') return '紅線';
  return symbol;
}
