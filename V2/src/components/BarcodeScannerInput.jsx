import React, { forwardRef } from 'react'

/**
 * Plain text input (manual typing and barcode wedge both accepted).
 * Kept as a named component for backward compatibility with older call sites.
 */
const BarcodeScannerInput = forwardRef(function BarcodeScannerInput(
  { value, onChange, onScanComplete, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      type="text"
      autoComplete="off"
      {...rest}
      value={value ?? ''}
      onChange={(e) => {
        const next = e.target.value
        onChange?.(next)
      }}
      onKeyDown={(e) => {
        rest.onKeyDown?.(e)
        if (e.defaultPrevented) return
        if (e.key === 'Enter') {
          onScanComplete?.(String(value ?? '').trim())
        }
      }}
    />
  )
})

export default BarcodeScannerInput
