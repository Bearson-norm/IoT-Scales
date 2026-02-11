# Fix: Start Button Zero-Check Validation

**Date**: 2026-01-23
**Status**: ✅ RESOLVED

## Problem
User requested that the "Start" button should be disabled when the digital-weight reading is not zero (outside ±0.5g tolerance). This validation ensures the scale is properly zeroed before starting a new weighing operation.

## Root Cause
The `isButtonDisabled` logic in `RightPanel.jsx` only checked if weighing was active (`isWeighingActive`), but did not validate the scale reading before allowing the Start button to be clicked.

## Solution

### 1. Added Zero-Check Validation for Button

**File**: `src/components/RightPanel.jsx` (lines 133-138)

Added logic to disable the Start button if:
1. Weighing is already active (`isWeighingActive`), OR
2. Scale reading is not zero (outside ±0.5g tolerance)

```javascript
// Zero check logic for Start button validation
// Button is disabled if: 1) actively weighing, OR 2) scale reading is not zero (outside ±0.5g tolerance)
const zeroThreshold = 0.5 // ±0.5 gram tolerance
const absoluteWeight = Math.abs(scaleDisplayWeight || 0)
const isNotZero = absoluteWeight > zeroThreshold
const isButtonDisabled = isWeighingActive || isNotZero
```

### 2. Updated Button Title

**File**: `src/components/RightPanel.jsx` (lines 574-580)

Updated the button's title to provide clear feedback:
- If weighing is active: "Sedang dalam proses penimbangan"
- If scale is not zero: Shows current weight and tolerance (e.g., "Timbangan harus nol terlebih dahulu (saat ini: 1.2g, toleransi: ±0.5g)")
- If ready to start: "Mulai penimbangan"

```javascript
title={
  isWeighingActive 
    ? 'Sedang dalam proses penimbangan' 
    : isNotZero 
      ? `Timbangan harus nol terlebih dahulu (saat ini: ${absoluteWeight.toFixed(1)}g, toleransi: ±${zeroThreshold}g)` 
      : 'Mulai penimbangan'
}
```

## Testing Steps

1. **Hard refresh browser** (Ctrl+Shift+R or Ctrl+F5)
2. Load a work order and select an ingredient
3. **Test Case 1**: Without any load on scale
   - ✅ Expected: Start button should be enabled (weight ≤ 0.5g)
4. **Test Case 2**: With load on scale (> 0.5g)
   - ✅ Expected: Start button should be disabled
   - ✅ Expected: Hover over button shows message "Timbangan harus nol terlebih dahulu (saat ini: X.Xg, toleransi: ±0.5g)"
5. **Test Case 3**: Remove load from scale
   - ✅ Expected: Start button becomes enabled again

## Key Points

1. **Zero tolerance**: ±0.5 gram (configurable via `zeroThreshold` constant)
2. **Visual feedback**: Button becomes gray and shows "not-allowed" cursor when disabled
3. **Informative tooltip**: Clear message explaining why button is disabled
4. **Real-time validation**: Uses `scaleDisplayWeight` which is continuously updated from WebSocket
5. **Independent of weighing process**: This is pure UI validation, does not affect the actual weighing logic

## Related Changes

- **Build file**: `dist/assets/index-78348023.js` (2026-01-23 19:48:21)
- **No changes to**: `App.jsx` (WebSocket logic remains unchanged)
- **No changes to**: Server-side validation

## User Request
> "buatkan handling untuk tombol start tidak bisa ditekan apabila angka di digital-weight lebih dari nol atau diluar toleransi (+-0.5gram). saya hanya minta agar fungsi tombol saja yang diubah"

## Implementation Notes

- **Scope**: Only button validation changed, no changes to weighing logic or data flow
- **Performance**: Minimal impact, validation runs on each render (same as previous logic)
- **Backwards compatible**: No breaking changes to existing functionality
