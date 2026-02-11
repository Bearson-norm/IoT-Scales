// TEMPORARY DEBUG CODE - Add to App.jsx after line 450 (setScaleDisplayWeight)

// AFTER THIS LINE:
// setScaleDisplayWeight(roundedWeight)

// ADD THIS DEBUG CODE:
console.log('🔵 [DEBUG] scaleDisplayWeight updated:', {
  timestamp: new Date().toISOString(),
  roundedWeight: roundedWeight,
  isWeighingActive: isWeighingActive,
  hasSelectedIngredient: !!selectedIngredient,
  selectedIngredientId: selectedIngredient?.id,
  showProductVerification: showProductVerification  // ADD THIS TO APP.JSX PARAMS IF NOT THERE
});

// This will help us see if WebSocket is still receiving data when freeze happens
// If you see these logs in console but display is frozen, the problem is in RightPanel display logic
// If you DON'T see these logs when frozen, the problem is WebSocket connection or server side
