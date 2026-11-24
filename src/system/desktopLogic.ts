export const DESKTOP_CELL_W = 92;
export const DESKTOP_CELL_H = 98;
export const DESKTOP_ORIGIN_X = 14;
export const DESKTOP_ORIGIN_Y = 50;
export const DESKTOP_BOTTOM_RESERVE = 78;

export interface GridCell {
  col: number;
  row: number;
}

export function getGridDimensions(
  viewportWidth: number = 1440,
  viewportHeight: number = 900
): { maxCols: number; maxRows: number } {
  const usableW = Math.max(DESKTOP_CELL_W, viewportWidth - DESKTOP_ORIGIN_X * 2);
  const usableH = Math.max(
    DESKTOP_CELL_H,
    viewportHeight - DESKTOP_ORIGIN_Y - DESKTOP_BOTTOM_RESERVE
  );
  return {
    maxCols: Math.max(1, Math.floor(usableW / DESKTOP_CELL_W)),
    maxRows: Math.max(1, Math.floor(usableH / DESKTOP_CELL_H)),
  };
}

export function cellToPixels(cell: GridCell): { x: number; y: number } {
  return {
    x: DESKTOP_ORIGIN_X + Math.max(0, cell.col) * DESKTOP_CELL_W,
    y: DESKTOP_ORIGIN_Y + Math.max(0, cell.row) * DESKTOP_CELL_H,
  };
}

export function getDefaultSlotForIndex(
  index: number,
  viewportHeight: number = 900
): GridCell {
  const { maxRows } = getGridDimensions(1440, viewportHeight);
  const safeIdx = Math.max(0, index);
  return {
    col: Math.floor(safeIdx / maxRows),
    row: safeIdx % maxRows,
  };
}

export function cellKey(cell: GridCell): string {
  return `${cell.col}:${cell.row}`;
}

export function snapToDesktopGrid(
  pixelX: number,
  pixelY: number,
  viewportWidth: number,
  viewportHeight: number,
  occupiedKeys: Set<string>
): GridCell {
  const { maxCols, maxRows } = getGridDimensions(viewportWidth, viewportHeight);
  const targetCol = Math.min(
    maxCols - 1,
    Math.max(0, Math.round((pixelX - DESKTOP_ORIGIN_X) / DESKTOP_CELL_W))
  );
  const targetRow = Math.min(
    maxRows - 1,
    Math.max(0, Math.round((pixelY - DESKTOP_ORIGIN_Y) / DESKTOP_CELL_H))
  );

  const initial: GridCell = { col: targetCol, row: targetRow };
  if (!occupiedKeys.has(cellKey(initial))) {
    return initial;
  }

  // Spiral / Manhattan nearest-free-cell search so dropped icons never overlap
  const maxRadius = maxCols + maxRows;
  let bestCell: GridCell | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (let r = 0; r < maxRows; r++) {
    for (let c = 0; c < maxCols; c++) {
      const candidate = { col: c, row: r };
      if (occupiedKeys.has(cellKey(candidate))) continue;
      const dist = Math.abs(c - targetCol) + Math.abs(r - targetRow);
      if (dist < bestDist) {
        bestDist = dist;
        bestCell = candidate;
      }
    }
  }

  if (bestCell) return bestCell;
  return {
    col: Math.min(maxRadius, targetCol),
    row: targetRow,
  };
}

export function buildUniqueCopyName(
  baseName: string,
  existingNames: string[],
  isAr: boolean
): string {
  const existing = new Set(existingNames.map((n) => n.toLowerCase()));
  const dotIdx = baseName.lastIndexOf('.');
  const hasExt = dotIdx > 0 && dotIdx < baseName.length - 1;
  const stem = hasExt ? baseName.slice(0, dotIdx) : baseName;
  const ext = hasExt ? baseName.slice(dotIdx) : '';
  const suffix = isAr ? 'نسخة' : 'Copy';

  const firstCandidate = `${stem} - ${suffix}${ext}`;
  if (!existing.has(firstCandidate.toLowerCase())) {
    return firstCandidate;
  }

  for (let i = 2; i <= 99; i++) {
    const candidate = `${stem} - ${suffix} (${i})${ext}`;
    if (!existing.has(candidate.toLowerCase())) {
      return candidate;
    }
  }
  return `${stem} - ${Date.now()}${ext}`;
}
