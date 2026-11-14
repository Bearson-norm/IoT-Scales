/**
 * Validates per-unit (PCS) scaling scenario from the plan:
 * Formulasi A: 12g + 8g = 20g/botol, MO 100 PCS → 2000g total, factor 100×
 */

import {
  computeMoScaling,
  getScalingBaseQuantity,
  calculateToleranceBounds,
  SCALING_MODE_PER_UNIT,
  SCALING_MODE_PER_1000G
} from './src/utils/scaling.js'

function assertClose(actual, expected, label) {
  if (Math.abs(actual - expected) > 0.001) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`)
  }
}

// Formulasi A — 20g per botol
const formA = { scalingMode: SCALING_MODE_PER_UNIT, totalMass: 20 }
const mo100 = computeMoScaling({ ...formA, inputQuantity: 100 })

assertClose(mo100.scalingFactor, 100, 'Formulasi A factor')
assertClose(mo100.plannedQuantityGrams, 2000, 'Formulasi A total grams')
assertClose(mo100.plannedUnits, 100, 'Formulasi A PCS')
assertClose(12 * mo100.scalingFactor, 1200, 'Product 1 target')
assertClose(8 * mo100.scalingFactor, 800, 'Product 2 target')

// Formulasi B — 21g per botol (independent)
const formB = { scalingMode: SCALING_MODE_PER_UNIT, totalMass: 21 }
const mo50 = computeMoScaling({ ...formB, inputQuantity: 50 })
assertClose(mo50.plannedQuantityGrams, 1050, 'Formulasi B total grams')
assertClose(10 * mo50.scalingFactor, 500, 'Formulasi B product 1')

// Legacy per 1000g unchanged
const legacy = computeMoScaling({
  scalingMode: SCALING_MODE_PER_1000G,
  totalMass: 1000,
  inputQuantity: 5000
})
assertClose(legacy.scalingFactor, 5, 'Legacy 5000g factor')
assertClose(getScalingBaseQuantity(SCALING_MODE_PER_1000G, 1000), 1000, 'Legacy base')

// Toleransi proporsional untuk bahan kecil
const tol = calculateToleranceBounds(0.31, SCALING_MODE_PER_UNIT)
if (tol.max - tol.min > 6) {
  throw new Error('Tolerance for 0.31g should be proportional, not ±3g')
}

console.log('✅ All per-unit scaling tests passed')
