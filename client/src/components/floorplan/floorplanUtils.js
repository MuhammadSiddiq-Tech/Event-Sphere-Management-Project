/**
 * @fileoverview Floor Plan Geometric, Overlap, and Layout Utilities.
 * T-3.13. FR-EXPO-03, FR-EXPO-04.
 */

export const BOOTH_SIZE_PRESETS = {
  small: { w: 2, h: 2, defaultPrice: 150, label: 'Small (2×2m)' },
  medium: { w: 3, h: 2, defaultPrice: 250, label: 'Medium (3×2m)' },
  large: { w: 4, h: 3, defaultPrice: 400, label: 'Large (4×3m)' },
};

/**
 * Check if two rectangles overlap on the 2D grid.
 * Two boxes intersect if neither is strictly to the left, right, above, or below the other.
 * @param {{ x: number, y: number, w: number, h: number }} g1
 * @param {{ x: number, y: number, w: number, h: number }} g2
 * @returns {boolean}
 */
export function checkRectsOverlap(g1, g2) {
  if (!g1 || !g2) return false;
  return !(
    g1.x + g1.w <= g2.x ||
    g2.x + g2.w <= g1.x ||
    g1.y + g1.h <= g2.y ||
    g2.y + g2.h <= g1.y
  );
}

/**
 * Check if two booths overlap based on their geometry.
 * @param {Object} b1
 * @param {Object} b2
 * @returns {boolean}
 */
export function checkBoothsOverlap(b1, b2) {
  return checkRectsOverlap(b1.geometry, b2.geometry);
}

/**
 * Returns a Set of booth identifiers that overlap with at least one other booth.
 * Uses `booth.id || booth._id || booth.code` as the unique identifier.
 * @param {Array<Object>} booths
 * @returns {Set<string>}
 */
export function findOverlappingBoothIds(booths = []) {
  const overlapping = new Set();

  for (let i = 0; i < booths.length; i++) {
    for (let j = i + 1; j < booths.length; j++) {
      if (checkBoothsOverlap(booths[i], booths[j])) {
        const id1 = booths[i].id || booths[i]._id || booths[i].code;
        const id2 = booths[j].id || booths[j]._id || booths[j].code;
        overlapping.add(id1);
        overlapping.add(id2);
      }
    }
  }

  return overlapping;
}

/**
 * Returns an array of overlapping pairs for detailed error messages.
 * @param {Array<Object>} booths
 * @returns {Array<{ booth1: Object, booth2: Object }>}
 */
export function findOverlappingPairs(booths = []) {
  const pairs = [];
  for (let i = 0; i < booths.length; i++) {
    for (let j = i + 1; j < booths.length; j++) {
      if (checkBoothsOverlap(booths[i], booths[j])) {
        pairs.push({ booth1: booths[i], booth2: booths[j] });
      }
    }
  }
  return pairs;
}

/**
 * Finds duplicate booth codes (case-insensitive).
 * @param {Array<Object>} booths
 * @returns {Set<string>} Set of uppercase codes that appear more than once
 */
export function findDuplicateCodes(booths = []) {
  const seen = new Set();
  const duplicates = new Set();

  for (const b of booths) {
    const code = (b.code || '').trim().toUpperCase();
    if (!code) continue;
    if (seen.has(code)) {
      duplicates.add(code);
    } else {
      seen.add(code);
    }
  }

  return duplicates;
}

/**
 * Generate the next sequential booth code (e.g., 'B-01', 'B-02', etc.).
 * @param {Array<Object>} booths
 * @param {string} [prefix='B-']
 * @returns {string}
 */
export function generateNextBoothCode(booths = [], prefix = 'B-') {
  const existingCodes = new Set(booths.map((b) => (b.code || '').trim().toUpperCase()));
  let highestNum = 0;

  for (const b of booths) {
    const code = (b.code || '').trim().toUpperCase();
    const match = code.match(new RegExp(`^${prefix}(\\d+)$`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > highestNum) highestNum = num;
    }
  }

  let nextNum = highestNum + 1;
  let candidate = `${prefix}${String(nextNum).padStart(2, '0')}`;
  while (existingCodes.has(candidate)) {
    nextNum += 1;
    candidate = `${prefix}${String(nextNum).padStart(2, '0')}`;
  }

  return candidate;
}

/**
 * Snaps a pixel coordinate to grid integer units.
 * @param {number} pixelVal
 * @param {number} gridSize
 * @param {number} [min=0]
 * @returns {number}
 */
export function snapToGrid(pixelVal, gridSize, min = 0) {
  return Math.max(min, Math.round(pixelVal / gridSize));
}

/**
 * Finds the first available non-overlapping grid position for a new booth of size (w, h).
 * @param {Array<Object>} booths
 * @param {number} w
 * @param {number} h
 * @param {number} [maxCols=16]
 * @param {number} [maxRows=12]
 * @returns {{ x: number, y: number }}
 */
export function findAvailablePosition(booths = [], w = 2, h = 2, maxCols = 16, maxRows = 12) {
  for (let y = 1; y < maxRows; y += 1) {
    for (let x = 1; x < maxCols; x += 1) {
      const candidateGeom = { x, y, w, h };
      const hasConflict = booths.some((b) => checkRectsOverlap(candidateGeom, b.geometry));
      if (!hasConflict) {
        return { x, y };
      }
    }
  }

  // If no spot inside defaults, place at bottom with spacing
  let maxY = 0;
  booths.forEach((b) => {
    if (b.geometry && b.geometry.y + b.geometry.h > maxY) {
      maxY = b.geometry.y + b.geometry.h;
    }
  });

  return { x: 1, y: maxY + 1 };
}
