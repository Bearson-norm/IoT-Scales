import React, { useRef, useEffect, useMemo, useState } from 'react'
import { Scale, Save, Play, AlertCircle, Check } from 'lucide-react'
import { useAlert } from '../utils/alertModal'
import PrintConfirmationModal from './PrintConfirmationModal'

const RightPanel = ({ workOrder, selectedIngredient, currentPage, currentWeight, scaleConnected, onSaveProgress, onCompleteWeighing, isWeighingActive, onPrintReceipt, onStartWeighing, zeroCheckWeight = 0, scaleDisplayWeight = 0, showProductVerification = false }) => {
  const { alert } = useAlert()
  const [showPrintConfirmation, setShowPrintConfirmation] = useState(false)
  
  // CRITICAL: All hooks must be called before any early returns
  // This is required by React Rules of Hooks - hooks must be called in the same order every render
  // CRITICAL: Use refs to store smoothed values and prevent rapid fluctuations
  const smoothedCurrentWeightRef = useRef(0)
  const progressBarMaxRef = useRef(null)
  const lastStableProgressBarMaxRef = useRef(null)
  const lastIngredientIdRef = useRef(null)
  
  // CRITICAL: Reset progressBarMax when ingredient changes
  // This ensures each ingredient gets fresh calculation
  useEffect(() => {
    const currentIngredientId = selectedIngredient?.id || selectedIngredient?.code || null;
    if (currentIngredientId !== lastIngredientIdRef.current) {
      // Ingredient changed - reset progressBarMax for fresh calculation
      progressBarMaxRef.current = null;
      lastStableProgressBarMaxRef.current = null;
      lastIngredientIdRef.current = currentIngredientId;
    }
  }, [selectedIngredient])
  
  // Calculate values that will be used in useMemo (before early returns)
  const savedWeight = workOrder && selectedIngredient ? parseFloat(selectedIngredient.savedWeight || 0) || 0 : 0
  const targetWeight = workOrder && selectedIngredient ? parseFloat(selectedIngredient.targetWeight) || 0 : 0
  const rawCurrentWeight = parseFloat(currentWeight || 0) || 0
  
  // CRITICAL: Since data from scale is already stable (verified in RSCOM/RealTerm),
  // we should use the raw value directly with minimal filtering for accuracy
  // Apply rounding to 0.1g precision to prevent display jitter from floating point precision
  // CRITICAL: Always update to latest value to prevent truncation issues
  const currentReading = useMemo(() => {
    if (isWeighingActive && rawCurrentWeight > 0) {
      // Round to 0.1g precision to prevent jitter from floating point precision issues
      // This ensures that values like 170.05 and 170.03 both display as 170.0
      const rounded = Math.round(rawCurrentWeight * 10) / 10
      const previousValue = smoothedCurrentWeightRef.current || rounded
      const change = rounded - previousValue // Signed change (positive = increase, negative = decrease)
      const absChange = Math.abs(change)
      
      // CRITICAL: Always update for increases to prevent truncation
      // For decreases, only filter very small changes (< 0.05g) to prevent jitter
      // This ensures we always show the latest value from backend, preventing truncation
      if (change > 0 || absChange >= 0.05) {
        // Update for increases of any size OR decreases >= 0.05g
        // Lower threshold (0.05g) ensures we capture all real changes and prevent truncation
        smoothedCurrentWeightRef.current = rounded
        return rounded
      }
      
      // For very small decreases (< 0.05g), keep previous value to prevent jitter
      // This filters out tiny fluctuations while maintaining accuracy
      return previousValue
    } else {
      smoothedCurrentWeightRef.current = 0
      return 0
    }
  }, [rawCurrentWeight, isWeighingActive])
  
  // Calculate values needed for progressBarMax (with safe defaults)
  const remaining = workOrder && selectedIngredient ? Math.max(0, targetWeight - savedWeight) : 0
  // Calculate target-weight display value as stream: targetWeight - currentWeight - savedWeight
  const targetWeightDisplay = useMemo(() => {
    if (!workOrder || !selectedIngredient) return 0
    const currentWeightValue = isWeighingActive ? currentReading : 0
    return Math.max(0, targetWeight - currentWeightValue - savedWeight)
  }, [workOrder, selectedIngredient, targetWeight, currentReading, savedWeight, isWeighingActive])
  const tolerance = 3
  const minWeight = workOrder && selectedIngredient ? Math.max(0, targetWeight - tolerance) : 0
  const maxWeight = workOrder && selectedIngredient ? targetWeight + tolerance : 0
  const remainingMin = workOrder && selectedIngredient ? Math.max(0, minWeight - savedWeight) : 0
  const remainingMax = workOrder && selectedIngredient ? Math.max(remaining, maxWeight - savedWeight) : 0
  const remainingToleranceRange = remainingMax - remainingMin
  
  // CRITICAL: Calculate progressBarMax before any early returns
  // Must be called before any early returns to follow Rules of Hooks
  // FIX: Lock progressBarMax once calculated to prevent marker shifting
  const progressBarMax = useMemo(() => {
    // Return default if data not available
    if (!workOrder || !selectedIngredient || targetWeight === 0) {
      return 100
    }
    
    // CRITICAL: If already calculated for this ingredient, keep it locked
    // Only recalculate if ingredient changes or if null
    if (progressBarMaxRef.current !== null && progressBarMaxRef.current > 0) {
      // Check if currentReading significantly exceeds the locked max (need expansion)
      const currentReadingValue = isWeighingActive ? (smoothedCurrentWeightRef.current || rawCurrentWeight) : 0;
      // Only expand if exceeds by more than 20% (very rare case)
      if (currentReadingValue > progressBarMaxRef.current * 0.95) {
        const newMax = currentReadingValue * 1.15;
        progressBarMaxRef.current = newMax;
        return newMax;
      }
      // Otherwise keep locked value
      return progressBarMaxRef.current;
    }
    
    // Calculate FIXED progressBarMax (only once per ingredient)
    let calculatedProgressBarMax;
    if (remaining > 0) {
      // Use remaining as base, but add buffer for tolerance markers
      // SIMPLIFIED: Just use remainingMax + buffer, no complex adjustments
      if (remaining <= 100) {
        calculatedProgressBarMax = remainingMax + 30;
        if (calculatedProgressBarMax < 100) calculatedProgressBarMax = 100;
      } else if (remaining <= 500) {
        calculatedProgressBarMax = remainingMax * 1.15;
      } else if (remaining <= 1000) {
        calculatedProgressBarMax = remainingMax * 1.12;
      } else {
        calculatedProgressBarMax = remainingMax * 1.08;
      }
      
      if (calculatedProgressBarMax < 100) calculatedProgressBarMax = 100;
    } else {
      calculatedProgressBarMax = Math.max(100, targetWeight * 1.15);
    }
    
    // Lock this value - don't change it anymore
    progressBarMaxRef.current = calculatedProgressBarMax;
    lastStableProgressBarMaxRef.current = calculatedProgressBarMax;
    
    return calculatedProgressBarMax;
  }, [workOrder, selectedIngredient, targetWeight, savedWeight, remaining, remainingMax, isWeighingActive, rawCurrentWeight])
  
  // Zero check logic for Start button validation
  // Button is disabled if: 1) actively weighing, OR 2) scale reading is not zero (outside ±0.5g tolerance)
  const zeroThreshold = 0.5 // ±0.5 gram tolerance
  const absoluteWeight = Math.abs(scaleDisplayWeight || 0)
  const isNotZero = absoluteWeight > zeroThreshold
  const isButtonDisabled = isWeighingActive || isNotZero
  
  if (!workOrder) {
    return (
      <div className="right-panel">
        <div className="empty-state">
          <Scale size={64} className="empty-icon" />
          <div className="empty-text">Pilih Bahan Mentah</div>
          <div className="empty-subtext">Klik salah satu bahan di panel kiri untuk memulai penimbangan</div>
        </div>
      </div>
    )
  }

  if (!selectedIngredient) {
    const noIngredientScaleDisplay = (typeof scaleDisplayWeight === 'number' && !isNaN(scaleDisplayWeight))
      ? Math.round(Math.abs(scaleDisplayWeight) * 10) / 10
      : 0.0

    return (
      <div className="right-panel">
        <div className="weighing-section">
          <div className="weighing-title">
            <Scale size={20} />
            Scale
          </div>
          
          <div className="digital-weight">
            {noIngredientScaleDisplay.toFixed(1)} g
            <div style={{ 
              position: 'absolute', top: '-6px', right: '-6px',
              width: '10px', height: '10px',
              backgroundColor: scaleConnected ? '#22c55e' : '#ef4444',
              borderRadius: '50%', border: '2px solid white',
              boxShadow: '0 0 6px rgba(0,0,0,0.2)',
              animation: scaleConnected ? 'pulse 2s infinite' : 'none'
            }} title={scaleConnected ? 'WebSocket aktif' : 'WebSocket tidak terhubung'} />
          </div>
          
          <div className="work-order-info" style={{ marginTop: '48px' }}>
            <div className="info-row">
              <span className="info-label">Work Order:</span>
              <span className="info-value">{workOrder.workOrder}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Formula Name:</span>
              <span className="info-value">{workOrder.formulaName}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Order Qty:</span>
              <span className="info-value">{(workOrder.orderQty || 0).toFixed(1)}</span>
            </div>
          </div>

          <div className="empty-state">
            <Scale size={48} className="empty-icon" />
            <div className="empty-text">Pilih Bahan Mentah</div>
            <div className="empty-subtext">Klik salah satu bahan di panel kiri untuk memulai penimbangan</div>
          </div>
        </div>
      </div>
    )
  }

  // Validate selectedIngredient has required properties
  if (!selectedIngredient || typeof selectedIngredient.targetWeight === 'undefined' || selectedIngredient.targetWeight === null) {
    return (
      <div className="right-panel">
        <div className="empty-state">
          <Scale size={64} className="empty-icon" />
          <div className="empty-text">Data ingredient tidak valid</div>
        </div>
      </div>
    );
  }

  // Validate: if currentWeight seems incorrect (too small compared to previous or target), log warning
  if (isWeighingActive && rawCurrentWeight > 0 && rawCurrentWeight < 10 && targetWeight > 100) {
    // This might indicate a parsing error - log for debugging
    console.warn('⚠️ Suspicious currentWeight value:', {
      currentWeight: rawCurrentWeight,
      targetWeight: targetWeight,
      savedWeight: savedWeight,
      isWeighingActive: isWeighingActive
    });
  }
  const totalAccumulated = savedWeight + currentReading; // Display total = saved + current reading
  const current = isWeighingActive ? totalAccumulated : savedWeight; // Only show accumulated when weighing, otherwise show saved weight only
  
  // REMOVED: Zero check debug logging - user requested to remove zero check
  
  // REMOVED: Duplicate zero check calculation and useEffect - already done before early returns above (line 133-182)
  // This code was causing React error #310 because useEffect was called after early returns
  // All hooks must be called before any early returns to follow Rules of Hooks
  
  // REMOVED: Duplicate variable definitions - already defined before early returns above (line 133-182)
  // These variables are already available from the definitions before early returns
  
  // REMOVED: Zero check debug logging - user requested to remove zero check
  
  // Debug: Log zero check status (remove useEffect to avoid React error)
  // Values are computed on each render, no need for useEffect
  const withinTolerance = current >= minWeight && current <= maxWeight;
  const over = current > maxWeight;
  const under = current < minWeight;
  
  // Progress bar: Show current reading against remaining weight (as per user request)
  // Progress bar max = remaining weight (how much more to add)
  // Progress fill = currentReading / remaining (how much of remaining has been added)
  const toleranceRange = maxWeight - minWeight; // e.g., 6g (from -3 to +3)
  
  // Calculate tolerance markers relative to remaining weight
  // Min/Max remaining = how much more to add to reach tolerance range
  // remainingMin and remainingMax are already calculated above
  const remainingTarget = remaining; // Target remaining to add
  
  // Calculate percentage positions relative to progressBarMax
  // Progress fill: currentReading / remaining (how much of remaining has been added)
  // CRITICAL: Round to 2 decimal places to prevent micro-jitter from floating point precision
  const currentPercent = remaining > 0 && progressBarMax > 0 
    ? Math.round(Math.min(100, Math.max(0, (currentReading / progressBarMax) * 100)) * 100) / 100
    : 0;
  
  // Tolerance markers: positions where currentReading should be (relative to remaining)
  // CRITICAL: Round to 2 decimal places for stability
  const remainingTargetPercent = remaining > 0 && progressBarMax > 0 
    ? Math.round((remainingTarget / progressBarMax) * 100 * 100) / 100
    : 0;
  const remainingMinPercent = remaining > 0 && progressBarMax > 0 
    ? Math.round(Math.max(0, (remainingMin / progressBarMax) * 100) * 100) / 100
    : 0;
  const remainingMaxPercent = remaining > 0 && progressBarMax > 0 
    ? Math.round(Math.min(100, (remainingMax / progressBarMax) * 100) * 100) / 100
    : 0;
  
  // For tolerance bar: calculate min/max percent based on total target weight
  // These are used for the tolerance bar markers (showing total weight tolerance range)
  const minPercent = progressBarMax > 0 
    ? Math.max(0, ((minWeight - savedWeight) / progressBarMax) * 100)
    : 0;
  const maxPercent = progressBarMax > 0 
    ? Math.min(100, ((maxWeight - savedWeight) / progressBarMax) * 100)
    : 0;
  
  // Calculate visual gap percentages for display
  const minToTargetGap = remainingTargetPercent - remainingMinPercent;
  const targetToMaxGap = remainingMaxPercent - remainingTargetPercent;
  
  // Check if current reading is within tolerance range (relative to remaining)
  // Current reading should be between remainingMin and remainingMax
  const currentReadingWithinTolerance = currentReading >= remainingMin && currentReading <= remainingMax;
  const currentReadingOver = currentReading > remainingMax;
  const currentReadingUnder = currentReading < remainingMin;

  // Safe display value helper
  const safeScaleDisplay = (typeof scaleDisplayWeight === 'number' && !isNaN(scaleDisplayWeight))
    ? Math.round(Math.abs(scaleDisplayWeight) * 10) / 10
    : 0.0

  return (
    <div className="right-panel">
      <div className="weighing-section">
        <div className="weighing-title">
          <Scale size={20} />
          Scale
        </div>

        {/* Digital weight display - absolute positioned top-right */}
        <div className="digital-weight">
          {safeScaleDisplay.toFixed(1)} g
          <div style={{ 
            position: 'absolute', top: '-6px', right: '-6px',
            width: '10px', height: '10px',
            backgroundColor: scaleConnected ? '#22c55e' : '#ef4444',
            borderRadius: '50%', border: '2px solid white',
            boxShadow: '0 0 6px rgba(0,0,0,0.2)',
            animation: scaleConnected ? 'pulse 2s infinite' : 'none'
          }} title={scaleConnected ? 'WebSocket aktif' : 'WebSocket tidak terhubung'} />
        </div>
        
        {/* Work order info badges */}
        <div className="info-badges">
          <div className="info-badge">
            <div className="label">Work Order</div>
            <div className="value">{workOrder.workOrder}</div>
          </div>
          <div className="info-badge">
            <div className="label">Formula Name</div>
            <div className="value">{workOrder.formulaName}</div>
          </div>
          <div className="info-badge">
            <div className="label">Order Qty</div>
            <div className="value">{(workOrder.orderQty || 0).toFixed(1)}</div>
          </div>
        </div>

        {/* Ingredient details card */}
        <div className="ingredient-details">
          <div className="ingredient-name-large">
            {selectedIngredient.name}
          </div>
          
          {/* Progress bar with tolerance markers */}
          <div style={{ 
            width: '100%', height: '14px',
            backgroundColor: '#e5e7eb', borderRadius: '7px',
            overflow: 'visible', position: 'relative',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.08)',
            border: '1px solid #d1d5db'
          }}>
            <div style={{
              width: `${currentPercent}%`, height: '100%',
              backgroundColor: currentReadingWithinTolerance ? '#22c55e' : (currentReadingUnder ? '#eab308' : '#ef4444'),
              transition: 'width 0.3s ease, background-color 0.3s ease',
              borderRadius: '6px', position: 'relative', zIndex: 1
            }} />
            
            {remainingMinPercent > 0 && (
              <div style={{
                position: 'absolute', left: `${remainingMinPercent}%`, top: '-2px',
                width: '2px', height: '18px', backgroundColor: '#3b82f6', zIndex: 2,
                boxShadow: '0 0 3px rgba(59,130,246,0.6)', transform: 'translateX(-50%)'
              }} title={`Min: ${remainingMin.toFixed(1)}g`} />
            )}
            
            {remainingTargetPercent > 0 && (
              <div style={{
                position: 'absolute', left: `${remainingTargetPercent}%`, top: '-2px',
                width: '2px', height: '18px', backgroundColor: '#6366f1', zIndex: 3,
                boxShadow: '0 0 4px rgba(99,102,241,0.7)', transform: 'translateX(-50%)'
              }} title={`Target: ${remainingTarget.toFixed(1)}g`} />
            )}
            
            {remainingMaxPercent > 0 && (
              <div style={{
                position: 'absolute', left: `${remainingMaxPercent}%`, top: '-2px',
                width: '2px', height: '18px', backgroundColor: '#3b82f6', zIndex: 2,
                boxShadow: '0 0 3px rgba(59,130,246,0.6)', transform: 'translateX(-50%)'
              }} title={`Max: ${remainingMax.toFixed(1)}g`} />
            )}
            
            {currentReading > 0 && (
              <div style={{
                position: 'absolute', left: `${currentPercent}%`, top: '-4px',
                width: '3px', height: '22px', backgroundColor: '#1f2937', zIndex: 4,
                boxShadow: '0 0 4px rgba(0,0,0,0.5)', transform: 'translateX(-50%)',
                borderRadius: '1px'
              }} title={`Reading: ${currentReading.toFixed(1)}g / ${remaining.toFixed(1)}g`} />
            )}
          </div>
          
          {/* Tolerance labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b7280', fontWeight: 500 }}>
            <span style={{ color: '#3b82f6' }}>
              Min: {remainingMin.toFixed(1)}g
            </span>
            <span style={{ fontWeight: 700, color: '#6366f1', fontSize: '11px' }}>
              Target: {remaining.toFixed(1)}g
            </span>
            <span style={{ color: '#3b82f6' }}>
              Max: {remainingMax.toFixed(1)}g
            </span>
          </div>
          
          {/* Weight display */}
          <div className="weight-display">
            <div className="current-weight">
              {isWeighingActive 
                ? currentReading.toFixed(1)
                : selectedIngredient 
                  ? (Math.abs(scaleDisplayWeight || 0)).toFixed(1)
                  : savedWeight.toFixed(1)
              } g
            </div>
            <div className="target-weight">
              / {targetWeightDisplay.toFixed(1)} g
            </div>
            {(selectedIngredient.progressPercentage || 0) > 0 && (
              <div style={{ fontSize: '10px', color: '#9ca3af', width: '100%' }}>
                Progress: {(selectedIngredient.progressPercentage || 0).toFixed(1)}% | Total: {totalAccumulated.toFixed(1)}g / Target: {targetWeight.toFixed(1)}g
              </div>
            )}
          </div>

          {/* Parameter table */}
          <div className="param-table">
            <div className="param-row">
              <span className="parameter-label">MAX</span>
              <span className="parameter-value">{maxWeight.toFixed(1)} g</span>
            </div>
            <div className="param-row">
              <span className="parameter-label">Plan Qty</span>
              <span className="parameter-value">{targetWeight.toFixed(1)} g</span>
            </div>
            <div className="param-row">
              <span className="parameter-label">MIN</span>
              <span className="parameter-value">{minWeight.toFixed(1)} g</span>
            </div>
            <div className="param-row" style={{ borderBottom: 'none' }}>
              <span className="parameter-label">Remaining</span>
              <span className="parameter-value remaining">{remaining.toFixed(1)} g</span>
            </div>
          </div>

          {/* Instruction */}
          <div className="param-card">
            <div className="parameter-label">Instruction</div>
            <div className="parameter-value">
              {selectedIngredient.instruction || 'Tidak ada instruksi khusus'}
            </div>
          </div>

          {/* Exp Date */}
          <div className="param-card">
            <div className="parameter-label">Exp Date</div>
            <div className="parameter-value">
              {selectedIngredient.expDate || '30/08/2027'}
            </div>
          </div>

          {/* Action buttons */}
          <div className="action-buttons">
            {!isWeighingActive && !showProductVerification ? (
              <button 
                className="action-btn primary" 
                onClick={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (onStartWeighing) {
                    await onStartWeighing()
                  }
                }}
                disabled={isButtonDisabled}
                style={{
                  opacity: !isButtonDisabled ? 1 : 0.5,
                  cursor: !isButtonDisabled ? 'pointer' : 'not-allowed',
                  backgroundColor: !isButtonDisabled ? '#3b82f6' : '#9ca3af',
                }}
                title={
                  isWeighingActive 
                    ? 'Sedang dalam proses penimbangan' 
                    : isNotZero 
                      ? `Timbangan harus nol (saat ini: ${absoluteWeight.toFixed(1)}g)` 
                      : 'Mulai penimbangan'
                }
              >
                <Play size={16} />
                Start
              </button>
            ) : (
              <button 
                className="action-btn primary" 
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowPrintConfirmation(true)
                }}
              >
                <Save size={16} />
                Save
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Print Confirmation Modal */}
      <PrintConfirmationModal
        isOpen={showPrintConfirmation}
        onClose={() => setShowPrintConfirmation(false)}
        onSaveAndPrint={async () => {
          if (onSaveProgress) {
            await onSaveProgress(false)
          }
        }}
        onSaveOnly={async () => {
          if (onSaveProgress) {
            await onSaveProgress(true)
          }
        }}
        ingredientName={selectedIngredient?.name || selectedIngredient?.product_name || 'N/A'}
        currentWeight={currentWeight}
        targetWeight={selectedIngredient?.targetWeight || 0}
      />
    </div>
  )
}

export default RightPanel
