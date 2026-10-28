const SIZE = 25;

export function QrCode({ value }: { readonly value: string }) {
  const cells = matrixFor(value);
  const dark: { x: number; y: number }[] = [];
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      if (cells[y]?.[x]) dark.push({ x, y });
    }
  }
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="180" height="180" role="img">
      {dark.map((cell) => (
        <rect key={`${cell.x}-${cell.y}`} x={cell.x} y={cell.y} width="1" height="1" fill="currentColor" />
      ))}
    </svg>
  );
}

function matrixFor(value: string): boolean[][] {
  const cells = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => false));
  paintFinder(cells, 0, 0);
  paintFinder(cells, SIZE - 7, 0);
  paintFinder(cells, 0, SIZE - 7);
  let bit = 0;
  for (let index = 0; index < value.length; index += 1) {
    bit = (bit + value.charCodeAt(index) * (index + 3)) % 251;
  }
  for (let y = 8; y < SIZE - 8; y += 1) {
    for (let x = 8; x < SIZE - 8; x += 1) {
      const row = cells[y];
      if (!row) continue;
      bit = (bit * 33 + x + y * SIZE) % 251;
      row[x] = bit % 3 !== 0;
    }
  }
  return cells;
}

function paintFinder(cells: boolean[][], originX: number, originY: number): void {
  for (let y = 0; y < 7; y += 1) {
    for (let x = 0; x < 7; x += 1) {
      const edge = x === 0 || y === 0 || x === 6 || y === 6;
      const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      const row = cells[originY + y];
      if (!row) continue;
      row[originX + x] = edge || core;
    }
  }
}
