export const createTemplateId = () => `label-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

export const DEFAULT_LABEL_LAYOUT = {
  marginLeftMm: 5,
  marginTopMm: 5,
  sectionSpacingMm: 6,
  lineSpacingMm: 4,
  lineWidthMm: 62, // default line width (mm)
  lineThicknessDots: 2,
  headerFontPt: 28,
  labelFontPt: 14,
  valueFontPt: 16,
  weightFontPt: 26,
  footerFontPt: 12,
  rightColumnMarginMm: 20
};

export const createDefaultLabelTemplate = (overrides = {}) => {
  const {
    id,
    name,
    width,
    height,
    dpi,
    layout = {},
    description
  } = overrides;

  const templateId = id || createTemplateId();

  return {
    id: templateId,
    name: name || 'Label 72 × 100 mm (Default)',
    width: width ?? 72,
    height: height ?? 100,
    dpi: dpi ?? 203,
    description: description || '',
    layout: {
      ...DEFAULT_LABEL_LAYOUT,
      ...layout
    }
  };
};

export const mergeTemplateWithDefaults = (template) => {
  if (!template) {
    return createDefaultLabelTemplate();
  }

  const safeTemplate = { ...template };
  safeTemplate.id = safeTemplate.id || createTemplateId();
  safeTemplate.name = safeTemplate.name || 'Label Custom';
  safeTemplate.width = safeTemplate.width ?? 72;
  safeTemplate.height = safeTemplate.height ?? 100;
  safeTemplate.dpi = safeTemplate.dpi ?? 203;
  safeTemplate.layout = {
    ...DEFAULT_LABEL_LAYOUT,
    ...(safeTemplate.layout || {})
  };
  safeTemplate.description = safeTemplate.description || template.description || '';
  return safeTemplate;
};

export const cloneTemplate = (template, overrides = {}) => {
  const base = mergeTemplateWithDefaults(template);
  return mergeTemplateWithDefaults({
    ...base,
    ...overrides,
    id: overrides.id || createTemplateId(),
    layout: {
      ...base.layout,
      ...(overrides.layout || {})
    }
  });
};










