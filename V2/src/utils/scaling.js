/**
 * Formulation scaling helpers — per 1000g batch vs per unit (PCS/botol).
 */

export const SCALING_MODE_PER_1000G = 'per_1000g'
export const SCALING_MODE_PER_UNIT = 'per_unit'

export function getScalingBaseQuantity(scalingMode, totalMass) {
  if (scalingMode === SCALING_MODE_PER_UNIT) {
    const base = parseFloat(totalMass)
    return base > 0 ? base : 1
  }
  return 1000
}

/**
 * @param {object} params
 * @param {string} params.scalingMode
 * @param {number} params.totalMass - gram per 1 unit (per_unit) or sum per 1000g base
 * @param {number} params.inputQuantity - PCS (per_unit) or grams (per_1000g)
 */
export function computeMoScaling({ scalingMode, totalMass, inputQuantity }) {
  const qty = parseFloat(inputQuantity) || 0
  const baseQuantity = getScalingBaseQuantity(scalingMode, totalMass)

  if (scalingMode === SCALING_MODE_PER_UNIT) {
    const units = qty
    const plannedQuantityGrams = units * baseQuantity
    const scalingFactor = baseQuantity > 0 ? plannedQuantityGrams / baseQuantity : units
    return {
      baseQuantity,
      scalingFactor,
      plannedQuantityGrams,
      plannedUnits: units,
      quantityUnits: units
    }
  }

  const plannedQuantityGrams = qty || baseQuantity
  const scalingFactor = baseQuantity > 0 ? plannedQuantityGrams / baseQuantity : 1
  return {
    baseQuantity,
    scalingFactor,
    plannedQuantityGrams,
    plannedUnits: null,
    quantityUnits: null
  }
}

export function calculateToleranceBounds(targetMass, scalingMode) {
  const target = parseFloat(targetMass) || 0
  if (scalingMode === SCALING_MODE_PER_UNIT || target < 3) {
    const margin = Math.max(0.1, target * 0.05)
    return {
      min: Math.max(0, target - margin),
      max: target + margin
    }
  }
  const tolerance = 3
  return {
    min: Math.max(0, target - tolerance),
    max: target + tolerance
  }
}
