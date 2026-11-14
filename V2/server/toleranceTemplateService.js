const {
  resolveBoundsFromBands,
  validateBandsNoOverlap
} = require('../shared/weighingTolerance');

const CACHE_TTL_MS = 60000;
const cache = {
  defaultTemplateId: { value: null, at: 0 },
  templates: new Map(),
  bands: new Map()
};

function cacheGet(entry) {
  if (!entry || Date.now() - entry.at > CACHE_TTL_MS) return null;
  return entry.value;
}

function invalidateToleranceTemplateCache() {
  cache.defaultTemplateId = { value: null, at: 0 };
  cache.templates.clear();
  cache.bands.clear();
}

async function getDefaultTemplateId(pool) {
  const cached = cacheGet(cache.defaultTemplateId);
  if (cached) return cached;
  const result = await pool.query(
    `SELECT id FROM weighing_tolerance_template
     WHERE is_default = true AND status = 'active'
     ORDER BY updated_at DESC
     LIMIT 1`
  );
  const id = result.rows[0]?.id || null;
  cache.defaultTemplateId = { value: id, at: Date.now() };
  return id;
}

async function resolveTemplateId(pool) {
  return getDefaultTemplateId(pool);
}

async function getBandsForTemplate(pool, templateId) {
  if (!templateId) return [];
  const key = String(templateId);
  const cached = cache.bands.get(key);
  if (cached && Date.now() - cached.at <= CACHE_TTL_MS) return cached.value;
  const result = await pool.query(
    `SELECT id, template_id, target_qty_min, target_qty_max, tolerance_qty, sort_order
     FROM weighing_tolerance_template_band
     WHERE template_id = $1
     ORDER BY sort_order ASC, target_qty_min ASC`,
    [templateId]
  );
  const bands = result.rows;
  cache.bands.set(key, { value: bands, at: Date.now() });
  return bands;
}

async function resolveWeighingToleranceBounds(pool, { targetMass }) {
  const templateId = await resolveTemplateId(pool);
  if (!templateId) {
    const err = new Error('NO_TOLERANCE_TEMPLATE');
    err.code = 'NO_TOLERANCE_TEMPLATE';
    throw err;
  }
  const bands = await getBandsForTemplate(pool, templateId);
  const resolved = resolveBoundsFromBands(targetMass, bands);
  return {
    min: resolved.min,
    max: resolved.max,
    templateId,
    band: resolved.band,
    toleranceQty: resolved.toleranceQty
  };
}

async function getProductIdForFormulationIngredient(pool, formulationIngredientId) {
  if (!formulationIngredientId) return null;
  const result = await pool.query(
    'SELECT product_id FROM master_formulation_ingredients WHERE id = $1',
    [formulationIngredientId]
  );
  return result.rows[0]?.product_id || null;
}

function mapBandInput(band) {
  return {
    target_qty_min: parseFloat(band.target_qty_min ?? band.targetQtyMin),
    target_qty_max: parseFloat(band.target_qty_max ?? band.targetQtyMax),
    tolerance_qty: parseFloat(band.tolerance_qty ?? band.toleranceQty),
    sort_order: parseInt(band.sort_order ?? band.sortOrder ?? 0, 10) || 0
  };
}

function validateBandPayload(bands) {
  const normalized = (bands || []).map(mapBandInput);
  return validateBandsNoOverlap(normalized);
}

module.exports = {
  invalidateToleranceTemplateCache,
  getDefaultTemplateId,
  resolveTemplateId,
  getBandsForTemplate,
  resolveWeighingToleranceBounds,
  getProductIdForFormulationIngredient,
  validateBandPayload,
  mapBandInput
};
