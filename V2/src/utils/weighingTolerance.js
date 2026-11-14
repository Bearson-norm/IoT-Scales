/**
 * ESM helpers for weighing tolerance (mirrors shared/weighingTolerance.js).
 */

function parseNum(value) {
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : null
}

export function findBandForTarget(bands, targetMass) {
  const target = parseNum(targetMass)
  if (target === null || target < 0) return null
  if (!bands || !bands.length) return null

  const sorted = [...bands].sort((a, b) => {
    const sa = parseNum(a.sort_order) ?? 0
    const sb = parseNum(b.sort_order) ?? 0
    if (sa !== sb) return sa - sb
    return (parseNum(a.target_qty_min) ?? 0) - (parseNum(b.target_qty_min) ?? 0)
  })

  for (const band of sorted) {
    const min = parseNum(band.target_qty_min)
    const max = parseNum(band.target_qty_max)
    if (min === null || max === null) continue
    if (target >= min && target <= max) return band
  }
  return null
}

export function computeSymmetricBounds(targetMass, toleranceQty) {
  const target = parseNum(targetMass) ?? 0
  const tol = Math.max(0, parseNum(toleranceQty) ?? 0)
  return {
    min: Math.max(0, target - tol),
    max: target + tol
  }
}

export function validateBandsNoOverlap(bands) {
  if (!bands || !bands.length) {
    return { valid: false, error: 'At least one band is required' }
  }
  const normalized = bands.map((b, i) => ({
    min: parseNum(b.target_qty_min),
    max: parseNum(b.target_qty_max),
    tol: parseNum(b.tolerance_qty),
    index: i
  }))
  for (const row of normalized) {
    if (row.min === null || row.max === null || row.tol === null) {
      return { valid: false, error: 'All bands must have numeric min, max, and tolerance' }
    }
    if (row.min > row.max) {
      return { valid: false, error: `Band ${row.index + 1}: min cannot exceed max` }
    }
    if (row.tol < 0) {
      return { valid: false, error: `Band ${row.index + 1}: tolerance cannot be negative` }
    }
  }
  const sorted = [...normalized].sort((a, b) => a.min - b.min)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].min <= sorted[i - 1].max) {
      return {
        valid: false,
        error: `Bands overlap: [${sorted[i - 1].min}-${sorted[i - 1].max}] and [${sorted[i].min}-${sorted[i].max}]`
      }
    }
  }
  return { valid: true }
}

export function getIngredientToleranceBounds(ingredient) {
  if (!ingredient) return { min: null, max: null, valid: false }

  const minRaw =
    ingredient.toleranceMin !== undefined && ingredient.toleranceMin !== null
      ? parseNum(ingredient.toleranceMin)
      : ingredient.tolerance_min !== undefined && ingredient.tolerance_min !== null
        ? parseNum(ingredient.tolerance_min)
        : null
  const maxRaw =
    ingredient.toleranceMax !== undefined && ingredient.toleranceMax !== null
      ? parseNum(ingredient.toleranceMax)
      : ingredient.tolerance_max !== undefined && ingredient.tolerance_max !== null
        ? parseNum(ingredient.tolerance_max)
        : null

  const valid = minRaw !== null && maxRaw !== null && maxRaw > minRaw

  return {
    min: valid ? minRaw : null,
    max: valid ? maxRaw : null,
    valid
  }
}

export function getToleranceRangeFromIngredient(ingredient) {
  const { min, max, valid } = getIngredientToleranceBounds(ingredient)
  return {
    toleranceMin: min,
    toleranceMax: max,
    hasValidTolerance: valid
  }
}
