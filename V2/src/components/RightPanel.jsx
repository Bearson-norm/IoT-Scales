import React from 'react'
import { Scale, Printer, Save } from 'lucide-react'

const RightPanel = ({ workOrder, selectedIngredient, currentPage, currentWeight, scaleConnected, onSaveProgress, onCompleteWeighing, isWeighingActive }) => {
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

  // Calculate total accumulated weight (saved + current reading)
  // savedWeight is the accumulated weight saved in database (from previous saves)
  // currentWeight is the current reading from scale (new measurement, not saved yet)
  const savedWeight = parseFloat(selectedIngredient.savedWeight || 0) || 0;
  const currentReading = parseFloat(currentWeight || 0) || 0;
  const totalAccumulated = savedWeight + currentReading; // Display total = saved + current reading
  
  // Use accumulated total for remaining and tolerance checks
  const targetWeight = parseFloat(selectedIngredient.targetWeight) || 0;
  const tolerance = 3;
  const minWeight = Math.max(0, targetWeight - tolerance); // Ensure minWeight doesn't go below 0
  const maxWeight = targetWeight + tolerance;
  const current = totalAccumulated; // Use accumulated total for display
  const withinTolerance = current >= minWeight && current <= maxWeight;
  const over = current > maxWeight;
  const under = current < minWeight;
  const remaining = Math.max(0, targetWeight - current);
  
  // Calculate progress bar range with ADAPTIVE visual gap for tolerance markers
  // Strategy: Use adaptive formula based on targetWeight to ensure tolerance range is always clearly visible
  // For small weights: fixed offset (25g)
  // For large weights: percentage-based to maintain gap visibility
  const toleranceRange = maxWeight - minWeight; // e.g., 6g (from -3 to +3)
  
  // Calculate progressBarMax with adaptive strategy based on target weight
  // Goal: Ensure tolerance range always takes up meaningful visual space (at least 10-15% of bar)
  let progressBarMax;
  if (targetWeight > 0) {
    // Adaptive formula based on target weight
    if (targetWeight <= 100) {
      // Small weights (< 100g): Use fixed offset
      progressBarMax = maxWeight + 25;
      if (progressBarMax < 100) {
        progressBarMax = 100; // Minimum 100g
      }
    } else if (targetWeight <= 500) {
      // Medium weights (100-500g): Use percentage multiplier (5-10% above max)
      // This ensures tolerance range stays visible
      progressBarMax = maxWeight * 1.1; // 10% above maxWeight
    } else if (targetWeight <= 1000) {
      // Large weights (500-1000g): Use smaller percentage multiplier
      progressBarMax = maxWeight * 1.08; // 8% above maxWeight
    } else {
      // Very large weights (> 1000g): Use tolerance-range-based calculation
      // Ensure tolerance range takes at least 20-25% of the bar for maximum visibility
      const minTolerancePercentage = 0.20; // 20% of bar for tolerance range (very visible!)
      const toleranceBasedMax = toleranceRange / minTolerancePercentage;
      
      // For very large weights, prioritize tolerance visibility over percentage multiplier
      // Use tolerance-based calculation, but ensure it's not too small
      // Also ensure it's at least 3% above maxWeight to show some buffer
      progressBarMax = Math.max(
        toleranceBasedMax,      // Priority: tolerance range visibility
        maxWeight * 1.03        // Minimum: 3% above maxWeight
      );
    }
    
    // Ensure progressBarMax is at least 10g more than current weight (if current > maxWeight)
    if (current > maxWeight) {
      const minForCurrent = current * 1.05; // At least 5% above current
      progressBarMax = Math.max(progressBarMax, minForCurrent);
    }
    
    // Final safety check: ensure minimum progressBarMax
    if (progressBarMax < 100) {
      progressBarMax = 100;
    }
  } else {
    progressBarMax = 100;
  }
  
  // Calculate actual percentage that tolerance range occupies in the bar
  const actualTolerancePercentage = (toleranceRange / progressBarMax) * 100;
  const minToTargetGapPercent = ((targetWeight - minWeight) / progressBarMax) * 100;
  const targetToMaxGapPercent = ((maxWeight - targetWeight) / progressBarMax) * 100;
  
  // Determine strategy used for logging
  let strategy = 'adaptive';
  if (targetWeight <= 100) strategy = 'fixed offset (+25g)';
  else if (targetWeight <= 500) strategy = 'percentage (×1.1)';
  else if (targetWeight <= 1000) strategy = 'percentage (×1.08)';
  else strategy = 'tolerance-based (min 20%)';
  
  console.log(`📊 Tolerance visualization (${strategy}): targetWeight=${targetWeight.toFixed(1)}g, maxWeight=${maxWeight.toFixed(1)}g, progressBarMax=${progressBarMax.toFixed(1)}g`);
  console.log(`   Tolerance range=${toleranceRange.toFixed(1)}g (${actualTolerancePercentage.toFixed(1)}% of bar)`);
  console.log(`   Gap min→target: ${minToTargetGapPercent.toFixed(1)}%, Gap target→max: ${targetToMaxGapPercent.toFixed(1)}%`);
  
  // Calculate percentage positions relative to progressBarMax (from left to right: 0% to 100%)
  // With progressBarMax = maxWeight + 25g, tolerance range will take up maximum visual space
  const currentPercent = progressBarMax > 0 ? Math.min(100, Math.max(0, (current / progressBarMax) * 100)) : 0;
  const targetPercent = progressBarMax > 0 ? (targetWeight / progressBarMax) * 100 : 0;
  const minPercent = progressBarMax > 0 ? Math.max(0, (minWeight / progressBarMax) * 100) : 0;
  const maxPercent = progressBarMax > 0 ? Math.min(100, (maxWeight / progressBarMax) * 100) : 0;
  
  // Calculate visual gap percentages for display
  const minToTargetGap = targetPercent - minPercent;
  const targetToMaxGap = maxPercent - targetPercent;

  return (
    <div className="right-panel">
      <div className="weighing-section" style={{ position: 'relative' }}>
        <div className="weighing-title">
          <Scale size={28} />
          Scale
        </div>
        <div className="digital-weight">{current.toFixed(1)} g</div>
        
        <div className="info-badges">
          <div className="info-badge"><div className="label">Work Order</div><div className="value">{workOrder.workOrder}</div></div>
          <div className="info-badge"><div className="label">Formula Name</div><div className="value">{workOrder.formulaName}</div></div>
          <div className="info-badge"><div className="label">Order Qty</div><div className="value">{(workOrder.orderQty || 0).toFixed(1)}</div></div>
        </div>

        <div className="ingredient-details">
          <div className="ingredient-name-large">
            {selectedIngredient.name}
          </div>
          
          {/* Progress bar indicator below ingredient name with tolerance markers - WIDE GAP VISUALIZATION */}
          <div className="progress-bar-container" style={{ 
            marginTop: '10px', 
            marginBottom: '15px',
            width: '100%',
            height: '16px', // Taller for better visibility
            backgroundColor: '#e5e7eb',
            borderRadius: '8px',
            overflow: 'visible',
            position: 'relative',
            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)', // Add depth
            border: '1px solid #d1d5db' // Add border for better definition
          }}>
            {/* Progress fill - shows current weight relative to progressBarMax */}
            <div 
              className="progress-bar-fill"
              style={{
                width: `${currentPercent}%`,
                height: '100%',
                backgroundColor: withinTolerance ? '#22c55e' : (under ? '#eab308' : '#ef4444'),
                transition: 'width 0.3s ease, background-color 0.3s ease',
                borderRadius: '6px',
                position: 'relative',
                zIndex: 1
              }}
            />
            
            {/* Min tolerance marker (blue line on the left) - wider for better visibility */}
            <div
              className="tolerance-marker-line min"
              style={{
                position: 'absolute',
                left: `${minPercent}%`,
                top: '-3px',
                width: '3px', // Wider marker for better visibility
                height: '20px', // Taller marker
                backgroundColor: '#3b82f6',
                zIndex: 2,
                boxShadow: '0 0 4px rgba(59, 130, 246, 0.7), 0 0 2px rgba(59, 130, 246, 0.5)',
                transform: 'translateX(-50%)',
                borderRadius: '1px'
              }}
              title={`Min: ${minWeight.toFixed(1)}g (Range: ${toleranceRange.toFixed(1)}g)`}
            />
            
            {/* Target weight marker (purple line at target position) - wider for better visibility */}
            <div
              className="tolerance-marker-line target"
              style={{
                position: 'absolute',
                left: `${targetPercent}%`,
                top: '-3px',
                width: '3px', // Wider marker for better visibility
                height: '20px', // Taller marker
                backgroundColor: '#6366f1',
                zIndex: 3,
                boxShadow: '0 0 5px rgba(99, 102, 241, 0.8), 0 0 3px rgba(99, 102, 241, 0.6)',
                transform: 'translateX(-50%)',
                borderRadius: '1px'
              }}
              title={`Target: ${targetWeight.toFixed(1)}g (Gap to min: ${minToTargetGap.toFixed(1)}%, Gap to max: ${targetToMaxGap.toFixed(1)}%)`}
            />
            
            {/* Max tolerance marker (blue line on the right) - wider for better visibility */}
            <div
              className="tolerance-marker-line max"
              style={{
                position: 'absolute',
                left: `${maxPercent}%`,
                top: '-3px',
                width: '3px', // Wider marker for better visibility
                height: '20px', // Taller marker
                backgroundColor: '#3b82f6',
                zIndex: 2,
                boxShadow: '0 0 4px rgba(59, 130, 246, 0.7), 0 0 2px rgba(59, 130, 246, 0.5)',
                transform: 'translateX(-50%)',
                borderRadius: '1px'
              }}
              title={`Max: ${maxWeight.toFixed(1)}g (Range: ${toleranceRange.toFixed(1)}g)`}
            />
            
            {/* Current accumulated weight indicator (vertical line showing total position) - enhanced for visibility */}
            {current > 0 && (
              <div
                className="current-weight-marker"
                style={{
                  position: 'absolute',
                  left: `${currentPercent}%`,
                  top: '-5px',
                  width: '4px', // Wider for better visibility
                  height: '24px', // Taller for better visibility
                  backgroundColor: '#1f2937',
                  zIndex: 4,
                  boxShadow: '0 0 6px rgba(0, 0, 0, 0.7), 0 0 3px rgba(0, 0, 0, 0.5)',
                  transform: 'translateX(-50%)',
                  borderRadius: '2px',
                  border: '1px solid rgba(255, 255, 255, 0.3)' // White border for contrast
                }}
                title={`Total: ${current.toFixed(1)}g (Saved: ${savedWeight.toFixed(1)}g + Current: ${currentReading.toFixed(1)}g) | Position: ${currentPercent.toFixed(1)}%`}
              />
            )}
          </div>
          
          {/* Tolerance range labels with visual gap indicators */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: '11px', // Slightly larger font
            color: '#6b7280',
            marginTop: '6px',
            marginBottom: '10px',
            fontWeight: '500'
          }}>
            <span style={{ color: '#3b82f6' }}>Min: {minWeight.toFixed(1)}g</span>
            <span style={{ fontWeight: 'bold', color: '#6366f1', fontSize: '12px' }}>
              Target: {targetWeight.toFixed(1)}g
              <span style={{ fontSize: '9px', fontWeight: 'normal', color: '#9ca3af', marginLeft: '4px' }}>
                (±{toleranceRange.toFixed(1)}g)
              </span>
            </span>
            <span style={{ color: '#3b82f6' }}>Max: {maxWeight.toFixed(1)}g</span>
          </div>
          
          {/* Visual scale indicator showing the range expansion with gap info */}
          <div style={{ 
            fontSize: '9px', 
            color: '#9ca3af', 
            textAlign: 'center', 
            marginTop: '-8px', 
            marginBottom: '5px',
            fontStyle: 'italic'
          }}>
            Visual Range: 0 - {progressBarMax.toFixed(1)}g | Gap Tolerance: {minToTargetGap.toFixed(1)}% / {targetToMaxGap.toFixed(1)}%
          </div>
          
          <div className="weight-display">
            <div className="current-weight">
              {totalAccumulated.toFixed(1)} g
            </div>
            <div className="target-weight">
              / {targetWeight.toFixed(1)} g
            </div>
            {savedWeight > 0 && (
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                (Saved: {savedWeight.toFixed(1)}g + Current: {currentReading.toFixed(1)}g = Total: {totalAccumulated.toFixed(1)}g)
              </div>
            )}
            {(selectedIngredient.progressPercentage || 0) > 0 && (
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                Progress: {(selectedIngredient.progressPercentage || 0).toFixed(1)}% | Remaining: {(selectedIngredient.remainingWeight ? selectedIngredient.remainingWeight.toFixed(1) : remaining.toFixed(1))}g
              </div>
            )}
          </div>

          <div className="tolerance-bar">
            <div
              className="tolerance-fill"
              style={{
                width: `${currentPercent}%`,
                background: withinTolerance ? '#22c55e' : (under ? '#eab308' : '#ef4444')
              }}
            />
            <div
              className="tolerance-marker min"
              style={{ left: `${minPercent}%` }}
            />
            <div
              className="tolerance-marker max"
              style={{ left: `${maxPercent}%` }}
            />
          </div>

          <div className="parameters-grid">
            <div className="parameter-item">
              <div className="parameter-label">Plan Qty</div>
              <div className="parameter-value">
                {targetWeight.toFixed(1)} g
              </div>
            </div>
            
            <div className="parameter-item">
              <div className="parameter-label">Min</div>
              <div className="parameter-value">
                {minWeight.toFixed(1)} g
              </div>
            </div>
            
            <div className="parameter-item">
              <div className="parameter-label">Max</div>
              <div className="parameter-value">
                {maxWeight.toFixed(1)} g
              </div>
            </div>
            
            <div className="parameter-item">
              <div className="parameter-label">Remaining</div>
              <div className="parameter-value remaining">
                {remaining.toFixed(1)} g
              </div>
            </div>
          </div>

          <div className="parameter-item" style={{ gridColumn: '1 / -1' }}>
            <div className="parameter-label">Instruction</div>
            <div className="parameter-value">
              {selectedIngredient.instruction || 'Tidak ada instruksi khusus'}
            </div>
          </div>

          <div className="parameter-item" style={{ gridColumn: '1 / -1' }}>
            <div className="parameter-label">Exp Date</div>
            <div className="parameter-value">
              {selectedIngredient.expDate || '30/08/2027'}
            </div>
          </div>
          
          {/* Tracking Information Section */}
          {((selectedIngredient.progressPercentage || 0) > 0 || selectedIngredient.weighingStartedAt || selectedIngredient.weighingUpdatedAt) && (
            <div className="parameter-item" style={{ gridColumn: '1 / -1', borderTop: '1px solid #e5e7eb', paddingTop: '10px', marginTop: '10px' }}>
              <div className="parameter-label" style={{ fontWeight: 'bold', marginBottom: '8px' }}>Tracking Info</div>
              <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: '1.6' }}>
                {(selectedIngredient.progressPercentage || 0) > 0 && (
                  <div>Progress: <strong>{(selectedIngredient.progressPercentage || 0).toFixed(1)}%</strong></div>
                )}
                {(selectedIngredient.remainingWeight || 0) > 0 && (
                  <div>Remaining: <strong>{(selectedIngredient.remainingWeight || 0).toFixed(1)}g</strong></div>
                )}
                {selectedIngredient.weighingStartedAt && (
                  <div>Started: {new Date(selectedIngredient.weighingStartedAt).toLocaleString()}</div>
                )}
                {selectedIngredient.weighingUpdatedAt && (
                  <div>Last Updated: {new Date(selectedIngredient.weighingUpdatedAt).toLocaleString()}</div>
                )}
                {selectedIngredient.weighingCompletedAt && (
                  <div>Completed: {new Date(selectedIngredient.weighingCompletedAt).toLocaleString()}</div>
                )}
                {selectedIngredient.isWithinTolerance !== null && selectedIngredient.isWithinTolerance !== undefined && (
                  <div>Within Tolerance: <strong style={{ color: selectedIngredient.isWithinTolerance ? '#22c55e' : '#ef4444' }}>
                    {selectedIngredient.isWithinTolerance ? 'Yes' : 'No'}
                  </strong></div>
                )}
              </div>
            </div>
          )}

          <div className="action-buttons">
            <button className="action-btn secondary" onClick={() => window.print()}>
              <Printer size={20} />
              Print
            </button>
            <button className="action-btn primary" onClick={() => { onSaveProgress(); window.print(); }}>
              <Save size={20} />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RightPanel
