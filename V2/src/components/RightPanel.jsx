import React, { useRef, useEffect, useMemo, useState } from 'react'
import { Scale, Save, Play, AlertCircle, Check } from 'lucide-react'
import { useAlert } from '../utils/alertModal'
import PrintConfirmationModal from './PrintConfirmationModal'

const RightPanel = ({ workOrder, selectedIngredient, currentPage, currentWeight, scaleConnected, onSaveProgress, onCompleteWeighing, isWeighingActive, onPrintReceipt, onStartWeighing, zeroCheckWeight = 0, showProductVerification = false }) => {
  const { alert } = useAlert()
  const [showPrintConfirmation, setShowPrintConfirmation] = useState(false)
  
  // CRITICAL: All hooks must be called before any early returns
  // This is required by React Rules of Hooks - hooks must be called in the same order every render
  // CRITICAL: Use refs to store smoothed values and prevent rapid fluctuations
  const smoothedCurrentWeightRef = useRef(0)
  const progressBarMaxRef = useRef(null)
  const lastStableProgressBarMaxRef = useRef(null)
  
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
  const tolerance = 3
  const minWeight = workOrder && selectedIngredient ? Math.max(0, targetWeight - tolerance) : 0
  const maxWeight = workOrder && selectedIngredient ? targetWeight + tolerance : 0
  const remainingMin = workOrder && selectedIngredient ? Math.max(0, minWeight - savedWeight) : 0
  const remainingMax = workOrder && selectedIngredient ? Math.max(remaining, maxWeight - savedWeight) : 0
  const remainingToleranceRange = remainingMax - remainingMin
  
  // CRITICAL: Calculate progressBarMax before any early returns
  // Must be called before any early returns to follow Rules of Hooks
  const progressBarMax = useMemo(() => {
    // Return default if data not available
    if (!workOrder || !selectedIngredient || targetWeight === 0) {
      return 100
    }
    
    // Calculate base progressBarMax
    let calculatedProgressBarMax;
    if (remaining > 0) {
      // Use remaining as base, but add buffer for tolerance markers
      if (remaining <= 100) {
        calculatedProgressBarMax = remainingMax + 25;
        if (calculatedProgressBarMax < 100) calculatedProgressBarMax = 100;
      } else if (remaining <= 500) {
        calculatedProgressBarMax = remainingMax * 1.1;
      } else if (remaining <= 1000) {
        calculatedProgressBarMax = remainingMax * 1.08;
      } else {
        const minTolerancePercentage = 0.20;
        const toleranceBasedMax = remainingToleranceRange / minTolerancePercentage;
        calculatedProgressBarMax = Math.max(toleranceBasedMax, remainingMax * 1.03);
      }
      
      // Adjust if currentReading significantly exceeds remainingMax
      const currentReadingForAdjustment = isWeighingActive ? (smoothedCurrentWeightRef.current || rawCurrentWeight) : 0;
      const adjustmentThreshold = remainingMax * 1.1;
      if (currentReadingForAdjustment > adjustmentThreshold) {
        const newMax = Math.max(calculatedProgressBarMax, currentReadingForAdjustment * 1.05);
        if (progressBarMaxRef.current === null || newMax > progressBarMaxRef.current) {
          calculatedProgressBarMax = newMax;
        } else {
          calculatedProgressBarMax = progressBarMaxRef.current;
        }
      }
      
      if (calculatedProgressBarMax < 100) calculatedProgressBarMax = 100;
    } else {
      calculatedProgressBarMax = Math.max(100, targetWeight * 1.1);
    }
    
    // Smooth progressBarMax changes
    if (progressBarMaxRef.current === null) {
      progressBarMaxRef.current = calculatedProgressBarMax
      lastStableProgressBarMaxRef.current = calculatedProgressBarMax
      return calculatedProgressBarMax
    } else {
      const previousMax = progressBarMaxRef.current
      if (previousMax === 0) {
        progressBarMaxRef.current = calculatedProgressBarMax
        return calculatedProgressBarMax
      }
      
      const changePercent = Math.abs((calculatedProgressBarMax - previousMax) / previousMax) * 100
      
      if (changePercent > 5 || calculatedProgressBarMax > previousMax) {
        const smoothingFactor = 0.3
        const smoothed = previousMax * (1 - smoothingFactor) + calculatedProgressBarMax * smoothingFactor
        progressBarMaxRef.current = smoothed
        if (changePercent > 10) {
          lastStableProgressBarMaxRef.current = calculatedProgressBarMax
        }
        return smoothed
      } else {
        return previousMax
      }
    }
  }, [workOrder, selectedIngredient, targetWeight, savedWeight, remaining, remainingMax, remainingToleranceRange, isWeighingActive, rawCurrentWeight, minWeight, maxWeight])
  
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
    return (
      <div className="right-panel">
        <div className="weighing-section">
          <div className="weighing-title">
            <Scale size={28} />
            Scale
          </div>
          
          <div className="work-order-info">
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
            <Scale size={64} className="empty-icon" />
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
  
  // OPTIMIZED: Zero check for start weighing button
  // Uses digital-weight display value directly for immediate responsiveness
  const zeroThreshold = 0.5 // Allow ±0.5g tolerance for zero
  // Use absolute value to handle both positive and negative values
  // This value comes from the digital-weight display, ensuring consistency
  const actualWeight = Math.abs(zeroCheckWeight !== undefined && zeroCheckWeight !== null ? zeroCheckWeight : 0)
  const isZero = actualWeight <= zeroThreshold
  
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
  const currentPercent = remaining > 0 && progressBarMax > 0 
    ? Math.min(100, Math.max(0, (currentReading / progressBarMax) * 100)) 
    : 0;
  
  // Tolerance markers: positions where currentReading should be (relative to remaining)
  const remainingTargetPercent = remaining > 0 && progressBarMax > 0 
    ? (remainingTarget / progressBarMax) * 100 
    : 0;
  const remainingMinPercent = remaining > 0 && progressBarMax > 0 
    ? Math.max(0, (remainingMin / progressBarMax) * 100) 
    : 0;
  const remainingMaxPercent = remaining > 0 && progressBarMax > 0 
    ? Math.min(100, (remainingMax / progressBarMax) * 100) 
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

  return (
    <div className="right-panel">
      <div className="weighing-section" style={{ position: 'relative', padding: '15px' }}>
        <div className="weighing-title" style={{ marginBottom: '10px' }}>
          <Scale size={24} />
          Scale
        </div>
        {/* Show current reading from scale (not total accumulated) */}
        {/* OPTIMIZED: Show zeroCheckWeight before weighing starts, currentReading during weighing
            Uses direct value from digital-weight display for better performance and responsiveness */}
        <div className="digital-weight" style={{ top: '15px', right: '15px', fontSize: '42px' }}>
          {isWeighingActive 
            ? currentReading.toFixed(1) 
            : (zeroCheckWeight !== undefined && zeroCheckWeight !== null 
                ? Math.round(Math.abs(zeroCheckWeight) * 10) / 10 
                : 0.0).toFixed(1)
          } g
        </div>
        
        <div className="info-badges" style={{ marginBottom: '8px', gap: '8px' }}>
          <div className="info-badge" style={{ padding: '8px 10px' }}><div className="label" style={{ fontSize: '11px' }}>Work Order</div><div className="value" style={{ fontSize: '14px' }}>{workOrder.workOrder}</div></div>
          <div className="info-badge" style={{ padding: '8px 10px' }}><div className="label" style={{ fontSize: '11px' }}>Formula Name</div><div className="value" style={{ fontSize: '14px' }}>{workOrder.formulaName}</div></div>
          <div className="info-badge" style={{ padding: '8px 10px' }}><div className="label" style={{ fontSize: '11px' }}>Order Qty</div><div className="value" style={{ fontSize: '14px' }}>{(workOrder.orderQty || 0).toFixed(1)}</div></div>
        </div>

        <div className="ingredient-details" style={{ padding: '15px' }}>
          <div className="ingredient-name-large" style={{ marginBottom: '6px', fontSize: '22px' }}>
            {selectedIngredient.name}
          </div>
          
          {/* Progress bar indicator below ingredient name with tolerance markers - WIDE GAP VISUALIZATION */}
          <div className="progress-bar-container" style={{ 
            marginTop: '6px', 
            marginBottom: '8px',
            width: '100%',
            height: '16px', // Taller for better visibility
            backgroundColor: '#e5e7eb',
            borderRadius: '8px',
            overflow: 'visible',
            position: 'relative',
            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)', // Add depth
            border: '1px solid #d1d5db' // Add border for better definition
          }}>
            {/* Progress fill - shows current reading relative to remaining weight */}
            <div 
              className="progress-bar-fill"
              style={{
                width: `${currentPercent}%`,
                height: '100%',
                backgroundColor: currentReadingWithinTolerance ? '#22c55e' : (currentReadingUnder ? '#eab308' : '#ef4444'),
                transition: 'width 0.3s ease, background-color 0.3s ease',
                borderRadius: '6px',
                position: 'relative',
                zIndex: 1
              }}
            />
            
            {/* Min tolerance marker (blue line on the left) - shows min remaining to add */}
            {remainingMinPercent > 0 && (
              <div
                className="tolerance-marker-line min"
                style={{
                  position: 'absolute',
                  left: `${remainingMinPercent}%`,
                  top: '-3px',
                  width: '3px',
                  height: '20px',
                  backgroundColor: '#3b82f6',
                  zIndex: 2,
                  boxShadow: '0 0 4px rgba(59, 130, 246, 0.7), 0 0 2px rgba(59, 130, 246, 0.5)',
                  transform: 'translateX(-50%)',
                  borderRadius: '1px'
                }}
                title={`Min Remaining: ${remainingMin.toFixed(1)}g (Total: ${(savedWeight + remainingMin).toFixed(1)}g)`}
              />
            )}
            
            {/* Target remaining marker (purple line at target position) */}
            {remainingTargetPercent > 0 && (
              <div
                className="tolerance-marker-line target"
                style={{
                  position: 'absolute',
                  left: `${remainingTargetPercent}%`,
                  top: '-3px',
                  width: '3px',
                  height: '20px',
                  backgroundColor: '#6366f1',
                  zIndex: 3,
                  boxShadow: '0 0 5px rgba(99, 102, 241, 0.8), 0 0 3px rgba(99, 102, 241, 0.6)',
                  transform: 'translateX(-50%)',
                  borderRadius: '1px'
                }}
                title={`Target Remaining: ${remainingTarget.toFixed(1)}g (Total: ${targetWeight.toFixed(1)}g)`}
              />
            )}
            
            {/* Max tolerance marker (blue line on the right) - shows max remaining to add */}
            {remainingMaxPercent > 0 && (
              <div
                className="tolerance-marker-line max"
                style={{
                  position: 'absolute',
                  left: `${remainingMaxPercent}%`,
                  top: '-3px',
                  width: '3px',
                  height: '20px',
                  backgroundColor: '#3b82f6',
                  zIndex: 2,
                  boxShadow: '0 0 4px rgba(59, 130, 246, 0.7), 0 0 2px rgba(59, 130, 246, 0.5)',
                  transform: 'translateX(-50%)',
                  borderRadius: '1px'
                }}
                title={`Max Remaining: ${remainingMax.toFixed(1)}g (Total: ${(savedWeight + remainingMax).toFixed(1)}g)`}
              />
            )}
            
            {/* Current reading indicator (vertical line showing current reading position) */}
            {currentReading > 0 && (
              <div
                className="current-weight-marker"
                style={{
                  position: 'absolute',
                  left: `${currentPercent}%`,
                  top: '-5px',
                  width: '4px',
                  height: '24px',
                  backgroundColor: '#1f2937',
                  zIndex: 4,
                  boxShadow: '0 0 6px rgba(0, 0, 0, 0.7), 0 0 3px rgba(0, 0, 0, 0.5)',
                  transform: 'translateX(-50%)',
                  borderRadius: '2px',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}
                title={`Current Reading: ${currentReading.toFixed(1)}g / Remaining: ${remaining.toFixed(1)}g (${((currentReading / remaining) * 100).toFixed(1)}%) | Total: ${totalAccumulated.toFixed(1)}g`}
              />
            )}
          </div>
          
          {/* Tolerance range labels - shows remaining to add context */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: '11px',
            color: '#6b7280',
            marginTop: '4px',
            marginBottom: '2px',
            fontWeight: '500'
          }}>
            <span style={{ color: '#3b82f6' }}>
              Min: {remainingMin.toFixed(1)}g
              <span style={{ fontSize: '9px', color: '#9ca3af', marginLeft: '2px' }}>
                (Total: {(savedWeight + remainingMin).toFixed(1)}g)
              </span>
            </span>
            <span style={{ fontWeight: 'bold', color: '#6366f1', fontSize: '13px' }}>
              Target: {remaining.toFixed(1)}g
              <span style={{ fontSize: '9px', fontWeight: 'normal', color: '#9ca3af', marginLeft: '4px' }}>
                (Total: {targetWeight.toFixed(1)}g)
              </span>
            </span>
            <span style={{ color: '#3b82f6' }}>
              Max: {remainingMax.toFixed(1)}g
              <span style={{ fontSize: '9px', color: '#9ca3af', marginLeft: '2px' }}>
                (Total: {(savedWeight + remainingMax).toFixed(1)}g)
              </span>
            </span>
          </div>
          
          
          {/* Weight Display Section - Separate row */}
          <div className="weight-display" style={{ marginTop: '4px', marginBottom: '2px', padding: '8px 12px', display: 'block', width: '100%' }}>
            <div className="current-weight" style={{ fontSize: '26px' }}>
              {/* Display: saved weight (accumulated weight from previous saves) */}
              {savedWeight.toFixed(1)} g
            </div>
            <div className="target-weight" style={{ fontSize: '16px' }}>
              {/* Display: remaining weight (how much more to add) */}
              / {remaining.toFixed(1)} g
            </div>
            {(selectedIngredient.progressPercentage || 0) > 0 && (
              <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                Progress: {(selectedIngredient.progressPercentage || 0).toFixed(1)}% | Total: {totalAccumulated.toFixed(1)}g / Target: {targetWeight.toFixed(1)}g
              </div>
            )}
          </div>

          {/* Parameter Weight Section - Separate section with its own container */}
          <div style={{ 
            marginTop: '20px', 
            marginBottom: '10px',
            padding: '10px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            display: 'block',
            width: '100%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #e5e7eb' }}>
              <div className="parameter-label" style={{ fontSize: '14px', fontWeight: '500' }}>MAX</div>
              <div className="parameter-value" style={{ fontSize: '14px', fontWeight: '600' }}>
                {maxWeight.toFixed(1)} g
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #e5e7eb' }}>
              <div className="parameter-label" style={{ fontSize: '14px', fontWeight: '500' }}>Plan Qty</div>
              <div className="parameter-value" style={{ fontSize: '14px', fontWeight: '600' }}>
                {targetWeight.toFixed(1)} g
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #e5e7eb' }}>
              <div className="parameter-label" style={{ fontSize: '14px', fontWeight: '500' }}>MIN</div>
              <div className="parameter-value" style={{ fontSize: '14px', fontWeight: '600' }}>
                {minWeight.toFixed(1)} g
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
              <div className="parameter-label" style={{ fontSize: '14px', fontWeight: '500' }}>Remaining</div>
              <div className="parameter-value remaining" style={{ fontSize: '14px', fontWeight: '600' }}>
                {remaining.toFixed(1)} g
              </div>
            </div>
          </div>

          {/* Instruction - Separate row */}
          <div style={{ 
            marginTop: '10px',
            padding: '10px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <div className="parameter-label" style={{ fontSize: '14px', marginBottom: '4px' }}>Instruction</div>
            <div className="parameter-value" style={{ fontSize: '14px' }}>
              {selectedIngredient.instruction || 'Tidak ada instruksi khusus'}
            </div>
          </div>

          {/* Exp Date - Separate row */}
          <div style={{ 
            marginTop: '10px',
            padding: '10px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <div className="parameter-label" style={{ fontSize: '14px', marginBottom: '4px' }}>Exp Date</div>
            <div className="parameter-value" style={{ fontSize: '14px' }}>
              {selectedIngredient.expDate || '30/08/2027'}
            </div>
          </div>

          <div className="action-buttons" style={{ marginTop: '10px', gap: '8px' }}>
            {/* If verified (not showing verification modal) and not weighing yet, show Start button, otherwise show Save button */}
            {!isWeighingActive && !showProductVerification ? (
              <button 
                className="action-btn primary" 
                onClick={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  // OPTIMIZED: Use digital-weight display value directly for zero check
                  // This provides immediate feedback without waiting for polling
                  const displayWeight = zeroCheckWeight !== undefined && zeroCheckWeight !== null 
                    ? Math.abs(zeroCheckWeight)
                    : 0
                  const isZeroBasedOnDisplay = displayWeight <= zeroThreshold
                  
                  // Call onStartWeighing which will do a fresh check
                  // Button is enabled based on current display value for better UX
                  if (onStartWeighing) {
                    // onStartWeighing will do its own fresh zero check
                    await onStartWeighing()
                  }
                }}
                // OPTIMIZED: Enable button based on digital-weight display value
                // This makes button responsive to the displayed weight
                disabled={!isZero}
                style={{
                  padding: '6px 14px',
                  fontSize: '12px',
                  height: '32px',
                  opacity: isZero ? 1 : 0.6,
                  cursor: isZero ? 'pointer' : 'not-allowed',
                  transition: 'opacity 0.2s ease' // Smooth transition for better UX
                }}
                title={!isZero ? `Timbangan harus zero sebelum memulai penimbangan (Nilai: ${actualWeight.toFixed(2)}g)` : 'Mulai penimbangan - akan melakukan pengecekan zero terbaru'}
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
                style={{ padding: '6px 14px', fontSize: '12px', height: '32px' }}
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
          // Save with print (default behavior)
          if (onSaveProgress) {
            await onSaveProgress(false) // false = don't skip print
          }
        }}
        onSaveOnly={async () => {
          // Save without print
          if (onSaveProgress) {
            await onSaveProgress(true) // true = skip print
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
