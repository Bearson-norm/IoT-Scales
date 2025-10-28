import React from 'react'
import { Scale, Printer, Save } from 'lucide-react'

const RightPanel = ({ workOrder, selectedIngredient, currentPage }) => {
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
              <span className="info-value">{workOrder.orderQty.toFixed(1)}</span>
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

  const remaining = Math.max(0, selectedIngredient.targetWeight - (selectedIngredient.currentWeight || 0))
  const minWeight = selectedIngredient.targetWeight * 0.999
  const maxWeight = selectedIngredient.targetWeight * 1.001

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
            <span className="info-value">{workOrder.orderQty.toFixed(1)}</span>
          </div>
        </div>

        <div className="ingredient-details">
          <div className="ingredient-name-large">
            {selectedIngredient.name}
          </div>
          
          <div className="weight-display">
            <div className="current-weight">
              {(selectedIngredient.currentWeight || 0).toFixed(1)} g
            </div>
            <div className="target-weight">
              / {selectedIngredient.targetWeight.toFixed(1)} g
            </div>
          </div>

          <div className="parameters-grid">
            <div className="parameter-item">
              <div className="parameter-label">Plan Qty</div>
              <div className="parameter-value">
                {selectedIngredient.targetWeight.toFixed(1)} g
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

          <div className="action-buttons">
            <button className="action-btn secondary">
              <Printer size={20} />
              Reprint
            </button>
            <button className="action-btn primary">
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
