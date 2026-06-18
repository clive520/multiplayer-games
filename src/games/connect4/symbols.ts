export function formatConnect4Symbol(symbol: string): string {
  if (symbol === 'X') return '紅棋';
  if (symbol === 'O') return '黃棋';
  return symbol;
}
