// Vibra Scale RS232 Integration
// Format: '+000085.9 G S' -> (sign)(6 digit).(1 digit) spasi unit G/K spasi status S/I

export function parseVibraData(rawData) {
  const match = rawData.match(/^([+-])(\d{6})\.(\d)\s+([GK])\s+([SI])/);
  if (!match) return null;
  
  const [, sign, whole, decimal, unit, status] = match;
  const numericValue = parseFloat(`${sign}${whole}.${decimal}`);
  
  // Convert to kg
  let weightKg = numericValue;
  if (unit === 'G') {
    weightKg = numericValue / 1000; // gram to kg
  } // else unit === 'K', already in kg
  
  return {
    weight: weightKg,
    weightOriginal: numericValue,
    unit: 'kg',
    originalUnit: unit,
    stable: status === 'S',
    raw: rawData.trim()
  };
}

// Normalize Windows COM port (COM10+ needs \\\\.\\ prefix)
export function normalizePort(portPath) {
  if (typeof window === 'undefined' && process.platform === 'win32' && /^COM\d+$/i.test(portPath)) {
    const num = parseInt(portPath.replace(/COM/i, ''), 10);
    if (num >= 10) {
      return `\\\\.\\${portPath}`;
    }
  }
  return portPath;
}

