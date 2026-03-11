import React, { useState, useEffect, useRef, useCallback } from 'react'
import Login from './components/Login'
import Header from './components/Header'
import LeftPanel from './components/LeftPanel'
import RightPanel from './components/RightPanel'
import RecipePanel from './components/RecipePanel'
import Footer from './components/Footer'
import BarcodeScanner from './components/BarcodeScanner'
import HardwareBarcodeScanner from './components/HardwareBarcodeScanner'
import ProductVerification from './components/ProductVerification'
import Database from './components/DatabaseSKU'
import DatabaseImport from './components/DatabaseImport'
import Settings from './components/Settings'
import History from './components/History'
import HistoryDetail from './components/HistoryDetail'
import UserManagement from './components/UserManagement'
import WeighingReceiverList from './components/weighing-receiver/WeighingReceiverList'
import WeighingReceiverDetail from './components/weighing-receiver/WeighingReceiverDetail'
import MOScanModal from './components/MOScanModal'
import { getCurrentTime } from './utils/timeUtils.js'
import { AlertModalProvider, useAlert } from './utils/alertModal'
import { createDefaultLabelTemplate, mergeTemplateWithDefaults } from './utils/labelTemplates'
// historyStore removed; history now persisted in PostgreSQL via server endpoints

const BASE_DEFAULT_LABEL_TEMPLATE = createDefaultLabelTemplate({
  id: 'default-label-72x100',
  name: 'Label 72 × 100 mm (Default)'
})

const cloneDefaultLabelTemplate = () =>
  mergeTemplateWithDefaults({
    ...BASE_DEFAULT_LABEL_TEMPLATE,
    layout: { ...BASE_DEFAULT_LABEL_TEMPLATE.layout }
  })

function AppContent() {
  const { alert } = useAlert()
  const [currentTime, setCurrentTime] = useState(getCurrentTime())
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [currentPage, setCurrentPage] = useState('home')
  const [workOrder, setWorkOrder] = useState(null)
  const [recipe, setRecipe] = useState([])
  const [selectedIngredient, setSelectedIngredient] = useState(null)
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [showProductVerification, setShowProductVerification] = useState(false)
  const [scanType, setScanType] = useState('') // 'mo', 'sku', 'quantity', 'ingredient'
  const [useHardwareScanner, setUseHardwareScanner] = useState(true) // Toggle untuk scanner hardware
  const [showMOScanModal, setShowMOScanModal] = useState(false)
  const [isWeighingActive, setIsWeighingActive] = useState(false)
  const [currentWeight, setCurrentWeight] = useState(0)
  const [scaleConnected, setScaleConnected] = useState(false)
  const [zeroCheckWeight, setZeroCheckWeight] = useState(0) // Weight before weighing starts (should be 0)
  const [scaleDisplayWeight, setScaleDisplayWeight] = useState(0) // Real-time weight from scale for digital display
  const [isCheckingZero, setIsCheckingZero] = useState(false) // Status saat melakukan zero check
  
  // Printer configuration state
  const [printerConfig, setPrinterConfig] = useState(() => ({
    printMethod: 'windows-raw', // 'windows-raw', 'network-tcp', 'serial-com'
    printerPort: 'Xprinter XP-420B', // For windows-raw
    printerIP: '192.168.1.100', // For network-tcp
    networkPort: 9100, // For network-tcp
    comPort: 'COM3', // For serial-com
    baudRate: 9600, // For serial-com
    labelTemplates: [cloneDefaultLabelTemplate()],
    activeLabelTemplateId: BASE_DEFAULT_LABEL_TEMPLATE.id
  }))

  const getActiveLabelTemplate = useCallback(() => {
    const templates = printerConfig.labelTemplates || []
    const activeTemplate = templates.find(t => t.id === printerConfig.activeLabelTemplateId)
    return activeTemplate || templates[0] || cloneDefaultLabelTemplate()
  }, [printerConfig])

  // Auto Save configuration state
  const [autoSaveConfig, setAutoSaveConfig] = useState({
    enabled: false,
    counterTime: 3,      // seconds
    threshold: 0.5,      // grams
    onlyInRange: true    // only auto save when in tolerance range
  })

  // Auto Save state management (prevent race conditions)
  const [autoSaveState, setAutoSaveState] = useState({
    isSaving: false,           // Flag to prevent concurrent saves
    lastSavedWeight: 0,        // Last weight that was saved
    lastCheckedWeight: 0,      // Last weight that was checked
    counterStartTime: null,    // When counter started
    counterInterval: null,     // Counter interval ID
    samplingInterval: null,    // Sampling interval ID (for range verification)
    samples: [],               // Array of samples taken during counter (for verification)
    isInRange: true            // Flag to track if weight is still in range during counter
  })

  // Load printer configuration from localStorage on mount and listen for changes
  useEffect(() => {
    const loadPrinterConfig = () => {
      const savedPrinterConfig = localStorage.getItem('printerConfig')
      if (!savedPrinterConfig) {
        return
      }

      try {
        const config = JSON.parse(savedPrinterConfig)

        const templatesFromStorage = Array.isArray(config.labelTemplates)
          ? config.labelTemplates.map(mergeTemplateWithDefaults)
          : null

        let templates = templatesFromStorage && templatesFromStorage.length > 0
          ? templatesFromStorage
          : [
              mergeTemplateWithDefaults({
                id: config.activeLabelTemplateId || BASE_DEFAULT_LABEL_TEMPLATE.id,
                name: config.labelTemplateName || 'Label Custom',
                width: config.labelWidth ?? BASE_DEFAULT_LABEL_TEMPLATE.width,
                height: config.labelHeight ?? BASE_DEFAULT_LABEL_TEMPLATE.height,
                dpi: config.labelDPI ?? BASE_DEFAULT_LABEL_TEMPLATE.dpi,
                layout: config.layout || {}
              })
            ]

        // Ensure templates have unique IDs
        templates = templates.map((template, index) => {
          if (!template.id) {
            return mergeTemplateWithDefaults({
              ...template,
              id: index === 0 ? BASE_DEFAULT_LABEL_TEMPLATE.id : undefined
            })
          }
          return template
        })

        const activeTemplateId = templates.some(t => t.id === config.activeLabelTemplateId)
          ? config.activeLabelTemplateId
          : templates[0].id

        setPrinterConfig(prev => ({
          ...prev,
          printMethod: config.printMethod || prev.printMethod,
          printerPort: config.printerPort || prev.printerPort,
          printerIP: config.printerIP || prev.printerIP,
          networkPort: config.networkPort || prev.networkPort,
          comPort: config.comPort || prev.comPort,
          baudRate: config.baudRate || prev.baudRate,
          labelTemplates: templates,
          activeLabelTemplateId: activeTemplateId
        }))
      } catch (e) {
        console.warn('Failed to load printer config from localStorage:', e)
      }
    }

    // Load on mount
    loadPrinterConfig()

    // Listen for storage changes (when Settings component saves)
    const handleStorageChange = (e) => {
      if (e.key === 'printerConfig') {
        loadPrinterConfig()
      }
    }
    window.addEventListener('storage', handleStorageChange)

    // Also listen for custom event (for same-tab updates)
    const handleCustomStorageChange = () => {
      loadPrinterConfig()
    }
    window.addEventListener('printerConfigUpdated', handleCustomStorageChange)

    // Also try to load from server
    fetch('http://localhost:3001/api/print/config')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.config) {
          setPrinterConfig(prev => ({
            ...prev,
            printerPort: data.config.port || prev.printerPort
          }))
        }
      })
      .catch(e => console.warn('Failed to load printer config from server:', e))

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('printerConfigUpdated', handleCustomStorageChange)
    }
  }, [])

  // Load autosave configuration from localStorage on mount and listen for changes
  useEffect(() => {
    const loadAutoSaveConfig = () => {
      try {
        const savedAutoSaveConfig = localStorage.getItem('autoSaveConfig')
        if (savedAutoSaveConfig) {
          const config = JSON.parse(savedAutoSaveConfig)
          setAutoSaveConfig(prev => ({
            ...prev,
            enabled: config.autoSaveEnabled !== undefined ? config.autoSaveEnabled : prev.enabled,
            counterTime: config.autoSaveCounterTime !== undefined ? config.autoSaveCounterTime : prev.counterTime,
            threshold: config.autoSaveThreshold !== undefined ? config.autoSaveThreshold : prev.threshold,
            onlyInRange: config.autoSaveOnlyInRange !== undefined ? config.autoSaveOnlyInRange : prev.onlyInRange
          }))
          console.log('✅ Auto save config loaded from localStorage:', {
            enabled: config.autoSaveEnabled,
            counterTime: config.autoSaveCounterTime,
            threshold: config.autoSaveThreshold,
            onlyInRange: config.autoSaveOnlyInRange
          })
        } else {
          console.log('ℹ️ No autosave config found in localStorage, using defaults')
        }
      } catch (e) {
        console.warn('Failed to load autosave config from localStorage:', e)
      }
    }

    // Load on mount
    loadAutoSaveConfig()

    // Listen for storage changes (when Settings component saves)
    const handleStorageChange = (e) => {
      if (e.key === 'autoSaveConfig') {
        loadAutoSaveConfig()
      }
    }
    window.addEventListener('storage', handleStorageChange)

    // Also listen for custom event (for same-tab updates)
    const handleAutoSaveConfigUpdated = () => {
      loadAutoSaveConfig()
    }
    window.addEventListener('autoSaveConfigUpdated', handleAutoSaveConfigUpdated)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('autoSaveConfigUpdated', handleAutoSaveConfigUpdated)
    }
  }, [])

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Zero check: Now uses WebSocket instead of HTTP polling
  // Zero check weight is updated from WebSocket data when ingredient is selected but weighing not active
  // This eliminates HTTP polling completely
  useEffect(() => {
    if (!selectedIngredient || isWeighingActive) {
      if (!isWeighingActive && !selectedIngredient) {
        // Reset zero check weight when no ingredient selected and not weighing
        setZeroCheckWeight(0)
      }
      setIsCheckingZero(false)
      return
    }

    // Zero check is now handled by WebSocket - no HTTP polling needed
    setIsCheckingZero(true)
    console.log('✅ Zero check enabled for ingredient:', selectedIngredient?.name, '- Using WebSocket for real-time updates')
  }, [selectedIngredient, isWeighingActive])

  // CRITICAL: Sync selectedIngredient with recipe state to ensure savedWeight is always up-to-date
  // This ensures that when recipe state is updated (e.g., after save), selectedIngredient also gets updated
  useEffect(() => {
    if (selectedIngredient && recipe.length > 0) {
      const matchingIngredient = recipe.find(ing => 
        ing.id === selectedIngredient.id || 
        ing.code === selectedIngredient.code ||
        ing.name === selectedIngredient.name
      )
      
      if (matchingIngredient && matchingIngredient.savedWeight !== selectedIngredient.savedWeight) {
        // Update selectedIngredient with latest savedWeight from recipe state
        setSelectedIngredient(prev => ({
          ...prev,
          savedWeight: matchingIngredient.savedWeight,
          targetWeight: matchingIngredient.targetWeight,
          totalWeight: matchingIngredient.totalWeight || (matchingIngredient.savedWeight + (prev.currentWeight || 0)),
          status: matchingIngredient.status
        }))
      }
    }
  }, [recipe, selectedIngredient?.id]) // Only re-run when recipe or selectedIngredient.id changes

  // Real-time scale reading using WebSocket (much faster than HTTP polling)
  // Only active when weighing is started
  useEffect(() => {
    // CRITICAL: Update refs immediately to track latest state for race condition prevention
    isWeighingActiveRef.current = isWeighingActive
    selectedIngredientRef.current = selectedIngredient
    
    // CRITICAL: Only allow weighing when both isWeighingActive AND selectedIngredient are valid
    // This prevents stuck state where scale reading continues after save
    // IMPORTANT: Use a longer delay and check refs to prevent race conditions where state updates might temporarily
    // cause isWeighingActive or selectedIngredient to be false/null during updates
    // CRITICAL: Don't reset if we're actively receiving weight data (indicates weighing is active)
    if (!isWeighingActive || !selectedIngredient) {
      // Use a longer timeout to prevent race conditions - only reset if condition persists
      // CRITICAL: Check refs in timeout to ensure condition is still true after delay
      // CRITICAL: Also check if we have recent weight data to prevent reset during active weighing
      // CRITICAL: BUT if scale reading is 0 (zeroCheckWeight), we should reset even if currentWeightRef > 0
      const resetTimeout = setTimeout(() => {
        // Double-check condition using refs (which reflect latest state) to prevent race conditions
        // Only reset if condition is STILL false after timeout (not just a temporary state update)
        if (!isWeighingActiveRef.current || !selectedIngredientRef.current) {
          // CRITICAL: Check if scale reading is 0 or near 0 (within 0.5g tolerance)
          // If scale shows 0, we should reset even if currentWeightRef > 0 (user removed weight)
          const scaleIsZero = Math.abs(zeroCheckWeight) < 0.5
          
          // CRITICAL: Check if we have recent weight data - if yes, don't reset (weighing is active)
          // BUT if scale is 0, we should reset (user removed weight from scale)
          // This prevents reset during active weighing when state might temporarily be false/null
          // BUT allows reset when scale is actually 0 (user removed weight)
          const hasRecentWeight = currentWeightRef.current > 0
          
          // Only reset if we're truly not weighing AND (we don't have recent weight data OR scale is 0)
          // This prevents reset during active weighing BUT allows reset when scale is 0
          const shouldReset = !isWeighingActiveRef.current && 
                             !selectedIngredientRef.current && 
                             (!hasRecentWeight || scaleIsZero)
          
          if (shouldReset) {
            if (scaleIsZero && hasRecentWeight) {
              console.log('🔄 Resetting currentWeight - scale is 0, resetting even though previous weight was:', currentWeightRef.current)
            } else {
              console.log('🔄 Resetting currentWeight - weighing not active and no recent weight data')
            }
      setCurrentWeight(0)
      // CRITICAL: Don't reset scaleDisplayWeight here - it should show actual scale reading
      // scaleDisplayWeight is updated from WebSocket and should reflect real-time scale value
      // Only reset if we're sure scale is actually 0 (handled by WebSocket message handler)
      // CRITICAL: Reset currentWeight in recipe state when weighing stops
      // This ensures no ingredient has stuck currentWeight when not actively weighing
        setRecipe(prev => prev.map(ing => ({
          ...ing,
          currentWeight: 0  // Reset all currentWeight when weighing is not active
        })))
            // CRITICAL: Also reset ref to ensure consistency
            currentWeightRef.current = 0
          } else {
            // Don't reset if we have recent weight data AND scale is not 0 (weighing is likely active)
            if (hasRecentWeight && !scaleIsZero) {
              console.log('⚠️ Skipping reset - recent weight data detected and scale is not 0 (weighing likely active):', {
                currentWeight: currentWeightRef.current,
                zeroCheckWeight: zeroCheckWeight
              })
            }
          }
        }
      }, 1000) // Longer delay (1 second) to prevent race conditions from temporary state updates
      
      return () => {
        clearTimeout(resetTimeout)
      }
    }

    // CRITICAL: WebSocket should ALWAYS be connected to receive real-time scale readings
    // This ensures scaleDisplayWeight is always updated for digital-weight display
    // WebSocket should connect immediately, even before selectedIngredient is set
    // This fixes the issue where digital-weight freezes at 0 before Start button is clicked
    // Use null if no ingredient selected (WebSocket will still connect for scale display)
    const currentIngredientId = selectedIngredient ? (selectedIngredient.id || selectedIngredient.code) : null

    // WebSocket connection for real-time scale data
    // CRITICAL: Use explicit backend port (3001) instead of window.location.host
    // This ensures WebSocket connects to the correct server even when frontend is on different port
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const backendHost = window.location.hostname || 'localhost'
    const backendPort = '3001' // Backend server port
    const wsUrl = `${wsProtocol}//${backendHost}:${backendPort}/ws/scale`
    let ws = null
    let reconnectTimeout = null
    let reconnectAttempts = 0
    const MAX_RECONNECT_ATTEMPTS = 3 // Reduced from 5 to prevent excessive reconnection attempts
    let fallbackInterval = null // Fallback to HTTP polling if WebSocket fails
    let useWebSocket = true
    let lastReconnectTime = 0
    const RECONNECT_COOLDOWN = 5000 // 5 seconds cooldown between reconnect attempts
    let connectedIngredientId = null // Track which ingredient ID the WebSocket is connected for

    let isConnecting = false // Prevent multiple simultaneous connection attempts
    
    const connectWebSocket = () => {
      // Prevent multiple simultaneous connection attempts
      if (isConnecting || (ws && ws.readyState === WebSocket.CONNECTING)) {
        return
      }
      
      // Close existing connection if any
      if (ws) {
        try {
          ws.close()
        } catch (e) {
          // Ignore errors when closing
        }
        ws = null
      }
      
      try {
        isConnecting = true
        ws = new WebSocket(wsUrl)
        
        ws.onopen = () => {
          isConnecting = false
          reconnectAttempts = 0 // Reset reconnect attempts on successful connection
          lastReconnectTime = 0 // Reset last reconnect time
          connectedIngredientId = currentIngredientId // Track which ingredient we're connected for
          // Clear any fallback polling
          if (fallbackInterval) {
            clearInterval(fallbackInterval)
            fallbackInterval = null
          }
          useWebSocket = true // Ensure WebSocket is marked as active
          console.log('✅ WebSocket CONNECTED - digital-weight display will now update in real-time')
          console.log('📡 Current scaleDisplayWeight:', scaleDisplayWeight, 'g')
        }
        
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            
            // Handle scale data - optimized for seamless real-time updates
            if (message.type === 'scale_data' && message.success && message.weight !== undefined) {
              // Weight is now always in grams from server
              // CRITICAL: Always update scaleDisplayWeight FIRST with actual weight value
              // This ensures digital-weight display always shows real-time scale reading without freeze
              // scaleDisplayWeight is updated on EVERY WebSocket message, regardless of conditions
              // This ensures continuous data flow without interruption
              // CRITICAL: Update scaleDisplayWeight even if weight is null/undefined/invalid to prevent freeze
              // If weight is invalid, use 0 to ensure display doesn't freeze
              let weightGrams = message.weight
              
              // CRITICAL: Always update scaleDisplayWeight FIRST - this ensures continuous data flow
              // Calculate roundedWeight immediately for display consistency
              // This MUST be done BEFORE any validation or early return to prevent freeze
              let roundedWeight = 0
              if (weightGrams === null || weightGrams === undefined || typeof weightGrams !== 'number' || isNaN(weightGrams)) {
                console.log('⚠️ Invalid weight value received, setting scaleDisplayWeight to 0 to prevent freeze:', weightGrams);
                roundedWeight = 0
              } else {
                roundedWeight = Math.round(weightGrams * 10) / 10
              }
              
              // CRITICAL: Update scaleDisplayWeight IMMEDIATELY, before any validation or early return
              // This ensures digital-weight ALWAYS shows real-time value, regardless of validation
              setScaleDisplayWeight(roundedWeight)
              
              // Now check if weight is invalid and skip further processing
              if (weightGrams === null || weightGrams === undefined || typeof weightGrams !== 'number' || isNaN(weightGrams)) {
                return; // Skip further processing if weight is invalid
              }
              
              // CRITICAL: If weight is 0 or near 0 and not actively weighing, reset currentWeight
              // This ensures that when user removes weight from scale, frontend resets even if previous weight was stored
              // scaleDisplayWeight already updated above
              if (Math.abs(weightGrams) < 0.5 && (!isWeighingActive || !selectedIngredient)) {
                if (currentWeightRef.current > 0) {
                  console.log('🔄 Scale reading is 0, resetting currentWeight from', currentWeightRef.current, 'to 0 (WebSocket)')
                  setCurrentWeight(0)
                  currentWeightRef.current = 0
                  // Also reset in recipe state
                  setRecipe(prev => prev.map(ing => ({
                    ...ing,
                    currentWeight: 0
                  })))
                }
                // REMOVED: Zero check weight update - user requested to remove zero check
                // Don't return here - continue to update scaleDisplayWeight below
              }
              
              // CRITICAL: Validate weight range to catch parsing errors
              // Check for suspiciously small values when we expect larger ones
              // Also check for values that seem truncated (e.g., 442 -> 42.2)
              // CRITICAL: Only block if we're confident it's a parsing error, not a real weight change
              if (currentWeight > 100 && weightGrams > 0) {
                // If previous weight was large and new weight is much smaller, it might be truncated
                const ratio = weightGrams / currentWeight;
                
                // CRITICAL: Log raw message for debugging parsing errors
                console.log('🔍 Weight validation check:', {
                  previousWeight: currentWeight,
                  newWeight: weightGrams,
                  ratio: ratio.toFixed(4),
                  rawMessage: message.raw || message,
                  unit: message.unit || 'g'
                });
                
                // CRITICAL: More aggressive validation for truncation
                // If new weight is less than 30% of previous AND previous was > 100g, it's likely truncated
                // This catches cases like:
                // - 138.3 -> 8.3 (ratio 0.06 = 6%)
                // - 138.3 -> 38.3 (ratio 0.277 = 27.7%, truncation of first digit)
                // - 166 -> 8.3 (ratio 0.05 = 5%)
                // - 720 -> 9.9 (ratio 0.014 = 1.4%)
                if (ratio < 0.30 && currentWeight > 100) {
                  // Get raw message string for validation
                  const rawMessageStr = typeof message.raw === 'string' ? message.raw : (message.raw ? JSON.stringify(message.raw) : '');
                  const hasPrefix = /^(ST|US)[,:]/.test(rawMessageStr);
                  
                  // CRITICAL: Detect truncation patterns
                  // Pattern 1: Ratio < 6% (very likely truncation, e.g., 138 -> 8, 166 -> 8.3)
                  // Pattern 2: Ratio < 10% AND new weight < 20g (truncation pattern)
                  // Pattern 3: Ratio < 10% AND no prefix AND new weight < 50g (truncated data without prefix)
                  // Pattern 4: Ratio < 10% AND new weight < 10g (very small weight, likely truncation)
                  // Pattern 5: Ratio 20-30% AND new weight matches pattern of missing first digit (e.g., 138.3 -> 38.3)
                  //   - Check if new weight is approximately 10x smaller (missing first digit)
                  //   - Check if new weight digits match last digits of previous weight
                  const isMissingFirstDigit = ratio >= 0.20 && ratio < 0.30 && 
                                            currentWeight > 100 && 
                                            weightGrams > 10 &&
                                            Math.abs(weightGrams - (currentWeight % 100)) < 5; // Last 2 digits match
                  
                  const isLikelyTruncated = ratio < 0.06 || 
                                           (ratio < 0.10 && weightGrams < 20) ||
                                           (ratio < 0.10 && !hasPrefix && weightGrams < 50) ||
                                           (ratio < 0.10 && weightGrams < 10) ||
                                           isMissingFirstDigit;
                  
                  if (isLikelyTruncated) {
                    console.error('❌ CRITICAL: Truncated weight detected (WebSocket):', {
                      previousWeight: currentWeight,
                      newWeight: weightGrams,
                      ratio: ratio.toFixed(4),
                      rawMessage: rawMessageStr || (message.raw ? 'object' : 'missing'),
                      hasPrefix: hasPrefix,
                      message: message
                    });
                    // Don't update if it looks like truncation
                    return;
                  }
                  
                  // If ratio is 5-10% and doesn't match truncation pattern, log warning but allow
                  console.warn('⚠️ Possible weight drop detected (WebSocket):', {
                    previousWeight: currentWeight,
                    newWeight: weightGrams,
                    ratio: ratio.toFixed(4),
                    rawMessage: rawMessageStr || (message.raw ? 'object' : 'missing'),
                    hasPrefix: hasPrefix,
                    message: message
                  });
                }
              }
              
              // Check for suspiciously small values when we expect larger ones
              // CRITICAL: Only block if weight is very small (< 5g) when previous was large (> 100g)
              // This prevents blocking legitimate small weights
              if (weightGrams > 0 && weightGrams < 5 && currentWeight > 100) {
                console.warn('⚠️ Suspicious weight drop detected (very small value):', {
                  previousWeight: currentWeight,
                  newWeight: weightGrams,
                  rawMessage: message.raw || message,
                  message: message
                });
                // Don't update if the drop seems too large (likely parsing error)
                // Only update if the change is reasonable
                if (Math.abs(weightGrams - currentWeight) > currentWeight * 0.9) {
                  console.warn('⚠️ Skipping weight update - suspicious drop too large');
                  return;
                }
              }
              
              // CRITICAL: Update refs immediately to track latest weight for reset prevention
              currentWeightRef.current = weightGrams
              
              // NOTE: scaleDisplayWeight already updated at the beginning of handler (before all validations)
              // This ensures digital-weight ALWAYS shows real-time value without freeze
              
              // CRITICAL: Only update currentWeight if we're still in weighing mode to prevent fluktuasi
              // Check conditions before updating to prevent race conditions
              // CRITICAL: Also check refs to handle temporary state updates
              if ((isWeighingActive || isWeighingActiveRef.current) && 
                  (selectedIngredient || selectedIngredientRef.current)) {
                // CRITICAL: Only update currentWeight if weight actually changed (prevent unnecessary re-renders)
                // Since data from scale is stable, we don't need to update for every message
                const roundedCurrent = Math.round(currentWeight * 10) / 10
                const change = roundedWeight - roundedCurrent // Signed change (positive = increase, negative = decrease)
                const absChange = Math.abs(change)
                
                // Update for increases of any size OR decreases >= 0.1g (lower threshold for accuracy)
                // This ensures we track weight being added while maintaining accurate measurement display
                const shouldUpdate = change > 0 || absChange >= 0.1
                if (!shouldUpdate) {
                  return // Skip update if weight hasn't changed significantly (only for very small decreases < 0.1g)
                }
                
                // CRITICAL: Use rounded value consistently to prevent jitter and inconsistencies
                // Always use roundedWeight, not weightGrams, to ensure consistency
                
                // CRITICAL: Update ref immediately to prevent reset during active weighing
                currentWeightRef.current = roundedWeight
                
                // Direct update without requestAnimationFrame for more responsive display
                // Data from scale is already stable, so no need for animation frame batching
                setCurrentWeight(roundedWeight) // Use rounded value for consistency
              
                // Batch state updates for better performance
              // IMPORTANT: Only update the ingredient that matches currentIngredientId
                // CRITICAL: Use multiple matching strategies to ensure correct ingredient is updated
                // CRITICAL: Get savedWeight from recipe state (not selectedIngredient) to ensure latest value
                setRecipe(prev => {
                  // Find the ingredient in current recipe state to get latest savedWeight
                  const currentIngredient = prev.find(ing => 
                    ing.id === currentIngredientId || 
                    ing.code === selectedIngredient?.code ||
                    (selectedIngredient?.name && ing.name === selectedIngredient.name)
                  )
                  
                  // Use savedWeight from recipe state (which is updated after save), not from selectedIngredient
                  const savedWeight = currentIngredient?.savedWeight || selectedIngredient?.savedWeight || 0
                  const totalWeight = savedWeight + roundedWeight
                  
                  return prev.map(ing => {
                    // Match by id (primary), or by code (fallback), or by name (last resort)
                    const matches = ing.id === currentIngredientId || 
                                   ing.code === selectedIngredient?.code ||
                                   (selectedIngredient?.name && ing.name === selectedIngredient.name)
                    
                    if (matches) {
                      // CRITICAL: Use savedWeight from recipe state (ing.savedWeight) which is the latest value
                      const ingredientSavedWeight = ing.savedWeight || savedWeight
                      const ingredientTotalWeight = ingredientSavedWeight + roundedWeight
                      
                  return { 
                    ...ing, 
                    currentWeight: roundedWeight,
                        totalWeight: ingredientTotalWeight,
                        savedWeight: ingredientSavedWeight  // Preserve savedWeight from recipe state
                  }
                }
                // CRITICAL: Don't reset currentWeight for other ingredients immediately
                // Only reset if we're sure they're not being weighed
                // This prevents fluktuasi where weight jumps between actual value and 0
                // Keep their currentWeight as is to prevent unnecessary resets
                return ing
                  })
                })
              
                // Also update selectedIngredient state with latest values from recipe
                // CRITICAL: Sync selectedIngredient with recipe state to ensure savedWeight is up-to-date
              setSelectedIngredient(prev => {
                if (prev && prev.id === currentIngredientId) {
                    // Get latest savedWeight from recipe state
                    const latestIngredient = recipe.find(ing => 
                      ing.id === currentIngredientId || 
                      ing.code === prev.code ||
                      ing.name === prev.name
                    )
                    const latestSavedWeight = latestIngredient?.savedWeight || prev.savedWeight || 0
                    const latestTotalWeight = latestSavedWeight + roundedWeight
                    
                  return {
                    ...prev,
                      savedWeight: latestSavedWeight,  // Use latest savedWeight from recipe state
                      totalWeight: latestTotalWeight,
                    currentWeight: roundedWeight
                  }
                }
                return prev
                })
              } else {
                // If not in weighing mode, don't update to prevent fluktuasi
                // This prevents race conditions where weight updates arrive after weighing stops
              }
            }
          } catch (e) {
            console.debug('WebSocket message parse error:', e.message)
          }
        }
        
        ws.onerror = (error) => {
          isConnecting = false
          // Don't log every error - only log significant ones to reduce console spam
          // The onclose handler will handle reconnection logic
        }
        
        ws.onclose = (event) => {
          isConnecting = false
          
          // Don't reconnect if it was a normal close (code 1000) or if ingredient changed
          if (event.code === 1000) {
            connectedIngredientId = null // Reset on normal close
            return // Normal close, don't reconnect
          }
          
          // Check if ingredient changed while connection was closing
          // CRITICAL: Allow reconnection even if no ingredient selected (for scaleDisplayWeight updates)
          const closingIngredientId = selectedIngredient ? (selectedIngredient.id || selectedIngredient.code) : null
          if (connectedIngredientId !== closingIngredientId && closingIngredientId !== null) {
            // Ingredient changed (and we have a new ingredient), don't reconnect
            // But if closingIngredientId is null, we should still reconnect for scaleDisplayWeight updates
            connectedIngredientId = null
            return
          }
          
          // Only fallback to HTTP polling if we've exhausted reconnect attempts
          if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.warn('⚠️ WebSocket reconnection failed after', reconnectAttempts, 'attempts. Falling back to HTTP polling.')
            useWebSocket = false
            connectedIngredientId = null
            startFallbackPolling()
            return
          }
          
          // CRITICAL: Try to reconnect even if no ingredient selected
          // This ensures WebSocket stays connected for scaleDisplayWeight updates
          // WebSocket should remain connected to receive real-time scale readings
          const reconnectIngredientId = selectedIngredient ? (selectedIngredient.id || selectedIngredient.code) : null
          if (useWebSocket && reconnectAttempts < MAX_RECONNECT_ATTEMPTS && connectedIngredientId === reconnectIngredientId) {
            const now = Date.now()
            const timeSinceLastReconnect = now - lastReconnectTime
            
            // Enforce cooldown period to prevent rapid reconnection attempts
            if (timeSinceLastReconnect < RECONNECT_COOLDOWN) {
              const remainingCooldown = RECONNECT_COOLDOWN - timeSinceLastReconnect
              reconnectTimeout = setTimeout(() => {
                // Double-check conditions and ingredient ID before reconnecting
                // CRITICAL: Allow reconnection even if no ingredient selected (for scaleDisplayWeight updates)
                const finalIngredientId = selectedIngredient ? (selectedIngredient.id || selectedIngredient.code) : null
                if (useWebSocket && !isConnecting && connectedIngredientId === finalIngredientId) {
                  reconnectAttempts++
                  lastReconnectTime = Date.now()
                  const delay = Math.min(1000 * reconnectAttempts, 5000) // Exponential backoff, max 5s
                  reconnectTimeout = setTimeout(() => {
                    // Triple-check ingredient ID before reconnecting
                    const stillFinalIngredientId = selectedIngredient ? (selectedIngredient.id || selectedIngredient.code) : null
                    if (useWebSocket && !isConnecting && connectedIngredientId === stillFinalIngredientId) {
                      connectWebSocket()
                    }
                  }, delay)
                }
              }, remainingCooldown)
              return
            }
            
            reconnectAttempts++
            lastReconnectTime = now
            const delay = Math.min(1000 * reconnectAttempts, 5000) // Exponential backoff, max 5s
            reconnectTimeout = setTimeout(() => {
              // Double-check conditions and ingredient ID before reconnecting
              // CRITICAL: Allow reconnection even if no ingredient selected (for scaleDisplayWeight updates)
              const finalIngredientId = selectedIngredient ? (selectedIngredient.id || selectedIngredient.code) : null
              if (useWebSocket && !isConnecting && connectedIngredientId === finalIngredientId) {
                connectWebSocket()
              }
            }, delay)
          } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            // After max attempts, stop trying and fallback to HTTP polling
            console.warn('⚠️ WebSocket reconnection failed after', reconnectAttempts, 'attempts. Falling back to HTTP polling.')
            useWebSocket = false
            connectedIngredientId = null
            startFallbackPolling()
          } else if (connectedIngredientId !== reconnectIngredientId && reconnectIngredientId !== null) {
            // Ingredient changed (and we have a new ingredient), don't reconnect
            // But if reconnectIngredientId is null, we should still reconnect for scaleDisplayWeight updates
            connectedIngredientId = null
          }
        }
      } catch (e) {
        isConnecting = false
        // Only fallback if we can't even create the WebSocket object and we've exceeded max attempts
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.warn('⚠️ WebSocket connection failed after', reconnectAttempts, 'attempts. Using HTTP polling.')
          useWebSocket = false
          startFallbackPolling()
        } else if (useWebSocket) {
          // CRITICAL: Allow reconnection even if no ingredient selected (for scaleDisplayWeight updates)
          const now = Date.now()
          const timeSinceLastReconnect = now - lastReconnectTime
          
          // Enforce cooldown period
          if (timeSinceLastReconnect >= RECONNECT_COOLDOWN) {
            reconnectAttempts++
            lastReconnectTime = now
            const delay = Math.min(1000 * reconnectAttempts, 5000)
            reconnectTimeout = setTimeout(() => {
              if (useWebSocket && !isConnecting) {
                connectWebSocket()
              }
            }, delay)
          } else {
            // Wait for cooldown period
            const remainingCooldown = RECONNECT_COOLDOWN - timeSinceLastReconnect
            reconnectTimeout = setTimeout(() => {
              if (useWebSocket && !isConnecting && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++
                lastReconnectTime = Date.now()
                const delay = Math.min(1000 * reconnectAttempts, 5000)
                reconnectTimeout = setTimeout(() => {
                  if (useWebSocket && !isConnecting) {
                    connectWebSocket()
                  }
                }, delay)
              }
            }, remainingCooldown)
          }
        }
      }
    }

    // Fallback HTTP polling - DISABLED: WebSocket is the only method
    // This function is kept for emergency fallback only but should never be called
    const startFallbackPolling = () => {
      console.error('❌ ERROR: HTTP polling fallback should not be used! WebSocket must be working.')
      console.error('❌ Please check WebSocket connection. Falling back to HTTP polling as last resort.')
      // CRITICAL: Clear any existing interval first to prevent multiple polling
      if (fallbackInterval) {
        clearInterval(fallbackInterval)
        fallbackInterval = null
      }
      
      let isPolling = false // Prevent concurrent requests
      let retryDelay = 2000 // Increased delay to reduce server load - this should not be used
      
      // Helper function to safely restart polling with new delay
      const restartPolling = (newDelay) => {
        // CRITICAL: Clear existing interval first
        if (fallbackInterval) {
          clearInterval(fallbackInterval)
          fallbackInterval = null
        }
        // Wait a bit to ensure cleanup is complete
        setTimeout(() => {
          if (isWeighingActive && selectedIngredient) {
            retryDelay = newDelay
            fallbackInterval = setInterval(pollScale, retryDelay)
          }
        }, 50)
      }
      
      const pollScale = async () => {
        // Prevent concurrent requests
        if (isPolling) {
          return
        }

        // CRITICAL: Check if still active before polling
        if (!isWeighingActive || !selectedIngredient) {
          if (fallbackInterval) {
            clearInterval(fallbackInterval)
            fallbackInterval = null
          }
          return
        }

        isPolling = true
        try {
          const resp = await fetch('/api/scale/read', {
            // Optimize for low latency
            cache: 'no-cache',
            headers: {
              'Cache-Control': 'no-cache'
            }
          })
          if (!resp.ok) {
            if (resp.status === 429) {
              // Too many requests - respect retry-after header if available
              const retryAfterHeader = resp.headers.get('Retry-After')
              const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : null
              const newDelay = retryAfterSeconds 
                ? Math.max(retryAfterSeconds * 1000, retryDelay * 1.2) // Use retry-after or increase by 20%
                : Math.min(retryDelay * 1.5, 1000) // Max 1000ms to prevent rate limiting but allow seamless updates
              console.warn('⚠️ Rate limited (429), increasing polling interval from', retryDelay, 'ms to', newDelay, 'ms')
              isPolling = false
              restartPolling(newDelay)
              return
            }
            if (resp.status === 504) {
              // Gateway timeout - port might be busy, increase delay slightly
              const newDelay = Math.max(retryDelay * 1.2, 200) // Increase by 20%, minimum 200ms for seamless updates
              console.warn('⚠️ Timeout (504), increasing polling interval from', retryDelay, 'ms to', newDelay, 'ms')
              isPolling = false
              restartPolling(newDelay)
            return
          }
            if (resp.status === 409) {
              // Conflict - port busy, skip this request
              isPolling = false
              return
            }
            // For other errors, reset to default delay
            retryDelay = 100
            isPolling = false
            return
          }
          
          const data = await resp.json()
          if (data.success && data.weight !== undefined) {
            // Reset retry delay on success (keep at 100ms for seamless updates)
            if (retryDelay > 100) {
            retryDelay = 100
              restartPolling(100)
            }
            
            // Weight is now always in grams from server
            let weightGrams = data.weight
            
            // CRITICAL: Always update scaleDisplayWeight FIRST - this ensures continuous data flow
            // Calculate roundedWeight immediately for display consistency
            // This MUST be done BEFORE any validation or early return to prevent freeze
            let roundedWeight = 0
            if (weightGrams === null || weightGrams === undefined || typeof weightGrams !== 'number' || isNaN(weightGrams)) {
              console.log('⚠️ Invalid weight value received (HTTP polling), setting scaleDisplayWeight to 0 to prevent freeze:', weightGrams);
              roundedWeight = 0
            } else {
              roundedWeight = Math.round(weightGrams * 10) / 10
            }
            
            // CRITICAL: Update scaleDisplayWeight IMMEDIATELY, before any validation or early return
            // This ensures digital-weight ALWAYS shows real-time value, regardless of validation
            setScaleDisplayWeight(roundedWeight)
            
            // Now check if weight is invalid and skip further processing
            if (weightGrams === null || weightGrams === undefined || typeof weightGrams !== 'number' || isNaN(weightGrams)) {
              return; // Skip further processing if weight is invalid
            }
            
            // CRITICAL: If weight is 0 or near 0 and not actively weighing, reset currentWeight
            // This ensures that when user removes weight from scale, frontend resets even if previous weight was stored
            // scaleDisplayWeight already updated above
            if (Math.abs(weightGrams) < 0.5 && (!isWeighingActive || !selectedIngredient)) {
              if (currentWeightRef.current > 0) {
                console.log('🔄 Scale reading is 0, resetting currentWeight from', currentWeightRef.current, 'to 0 (HTTP polling)')
                setCurrentWeight(0)
                currentWeightRef.current = 0
                // Also reset in recipe state
                setRecipe(prev => prev.map(ing => ({
                  ...ing,
                  currentWeight: 0
                  })))
                }
                // REMOVED: Zero check weight update - user requested to remove zero check
                // Don't return here - continue to update scaleDisplayWeight below
              }
            
            // CRITICAL: Validate weight range to catch parsing errors
            // Check for suspiciously small values when we expect larger ones
            // Also check for values that seem truncated (e.g., 442 -> 42.2)
            // CRITICAL: Only block if we're confident it's a parsing error, not a real weight change
            if (currentWeight > 100 && weightGrams > 0) {
              // If previous weight was large and new weight is much smaller, it might be truncated
              const ratio = weightGrams / currentWeight;
              
              // CRITICAL: Log raw data for debugging parsing errors
              // Ensure rawData is always a string for consistent logging
              const rawDataForLog = typeof data.raw === 'string' ? data.raw : (data.raw ? JSON.stringify(data.raw) : 'missing');
              console.log('🔍 Weight validation check (HTTP polling):', {
                previousWeight: currentWeight,
                newWeight: weightGrams,
                ratio: ratio.toFixed(4),
                rawData: rawDataForLog,
                data: data
              });
              
              // CRITICAL: More aggressive validation for truncation
              // If new weight is less than 30% of previous AND previous was > 100g, it's likely truncated
              // This catches cases like:
              // - 138.3 -> 8.3 (ratio 0.06 = 6%)
              // - 138.3 -> 38.3 (ratio 0.277 = 27.7%, truncation of first digit)
              // - 166 -> 8.3 (ratio 0.05 = 5%)
              // - 720 -> 9.9 (ratio 0.014 = 1.4%)
              if (ratio < 0.30 && currentWeight > 100) {
                // Get raw data string for validation
                const rawDataStr = typeof data.raw === 'string' ? data.raw : (data.raw ? JSON.stringify(data.raw) : '');
                const hasPrefix = /^(ST|US)[,:]/.test(rawDataStr);
                
                // CRITICAL: Detect truncation patterns
                // Pattern 1: Ratio < 6% (very likely truncation, e.g., 138 -> 8, 166 -> 8.3)
                // Pattern 2: Ratio < 10% AND new weight < 20g (truncation pattern)
                // Pattern 3: Ratio < 10% AND no prefix AND new weight < 50g (truncated data without prefix)
                // Pattern 4: Ratio < 10% AND new weight < 10g (very small weight, likely truncation)
                // Pattern 5: Ratio 20-30% AND new weight matches pattern of missing first digit (e.g., 138.3 -> 38.3)
                //   - Check if new weight is approximately 10x smaller (missing first digit)
                //   - Check if new weight digits match last digits of previous weight
                const isMissingFirstDigit = ratio >= 0.20 && ratio < 0.30 && 
                                          currentWeight > 100 && 
                                          weightGrams > 10 &&
                                          Math.abs(weightGrams - (currentWeight % 100)) < 5; // Last 2 digits match
                
                const isLikelyTruncated = ratio < 0.06 || 
                                         (ratio < 0.10 && weightGrams < 20) ||
                                         (ratio < 0.10 && !hasPrefix && weightGrams < 50) ||
                                         (ratio < 0.10 && weightGrams < 10) ||
                                         isMissingFirstDigit;
                
                if (isLikelyTruncated) {
                  console.error('❌ CRITICAL: Truncated weight detected (HTTP polling):', {
                    previousWeight: currentWeight,
                    newWeight: weightGrams,
                    ratio: ratio.toFixed(4),
                    rawData: rawDataStr || (data.raw ? 'object' : 'missing'),
                    hasPrefix: hasPrefix,
                    data: data
                  });
                  // Don't update if it looks like truncation
                  return;
                }
                
                // If ratio is 5-10% and doesn't match truncation pattern, log warning but allow
                console.warn('⚠️ Possible weight drop detected (HTTP polling):', {
                  previousWeight: currentWeight,
                  newWeight: weightGrams,
                  ratio: ratio.toFixed(4),
                  rawData: rawDataStr || (data.raw ? 'object' : 'missing'),
                  hasPrefix: hasPrefix,
                  data: data
                });
              }
            }
            
            // Check for suspiciously small values when we expect larger ones
            // CRITICAL: Only block if weight is very small (< 5g) when previous was large (> 100g)
            // This prevents blocking legitimate small weights
            if (weightGrams > 0 && weightGrams < 5 && currentWeight > 100) {
              console.warn('⚠️ Suspicious weight drop detected (HTTP polling, very small value):', {
                previousWeight: currentWeight,
                newWeight: weightGrams,
                rawData: data.raw || data,
                data: data
              });
              // Don't update if the drop seems too large (likely parsing error)
              // Only update if the change is reasonable
              if (Math.abs(weightGrams - currentWeight) > currentWeight * 0.9) {
                console.warn('⚠️ Skipping weight update (HTTP polling) - suspicious drop too large');
                return;
              }
            }
            
            // CRITICAL: Update refs immediately to track latest weight for reset prevention
            currentWeightRef.current = weightGrams
            
            // NOTE: scaleDisplayWeight already updated at the beginning of handler (before all validations)
            // This ensures digital-weight ALWAYS shows real-time value without freeze
            
            // CRITICAL: Only update currentWeight if we're still in weighing mode to prevent fluktuasi
            // Check conditions before updating to prevent race conditions
            // CRITICAL: Also check refs to handle temporary state updates
            if ((isWeighingActive || isWeighingActiveRef.current) && 
                (selectedIngredient || selectedIngredientRef.current)) {
              // CRITICAL: Only update currentWeight if weight actually changed (prevent unnecessary re-renders)
              const roundedCurrent = Math.round(currentWeight * 10) / 10
              const change = roundedWeight - roundedCurrent // Signed change (positive = increase, negative = decrease)
              const absChange = Math.abs(change)
              
              // Update for increases of any size OR decreases >= 0.1g (lower threshold for accuracy)
              // This ensures we track weight being added while maintaining accurate measurement display
              const shouldUpdate = change > 0 || absChange >= 0.1
              if (!shouldUpdate) {
                return // Skip update if weight hasn't changed significantly (only for very small decreases < 0.1g)
              }
              
              // CRITICAL: Update ref immediately to prevent reset during active weighing
              currentWeightRef.current = roundedWeight
              
              // Direct update without requestAnimationFrame for more responsive display
              // Data from scale is already stable, so no need for animation frame batching
              // Use rounded value to prevent floating point precision jitter
              setCurrentWeight(roundedWeight)
            
              // Batch state updates for better performance
              setRecipe(prev => {
                // Find the ingredient in current recipe state to get latest savedWeight
                const currentIngredient = prev.find(ing => 
                  ing.id === currentIngredientId || 
                  ing.code === selectedIngredient?.code ||
                  (selectedIngredient?.name && ing.name === selectedIngredient.name)
                )
                
                // Use savedWeight from recipe state (which is updated after save), not from selectedIngredient
                const savedWeight = currentIngredient?.savedWeight || selectedIngredient?.savedWeight || 0
                  const totalWeight = savedWeight + roundedWeight
                
                return prev.map(ing => {
                  // Match by id (primary), or by code (fallback), or by name (last resort)
                  const matches = ing.id === currentIngredientId || 
                                 ing.code === selectedIngredient?.code ||
                                 (selectedIngredient?.name && ing.name === selectedIngredient.name)
                  
                  if (matches) {
                    // CRITICAL: Use savedWeight from recipe state (ing.savedWeight) which is the latest value
                    const ingredientSavedWeight = ing.savedWeight || savedWeight
                    const ingredientTotalWeight = ingredientSavedWeight + roundedWeight
                    
                return { 
                  ...ing, 
                  currentWeight: roundedWeight,
                      totalWeight: ingredientTotalWeight,
                      savedWeight: ingredientSavedWeight  // Preserve savedWeight from recipe state
                }
              }
              // CRITICAL: Don't reset currentWeight for other ingredients immediately
              // Only reset if we're sure they're not being weighed
              // This prevents fluktuasi where weight jumps between actual value and 0
              // Keep their currentWeight as is to prevent unnecessary resets
              return ing
                })
              })
            
              // Also update selectedIngredient state with latest values from recipe
              // CRITICAL: Sync selectedIngredient with recipe state to ensure savedWeight is up-to-date
            setSelectedIngredient(prev => {
              if (prev && prev.id === currentIngredientId) {
                  // Get latest savedWeight from recipe state
                  const latestIngredient = recipe.find(ing => 
                    ing.id === currentIngredientId || 
                    ing.code === prev.code ||
                    ing.name === prev.name
                  )
                  const latestSavedWeight = latestIngredient?.savedWeight || prev.savedWeight || 0
                  const latestTotalWeight = latestSavedWeight + roundedWeight
                  
                return {
                  ...prev,
                    savedWeight: latestSavedWeight,  // Use latest savedWeight from recipe state
                    totalWeight: latestTotalWeight,
                  currentWeight: roundedWeight
                }
              }
              return prev
              })
            } else {
              // If not in weighing mode, don't update to prevent fluktuasi
              // This prevents race conditions where weight updates arrive after weighing stops
            }
          }
        } catch (e) {
          if (e.name !== 'AbortError') {
            console.debug('Scale read error (silent):', e.message)
          }
          // On network errors, keep current delay (don't reset to avoid rapid retries)
        } finally {
          isPolling = false
        }
      }
      
      // Start polling with initial delay
      fallbackInterval = setInterval(pollScale, retryDelay)
    }

    // Start WebSocket connection (ONLY method - no HTTP polling)
    // CRITICAL: WebSocket should ALWAYS be connected to receive real-time scale readings
    // This ensures scaleDisplayWeight is always updated for digital-weight display
    // WebSocket should connect immediately, even before selectedIngredient is set
    // This fixes the issue where digital-weight freezes at 0 before Start button is clicked
    // CRITICAL FIX: WebSocket should NEVER reconnect when ingredient changes!
    // Reconnecting causes display-weight to freeze during reconnection period
    // WebSocket should stay connected and continuously update scaleDisplayWeight for ALL ingredients
    if (useWebSocket) {
      // Only connect if:
      // 1. No WebSocket exists, OR
      // 2. WebSocket is not connected/connecting (disconnected or failed)
      // DO NOT reconnect when ingredient ID changes - this causes freeze!
      const needsNewConnection = !ws || 
                                 (ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CONNECTING)
      
      if (needsNewConnection) {
        console.log('🔌 Initiating WebSocket connection for digital-weight display...')
        connectWebSocket()
      } else {
        console.log('✅ WebSocket already connected - digital-weight display should be updating')
      }
      
      // Update connectedIngredientId to track current ingredient without reconnecting
      // This allows WebSocket to stay connected while tracking ingredient context
      if (ws && ws.readyState === WebSocket.OPEN) {
        const ingredientId = selectedIngredient ? (selectedIngredient.id || selectedIngredient.code) : null
        connectedIngredientId = ingredientId
      }
    } else {
      console.error('❌ WebSocket disabled - this should not happen!')
      console.error('❌ Falling back to HTTP polling as emergency measure')
      startFallbackPolling()
    }
    
    // Cleanup function
    return () => {
      // Clear auto save counter when weighing stops
      // CRITICAL: Clear intervals from ref first
      if (counterIntervalRef.current) {
        clearInterval(counterIntervalRef.current)
        counterIntervalRef.current = null
      }
      if (samplingIntervalRef.current) {
        clearInterval(samplingIntervalRef.current)
        samplingIntervalRef.current = null
      }
      counterStartTimeRef.current = null  // CRITICAL: Clear ref too
      setAutoSaveState(prev => {
        return {
          ...prev,
          counterStartTime: null,
          counterInterval: null,
          samplingInterval: null,
          samples: [],
          isInRange: true
        }
      })
      
      // CRITICAL FIX: DO NOT cleanup WebSocket connection here!
      // WebSocket should stay connected continuously to prevent display-weight freeze
      // When Save is clicked, selectedIngredient is set to null, triggering this cleanup
      // But we want WebSocket to stay connected to keep display-weight updating!
      // Commented out WebSocket cleanup:
      // isConnecting = false
      // connectedIngredientId = null
      // if (ws) { ws.close(); ws = null; }
      // reconnectAttempts = 0
      // lastReconnectTime = 0
      
      // Only clear reconnect timeout (safe to clear)
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
        reconnectTimeout = null
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval)
        fallbackInterval = null
      }
    }
  }, [isWeighingActive, selectedIngredient?.id])  // CRITICAL FIX: Only track id, not the whole object or code
  // This prevents useEffect from re-running when selectedIngredient properties change (like expDate)
  // CRITICAL: WebSocket cleanup removed to prevent disconnect when Save is clicked (selectedIngredient set to null)

  // Auto Save Logic - Monitor weight and trigger auto save when conditions are met
  useEffect(() => {
    // CRITICAL: Check counter running status FIRST (using ref - synchronous)
    // This prevents any checks from running if counter is already active
    const isCounterRunning = !!counterStartTimeRef.current || !!counterIntervalRef.current || !!autoSaveState.counterStartTime
    
    // Only run if auto save is enabled and weighing is active
    // CRITICAL: Check selectedIngredientRef.current as well to catch cases where state hasn't updated yet
    const hasIngredient = selectedIngredient || selectedIngredientRef.current
    
    // Debug log autosave status periodically (but not too often to avoid spam)
    // Only log when conditions change or when explicitly needed (reduced logging)
    // Removed frequent logging to reduce console spam
    
    if (!autoSaveConfig.enabled || !isWeighingActive || !hasIngredient || autoSaveState.isSaving || !workOrder) {
      // Only clear counter if it's actually running
      if (isCounterRunning) {
        console.log('⚠️ Clearing autosave counter: Conditions not met', {
          enabled: autoSaveConfig.enabled,
          isWeighingActive,
          hasIngredient: !!hasIngredient,
          hasWorkOrder: !!workOrder,
          isSaving: autoSaveState.isSaving
        })
        // Clear counter if conditions not met
      // CRITICAL: Clear intervals from ref first to prevent memory leaks
        if (counterIntervalRef.current) {
          clearInterval(counterIntervalRef.current)
          counterIntervalRef.current = null
        }
      if (samplingIntervalRef.current) {
        clearInterval(samplingIntervalRef.current)
        samplingIntervalRef.current = null
      }
      counterStartTimeRef.current = null  // CRITICAL: Clear ref too
        setAutoSaveState(prev => {
          return {
            ...prev,
            counterStartTime: null,
          counterInterval: null,
          samplingInterval: null,
          samples: [],
          isInRange: true
          }
        })
      }
      // Only log if autosave is enabled (to avoid spam when autosave is disabled)
      // Also only log if at least one condition is met (to avoid spam when nothing is happening)
      if (autoSaveConfig.enabled && (isWeighingActive || hasIngredient || workOrder)) {
        // Only log if we're in a state where autosave SHOULD be active but isn't
        const shouldBeActive = isWeighingActive && hasIngredient && workOrder
        if (!shouldBeActive) {
          console.log('⚠️ Auto save not active (conditions not met):', {
            enabled: autoSaveConfig.enabled,
            isWeighingActive,
            hasIngredient: !!hasIngredient,
            selectedIngredient: !!selectedIngredient,
            selectedIngredientRef: !!selectedIngredientRef.current,
            hasWorkOrder: !!workOrder,
            isSaving: autoSaveState.isSaving,
            workOrderDetail: workOrder ? { mo: workOrder.mo, id: workOrder.id } : null
          })
        }
      }
      return
    }
    
    // CRITICAL: If counter is already running, perform sampling check to verify still in range
    // Sampling is done every counterTime/3 seconds to ensure weight stays within tolerance
    // If weight goes out of range during counter, stop the counter immediately
    if (isCounterRunning) {
      const activeIngredient = selectedIngredient || selectedIngredientRef.current
      if (!activeIngredient) {
        return
      }

      // Perform range check during counter (sampling verification)
      const currentSavedWeight = parseFloat(activeIngredient.savedWeight || 0) || 0
      const currentReadingValue = parseFloat(currentWeight || 0) || 0
      const currentTotalWeight = currentSavedWeight + currentReadingValue
      const currentTargetWeight = parseFloat(activeIngredient.targetWeight || 0) || 0
      
      // Calculate tolerance range with same logic as main check
      const currentIngredientToleranceMin = activeIngredient.toleranceMin !== undefined && activeIngredient.toleranceMin !== null
        ? parseFloat(activeIngredient.toleranceMin)
        : null
      const currentIngredientToleranceMax = activeIngredient.toleranceMax !== undefined && activeIngredient.toleranceMax !== null
        ? parseFloat(activeIngredient.toleranceMax)
        : null
      const currentHasValidTolerance = currentIngredientToleranceMin !== null && 
                                        currentIngredientToleranceMax !== null && 
                                        currentIngredientToleranceMax > currentIngredientToleranceMin
      
      const currentToleranceMin = currentHasValidTolerance 
        ? currentIngredientToleranceMin 
        : Math.max(0, currentTargetWeight - 3)
      const currentToleranceMax = currentHasValidTolerance 
        ? currentIngredientToleranceMax 
        : currentTargetWeight + 3
      const stillInRange = currentTotalWeight >= currentToleranceMin && currentTotalWeight <= currentToleranceMax
      
      // If weight goes out of range during counter, stop counter immediately
      if (!stillInRange) {
        console.log('⚠️ Auto save counter stopped: Weight went out of range during counter', {
          totalWeight: currentTotalWeight.toFixed(2),
          range: `[${currentToleranceMin.toFixed(2)} - ${currentToleranceMax.toFixed(2)}]`,
          targetWeight: currentTargetWeight.toFixed(2)
        })
        
        // Clear counter interval
        if (counterIntervalRef.current) {
          clearInterval(counterIntervalRef.current)
          counterIntervalRef.current = null
        }
        // Clear sampling interval
        if (samplingIntervalRef.current) {
          clearInterval(samplingIntervalRef.current)
          samplingIntervalRef.current = null
        }
        counterStartTimeRef.current = null
        
        setAutoSaveState(prev => ({
          ...prev,
          counterStartTime: null,
          counterInterval: null,
          samplingInterval: null,
          isInRange: false
        }))
        return
      }
      
      // Still in range, let counter continue (sampling will continue via sampling interval)
      return  // Don't restart or reset counter
    }
    
    // Use the ingredient from state or ref (whichever is available)
    const activeIngredient = selectedIngredient || selectedIngredientRef.current
    if (!activeIngredient) {
      console.warn('⚠️ Auto save: No active ingredient found')
      return
    }

    // CRITICAL: Double-check that counter is NOT running before doing threshold check
    // This prevents race condition where counter might have started between checks
    // Use ref to check counter status (ref is synchronous, state might not be updated yet)
    if (counterStartTimeRef.current || counterIntervalRef.current || autoSaveState.counterStartTime) {
      // Counter is running, skip all checks and let counter continue
      console.log('⏸️ Counter already running, skipping threshold/range checks', {
        counterStartTimeRef: !!counterStartTimeRef.current,
        counterIntervalRef: !!counterIntervalRef.current,
        counterStartTime: !!autoSaveState.counterStartTime
      })
      return
    }

    // Calculate total weight (saved + current)
    const savedWeight = parseFloat(activeIngredient.savedWeight || 0) || 0
    const currentReading = parseFloat(currentWeight || 0) || 0
    const totalWeight = savedWeight + currentReading

    // NEW LOGIC: Autosave only starts when weight reaches target (within tolerance range)
    // Counter will NOT start until totalWeight is within the target tolerance range
    
    // Get target weight and tolerance range
      const targetWeight = parseFloat(activeIngredient.targetWeight || 0) || 0
    // Calculate tolerance range: use ingredient tolerance if valid, otherwise use default ±3g
    const ingredientToleranceMin = activeIngredient.toleranceMin !== undefined && activeIngredient.toleranceMin !== null
        ? parseFloat(activeIngredient.toleranceMin)
      : null
    const ingredientToleranceMax = activeIngredient.toleranceMax !== undefined && activeIngredient.toleranceMax !== null
        ? parseFloat(activeIngredient.toleranceMax)
      : null
    
    // Use ingredient tolerance if valid (both min and max are defined and max > min), otherwise use default ±3g
    const hasValidTolerance = ingredientToleranceMin !== null && 
                               ingredientToleranceMax !== null && 
                               ingredientToleranceMax > ingredientToleranceMin
    
    const toleranceMin = hasValidTolerance 
      ? ingredientToleranceMin 
      : Math.max(0, targetWeight - 3)
    const toleranceMax = hasValidTolerance 
      ? ingredientToleranceMax 
        : targetWeight + 3
    
    // Check if weight is in target range
      const inRange = totalWeight >= toleranceMin && totalWeight <= toleranceMax

    // Debug logging for range check (only when counter is not running and weight changed significantly)
    // Reduced logging frequency to avoid console spam
    const weightChanged = Math.abs(currentReading - (autoSaveState.lastCheckedWeight || 0)) >= 0.5
    if (!isCounterRunning && currentReading > 0 && weightChanged) {
      console.log('🔍 Auto save range check:', {
        totalWeight: totalWeight.toFixed(2),
        targetWeight: targetWeight.toFixed(2),
        toleranceMin: toleranceMin.toFixed(2),
        toleranceMax: toleranceMax.toFixed(2),
        inRange,
        currentReading: currentReading.toFixed(2),
        savedWeight: savedWeight.toFixed(2)
      })
    }

    // CRITICAL: Counter only starts when weight is IN RANGE (reached target)
    // This is different from previous logic - no threshold check, only range check
    if (!inRange && !isCounterRunning) {
      // Weight not in range, don't start counter
      if (currentReading > 0) {
        console.log('⚠️ Auto save counter not started: Weight not in target range', {
          totalWeight: totalWeight.toFixed(2),
          range: `[${toleranceMin.toFixed(2)} - ${toleranceMax.toFixed(2)}]`,
          targetWeight: targetWeight.toFixed(2),
          tip: 'Autosave only starts when weight reaches target range'
        })
      }
        return
    }

    // All conditions met - start or continue counter
    console.log('✅ All autosave conditions met, starting counter:', {
      ingredient: activeIngredient.name || activeIngredient.product_name || 'Unknown',
      currentReading: currentReading.toFixed(2),
      savedWeight: savedWeight.toFixed(2),
      totalWeight: totalWeight.toFixed(2),
      targetWeight: targetWeight.toFixed(2),
      range: `[${toleranceMin.toFixed(2)} - ${toleranceMax.toFixed(2)}]`,
      counterTime: autoSaveConfig.counterTime,
      samplingInterval: (autoSaveConfig.counterTime / 3).toFixed(2) + 's'
    })
    
    // CRITICAL: Double-check counter is NOT running before starting (race condition prevention)
    // Use ref check (synchronous) to prevent starting multiple counters
    if (counterStartTimeRef.current || counterIntervalRef.current) {
      console.log('⏸️ Counter already running (double-check), skipping start', {
        counterStartTimeRef: !!counterStartTimeRef.current,
        counterIntervalRef: !!counterIntervalRef.current,
        counterStartTime: !!autoSaveState.counterStartTime
      })
      return  // Don't start counter if it's already running
    }
    
    // CRITICAL: Set counter start time in ref IMMEDIATELY and SYNCHRONOUSLY BEFORE setAutoSaveState
    // This prevents race condition where useEffect re-runs before setAutoSaveState completes
    const startTime = Date.now()
    counterStartTimeRef.current = startTime
    counterLastLogTimeRef.current = 0 // Reset last log time when counter starts
    
    // SAMPLING MECHANISM: Create sampling interval to verify weight stays in range
    // Sampling interval = counterTime / 3 (e.g., if counterTime = 3s, sampling every 1s)
    // This verifies that weight remains within tolerance range during the counter
    const samplingIntervalMs = (autoSaveConfig.counterTime / 3) * 1000 // Convert to milliseconds
    const samplingInterval = setInterval(() => {
      // Get latest values from refs
      const latestSelectedIngredient = selectedIngredientRef.current
      const latestCurrentWeight = currentWeightRef.current
      
      if (!latestSelectedIngredient || !latestCurrentWeight) {
        return
      }
      
      // Perform range check (sampling verification) - use same tolerance logic
      const sampleSavedWeight = parseFloat(latestSelectedIngredient.savedWeight || 0) || 0
      const sampleCurrentReading = parseFloat(latestCurrentWeight || 0) || 0
      const sampleTotalWeight = sampleSavedWeight + sampleCurrentReading
      const sampleTargetWeight = parseFloat(latestSelectedIngredient.targetWeight || 0) || 0
      
      // Calculate tolerance range with same logic (check if valid, otherwise use default ±3g)
      const sampleIngredientToleranceMin = latestSelectedIngredient.toleranceMin !== undefined && latestSelectedIngredient.toleranceMin !== null
        ? parseFloat(latestSelectedIngredient.toleranceMin)
        : null
      const sampleIngredientToleranceMax = latestSelectedIngredient.toleranceMax !== undefined && latestSelectedIngredient.toleranceMax !== null
        ? parseFloat(latestSelectedIngredient.toleranceMax)
        : null
      const sampleHasValidTolerance = sampleIngredientToleranceMin !== null && 
                                        sampleIngredientToleranceMax !== null && 
                                        sampleIngredientToleranceMax > sampleIngredientToleranceMin
      
      const sampleToleranceMin = sampleHasValidTolerance 
        ? sampleIngredientToleranceMin 
        : Math.max(0, sampleTargetWeight - 3)
      const sampleToleranceMax = sampleHasValidTolerance 
        ? sampleIngredientToleranceMax 
        : sampleTargetWeight + 3
      const sampleInRange = sampleTotalWeight >= sampleToleranceMin && sampleTotalWeight <= sampleToleranceMax
      
      // Add sample to state for tracking
    setAutoSaveState(prev => {
        const newSamples = [...(prev.samples || []), {
          timestamp: Date.now(),
          totalWeight: sampleTotalWeight,
          inRange: sampleInRange
        }]
        
        // Keep only last 10 samples to avoid memory issues
        const trimmedSamples = newSamples.slice(-10)
        
        return {
          ...prev,
          samples: trimmedSamples,
          isInRange: sampleInRange
        }
      })
      
      // If weight goes out of range during sampling, stop counter
      if (!sampleInRange) {
        console.log('⚠️ Auto save counter stopped: Weight went out of range during sampling', {
          totalWeight: sampleTotalWeight.toFixed(2),
          range: `[${sampleToleranceMin.toFixed(2)} - ${sampleToleranceMax.toFixed(2)}]`,
          targetWeight: sampleTargetWeight.toFixed(2),
          sampleTime: new Date().toLocaleTimeString()
        })
        
        // Clear counter interval
        if (counterIntervalRef.current) {
          clearInterval(counterIntervalRef.current)
          counterIntervalRef.current = null
        }
        // Clear sampling interval
        if (samplingIntervalRef.current) {
          clearInterval(samplingIntervalRef.current)
          samplingIntervalRef.current = null
        }
        counterStartTimeRef.current = null
        
        setAutoSaveState(prev => ({
          ...prev,
          counterStartTime: null,
          counterInterval: null,
          samplingInterval: null,
          isInRange: false
        }))
      } else {
        // Still in range - no need to log every sample (reduce console spam)
        // Only log if debug mode or first few samples
        // Silent success - weight is in range as expected
      }
    }, samplingIntervalMs)
    
    // Store sampling interval in ref
    samplingIntervalRef.current = samplingInterval
    
    // CRITICAL: Create counter interval and store ID in ref IMMEDIATELY (synchronously) BEFORE setAutoSaveState
    // This prevents race condition where useEffect re-runs before setAutoSaveState completes
    // If interval ID is stored in ref before state update, early return check will work correctly
        const counterInterval = setInterval(() => {
          try {
            // CRITICAL: Use refs directly to avoid stale closure issues
            const actualStartTime = counterStartTimeRef.current
            if (!actualStartTime) {
              // Counter was cleared, stop interval
              if (counterIntervalRef.current) {
                clearInterval(counterIntervalRef.current)
                counterIntervalRef.current = null
              }
              return
            }

            const elapsed = (Date.now() - actualStartTime) / 1000 // seconds
            const remaining = autoSaveConfigRef.current.counterTime - elapsed
            
            // Log progress every second (OUTSIDE setAutoSaveState to ensure it always runs)
            const elapsedSeconds = Math.floor(elapsed)
            const currentTime = Date.now()
            const lastLogTime = counterLastLogTimeRef.current || 0
            
            // Log every 1 second to avoid spam
            if (currentTime - lastLogTime >= 1000 && remaining > 0.5) {
              counterLastLogTimeRef.current = currentTime
              console.log(`⏳ Auto save counter progress: ${remaining.toFixed(1)}s remaining (${elapsedSeconds}s elapsed)`)
            }
            
            // Log when counter is about to finish (within 0.5s) - only once
            if (remaining > 0 && remaining <= 0.5 && currentTime - lastLogTime >= 500) {
              counterLastLogTimeRef.current = currentTime
              console.log(`⏳ Auto save counter finishing in ${remaining.toFixed(2)}s...`)
            }

            // Counter finished - trigger auto save
            if (remaining <= 0) {
              // Clear intervals FIRST to prevent multiple executions
              if (counterIntervalRef.current) {
                clearInterval(counterIntervalRef.current)
                counterIntervalRef.current = null
              }
              if (samplingIntervalRef.current) {
                clearInterval(samplingIntervalRef.current)
                samplingIntervalRef.current = null
              }
              counterStartTimeRef.current = null
              
              console.log('⏰ Auto save counter finished, triggering save...', {
                elapsed: elapsed.toFixed(2),
                counterTime: autoSaveConfigRef.current.counterTime,
                timestamp: new Date().toLocaleTimeString()
              })
              
              // Update state and trigger save
              setAutoSaveState(currentState => {
                // Double-check counter was not already cleared
                if (!counterStartTimeRef.current && !actualStartTime) {
                  return currentState
                }
              // Get latest values from refs to avoid stale closure issues
              const latestSelectedIngredient = selectedIngredientRef.current
              const latestCurrentWeight = currentWeightRef.current
              const latestWorkOrder = workOrderRef.current
              const latestIsWeighingActive = isWeighingActiveRef.current
              const latestAutoSaveConfig = autoSaveConfigRef.current
                
                console.log('📊 Counter finished - checking save conditions...', {
                  samples: currentState.samples?.length || 0,
                  allSamplesInRange: currentState.samples?.every(s => s.inRange) ?? true,
                  hasIngredient: !!latestSelectedIngredient,
                  hasWorkOrder: !!latestWorkOrder,
                  isWeighingActive: latestIsWeighingActive
                })
              
              // Trigger auto save (but check conditions again before saving)
              if (latestAutoSaveConfig.enabled && latestIsWeighingActive && latestSelectedIngredient && !currentState.isSaving) {
                const currentSavedWeight = parseFloat(latestSelectedIngredient.savedWeight || 0) || 0
                const currentReading = parseFloat(latestCurrentWeight || 0) || 0
                const currentTotalWeight = currentSavedWeight + currentReading

                // Final check: weight still in range AND all samples were in range
                let shouldSave = true
                
                // Check if weight is still in range - use same tolerance logic
                const finalTargetWeight = parseFloat(latestSelectedIngredient.targetWeight || 0) || 0
                const finalIngredientToleranceMin = latestSelectedIngredient.toleranceMin !== undefined && latestSelectedIngredient.toleranceMin !== null
                    ? parseFloat(latestSelectedIngredient.toleranceMin)
                  : null
                const finalIngredientToleranceMax = latestSelectedIngredient.toleranceMax !== undefined && latestSelectedIngredient.toleranceMax !== null
                    ? parseFloat(latestSelectedIngredient.toleranceMax)
                  : null
                const finalHasValidTolerance = finalIngredientToleranceMin !== null && 
                                                 finalIngredientToleranceMax !== null && 
                                                 finalIngredientToleranceMax > finalIngredientToleranceMin
                
                const finalToleranceMin = finalHasValidTolerance 
                  ? finalIngredientToleranceMin 
                  : Math.max(0, finalTargetWeight - 3)
                const finalToleranceMax = finalHasValidTolerance 
                  ? finalIngredientToleranceMax 
                  : finalTargetWeight + 3
                const stillInRange = currentTotalWeight >= finalToleranceMin && currentTotalWeight <= finalToleranceMax
                
                shouldSave = stillInRange
                
                // Check if all samples were in range (verification from sampling)
                const allSamplesValid = currentState.samples && currentState.samples.length > 0 
                  ? currentState.samples.every(s => s.inRange)
                  : true
                
                shouldSave = shouldSave && allSamplesValid
                
                if (!stillInRange) {
                  console.log('⚠️ Auto save skipped: Weight not in range when counter finished', {
                      totalWeight: currentTotalWeight.toFixed(2),
                    range: `[${finalToleranceMin.toFixed(2)} - ${finalToleranceMax.toFixed(2)}]`
                  })
                }
                
                if (!allSamplesValid) {
                  console.log('⚠️ Auto save skipped: Some samples were out of range during counter', {
                    totalSamples: currentState.samples?.length || 0,
                    invalidSamples: currentState.samples?.filter(s => !s.inRange).length || 0
                  })
                }

                // Also check if workOrder is available
                if (!latestWorkOrder) {
                  console.warn('⚠️ Auto save skipped: Work Order not available')
                  shouldSave = false
                }

                if (shouldSave) {
                  // Set saving flag to prevent concurrent saves
                  setAutoSaveState(prevState => ({
                    ...prevState,
                    isSaving: true
                  }))

                  // Call handleSaveProgress using ref (but don't await to avoid blocking)
                  const saveFunction = handleSaveProgressRef.current
                  if (saveFunction) {
                    console.log('🔄 Auto save triggered:', {
                      ingredient: latestSelectedIngredient.name || latestSelectedIngredient.product_name || 'Unknown',
                      currentReading: currentReading.toFixed(2),
                      totalWeight: currentTotalWeight.toFixed(2),
                      targetWeight: parseFloat(latestSelectedIngredient.targetWeight || 0).toFixed(2),
                      savedWeight: currentSavedWeight.toFixed(2),
                      hasSaveFunction: !!saveFunction
                    })
                    
                    // Execute save with proper error handling
                    Promise.resolve(saveFunction())
                      .then(() => {
                        // Update last saved weight after successful save
                        // CRITICAL: Clear refs too
                        counterStartTimeRef.current = null
                        counterIntervalRef.current = null
                        if (samplingIntervalRef.current) {
                          clearInterval(samplingIntervalRef.current)
                          samplingIntervalRef.current = null
                        }
                        
                        setAutoSaveState(prevState => ({
                          ...prevState,
                          isSaving: false,
                          lastSavedWeight: currentReading,
                          counterStartTime: null,
                          counterInterval: null,
                          samplingInterval: null,
                          samples: [], // Clear samples after save
                          isInRange: true,
                          lastCheckedWeight: currentReading // Reset last checked weight too
                        }))
                        console.log('✅ Auto save completed successfully')
                      })
                      .catch((error) => {
                        console.error('❌ Auto save failed:', error)
                        console.error('Error details:', {
                          message: error?.message,
                          stack: error?.stack,
                          name: error?.name
                        })
                        // CRITICAL: Clear refs too
                        counterStartTimeRef.current = null
                        counterIntervalRef.current = null
                        if (samplingIntervalRef.current) {
                          clearInterval(samplingIntervalRef.current)
                          samplingIntervalRef.current = null
                        }
                        
                        setAutoSaveState(prevState => ({
                          ...prevState,
                          isSaving: false,
                          counterStartTime: null,
                          counterInterval: null,
                          samplingInterval: null,
                          samples: [],
                          isInRange: true
                        }))
                      })
                  } else {
                    console.error('❌ Auto save failed: handleSaveProgressRef.current is null or undefined')
                    console.error('Debug info:', {
                      handleSaveProgressRef: !!handleSaveProgressRef,
                      handleSaveProgressRefCurrent: handleSaveProgressRef?.current,
                      hasIngredient: !!latestSelectedIngredient,
                      hasWorkOrder: !!latestWorkOrder,
                      isWeighingActive: latestIsWeighingActive
                    })
                    setAutoSaveState(prevState => ({
                      ...prevState,
                      isSaving: false,
                      counterStartTime: null,
                      counterInterval: null
                    }))
                  }
                } else {
                  // Conditions no longer met, reset
                  console.log('⚠️ Auto save conditions not met, resetting counter', {
                    enabled: latestAutoSaveConfig.enabled,
                    isWeighingActive: latestIsWeighingActive,
                    hasIngredient: !!latestSelectedIngredient,
                    hasWorkOrder: !!latestWorkOrder,
                    isSaving: currentState.isSaving
                  })
                  return {
                    ...currentState,
                    counterStartTime: null,
                    counterInterval: null
                  }
                }
              } else {
                console.log('⚠️ Auto save skipped: Initial conditions not met', {
                  enabled: latestAutoSaveConfig.enabled,
                  isWeighingActive: latestIsWeighingActive,
                  hasIngredient: !!latestSelectedIngredient,
                  isSaving: currentState.isSaving
                })
              return {
                ...currentState,
                counterStartTime: null,
                counterInterval: null
              }
            }

            return currentState
          })
            } else {
              // Counter still running - no action needed, just continue
              return
            }
          } catch (error) {
            console.error('❌ Counter interval error:', error)
            // Don't clear counter on error, let it continue
          }
        }, 100) // Check every 100ms

    // CRITICAL: Store interval IDs in ref IMMEDIATELY and SYNCHRONOUSLY (BEFORE setAutoSaveState)
    // This ensures that if useEffect re-runs before setAutoSaveState completes,
    // the early return check will see the interval and prevent starting another counter
        counterIntervalRef.current = counterInterval
    // samplingIntervalRef already set above
    
    console.log('⏱️ Auto save counter started:', {
      ingredient: activeIngredient.name || activeIngredient.product_name || 'Unknown',
      currentReading: currentReading.toFixed(2),
      totalWeight: totalWeight.toFixed(2),
      targetWeight: targetWeight.toFixed(2),
      counterTime: autoSaveConfig.counterTime,
      willAutoSaveIn: autoSaveConfig.counterTime + ' seconds',
      samplingInterval: (autoSaveConfig.counterTime / 3).toFixed(2) + 's',
      intervalId: counterInterval,
      startTime: startTime,
      timestamp: new Date().toLocaleTimeString()
    })
    console.log('📝 Counter will check progress every 100ms and log every 1s')
    
    // Now update state (intervals and start time are already in refs, so early return will work)
    setAutoSaveState(prev => {
      // If counter not started, start it
      if (!prev.counterStartTime) {
        return {
          ...prev,
          counterStartTime: startTime,  // Use same startTime from ref
          counterInterval,
          samplingInterval,
          samples: [], // Initialize samples array
          isInRange: true,
          lastCheckedWeight: currentReading  // Update lastCheckedWeight when counter starts
        }
      }

      // Counter already running, update last checked weight periodically
      // But only update if weight has changed significantly (to avoid constant updates)
      const weightChange = Math.abs(currentReading - prev.lastCheckedWeight)
      if (weightChange >= 0.1) {  // Only update if weight changed by at least 0.1g
        return {
          ...prev,
          lastCheckedWeight: currentReading
        }
      }
      return prev  // No change needed
    })
  }, [
    autoSaveConfig.enabled,
    autoSaveConfig.counterTime,
    autoSaveConfig.threshold,
    autoSaveConfig.onlyInRange,
    isWeighingActive,
    selectedIngredient,
    currentWeight,
    workOrder, // Add workOrder to dependencies to check availability
    autoSaveState.isSaving,
    autoSaveState.lastCheckedWeight // Use lastCheckedWeight instead of lastSavedWeight
  ])

  // Cleanup auto save counter on unmount or when conditions change
  useEffect(() => {
    return () => {
      // Clear intervals from refs
      if (counterIntervalRef.current) {
        clearInterval(counterIntervalRef.current)
        counterIntervalRef.current = null
      }
      if (samplingIntervalRef.current) {
        clearInterval(samplingIntervalRef.current)
        samplingIntervalRef.current = null
      }
      counterStartTimeRef.current = null
      
      setAutoSaveState(prev => {
        if (prev.counterInterval) {
          clearInterval(prev.counterInterval)
        }
        if (prev.samplingInterval) {
          clearInterval(prev.samplingInterval)
        }
        return {
          ...prev,
          counterStartTime: null,
          counterInterval: null,
          samplingInterval: null,
          samples: [],
          isInRange: true
        }
      })
    }
  }, [])

  const handleBarcodeScan = async (type, rawValue) => {
    const value = (rawValue || '').trim()
    if (!value) {
      alert.warning('Data barcode kosong. Silakan scan ulang.', 'Barcode Kosong')
      return
    }

    try {
    if (type === 'mo') {
        alert.info(`Memuat Work Order ${value}...`, 'Memproses Scan')
        const resp = await fetch(`/api/work-orders/${encodeURIComponent(value)}`)
        if (!resp.ok) {
          throw new Error(`Server mengembalikan status ${resp.status}`)
        }
        const payload = await resp.json()
        if (!payload.success || !payload.data || !payload.data.workOrder) {
          alert.warning(`Work Order ${value} tidak ditemukan di sistem.`, 'MO Tidak Ditemukan')
          return
        }

        const wo = payload.data.workOrder
        const ingredients = payload.data.ingredients || []
        const orderQty = wo.planned_quantity !== null && wo.planned_quantity !== undefined
          ? parseFloat(wo.planned_quantity)
          : 0
        const scalingFactor = orderQty ? (orderQty / 1000) : 1
        const normalizedWorkOrder = {
          id: wo.id,
          workOrder: wo.work_order_number,
          mo: wo.work_order_number,
          formulationId: wo.formulation_id,
          formulaName: wo.formulation_name || wo.formulation_code || 'Tanpa Nama Formulasi',
          formulationName: wo.formulation_name || '',
          formulationCode: wo.formulation_code || '',
          orderQty,
          plannedQuantity: orderQty,
          scalingFactor,
          status: wo.status,
          createdAt: wo.created_at,
          completedAt: wo.completed_at
        }

        const mappedIngredients = ingredients.map(ing => {
          const ingredientId = ing.ingredient_id || ing.id || ing.product_code || ing.product_name
          const targetMass = parseFloat(ing.target_mass || 0) || 0
          const baseTargetMass = ing.base_target_mass !== undefined ? parseFloat(ing.base_target_mass) || 0 : null
          const actualMass = parseFloat(ing.actual_mass || 0) || 0
          const remaining = ing.remaining_weight !== undefined
            ? parseFloat(ing.remaining_weight) || 0
            : Math.max(0, targetMass - actualMass)

          return {
            id: ingredientId,
            code: ing.product_code || '',
            name: ing.product_name || ing.name || `Ingredient ${ingredientId}`,
            targetWeight: targetMass,
            baseTargetWeight: baseTargetMass,
            savedWeight: actualMass,
            totalWeight: actualMass,
          currentWeight: 0,
            status: ing.status || 'pending',
            toleranceMin: ing.tolerance_min,
            toleranceMax: ing.tolerance_max,
            remainingWeight: remaining,
            progressPercentage: parseFloat(ing.progress_percentage || 0) || 0,
            isWithinTolerance: ing.is_within_tolerance,
            weighingStartedAt: ing.weighing_started_at,
            weighingUpdatedAt: ing.weighing_updated_at,
            weighingCompletedAt: ing.weighing_completed_at,
            weighingNotes: ing.weighing_notes || '',
            sessionNumber: ing.last_session_number || null // Include last session number for print tracking
          }
        })

        setWorkOrder(normalizedWorkOrder)
        setRecipe(mappedIngredients)
        setSelectedIngredient(null)
        setCurrentWeight(0)
        setIsWeighingActive(false)
        setShowProductVerification(false)
      setShowBarcodeScanner(false)

        alert.success(`Work Order ${normalizedWorkOrder.workOrder} siap diproses.`, 'MO Terbaca')
        console.log(`📦 Loaded work order ${normalizedWorkOrder.workOrder} dengan ${mappedIngredients.length} bahan.`)
      } else if (type === 'sku') {
        alert.info('Scan SKU belum diaktifkan. Gunakan scan Work Order (MO) untuk memuat data.', 'Informasi')
    } else if (type === 'quantity') {
        const quantity = parseFloat(value)
        if (Number.isNaN(quantity)) {
          alert.error('Nilai quantity tidak valid.', 'Input Tidak Valid')
          return
        }
        if (!workOrder) {
          alert.warning('Silakan scan Work Order terlebih dahulu sebelum mengatur quantity.', 'MO Belum Dipilih')
          return
        }
        setWorkOrder(prev => prev ? { ...prev, orderQty: quantity, plannedQuantity: quantity } : prev)
        alert.success(`Quantity Work Order diperbarui menjadi ${quantity.toLocaleString('id-ID')} gram.`, 'Quantity Diperbarui')
      setShowBarcodeScanner(false)
      } else if (type === 'ingredient') {
        alert.info('Scan bahan mentah akan diintegrasikan setelah Work Order aktif.', 'Informasi')
      }
    } catch (error) {
      console.error('Failed to process barcode scan:', error)
      alert.error(`Gagal memproses barcode: ${error.message}`, 'Scan Gagal')
    }
  }

  const handleIngredientClick = async (ingredient) => {
    // OPTIMIZED: Set ingredient immediately to start zero check polling without delay
    // Load saved weight from recipe state first (fast, synchronous)
    let savedWeight = ingredient.savedWeight || ingredient.totalWeight || ingredient.actualWeight || 0;
    
    // Load saved weight and tracking data from ingredient (use recipe state data first)
    const ingredientWithSaved = {
      ...ingredient,
      savedWeight: savedWeight,
      totalWeight: savedWeight, // Start with saved weight
      currentWeight: 0, // Reset current reading for new measurement
      // Preserve tracking fields if available
      progressPercentage: ingredient.progressPercentage || 0,
      remainingWeight: ingredient.remainingWeight || (ingredient.targetWeight - savedWeight),
      isWithinTolerance: ingredient.isWithinTolerance,
      toleranceMin: ingredient.toleranceMin,
      toleranceMax: ingredient.toleranceMax,
      weighingStartedAt: ingredient.weighingStartedAt,
      weighingUpdatedAt: ingredient.weighingUpdatedAt,
      weighingCompletedAt: ingredient.weighingCompletedAt,
      sessionNumber: ingredient.sessionNumber || null // CRITICAL: Preserve session number for this ingredient
    };
    
    // CRITICAL: Update all states in correct order to prevent race condition
    // React 18 will batch these updates automatically
    // 1. First reset weighing state and currentWeight
    setIsWeighingActive(false); // Stop weighing for previous ingredient
    setCurrentWeight(0); // Reset currentWeight to 0 when switching ingredients
    
    // 2. Then update recipe state
    setRecipe(prev => prev.map(ing => {
      if (ing.id === ingredient.id) {
        // Update the selected ingredient with saved weight
        return {
          ...ing,
          savedWeight: savedWeight,
          totalWeight: savedWeight,
          currentWeight: 0 // Reset current reading for new measurement
        };
      } else {
        // Reset currentWeight for all other ingredients to prevent cross-contamination
        return {
          ...ing,
          currentWeight: 0,
          // Preserve savedWeight and totalWeight for other ingredients
          totalWeight: ing.savedWeight || ing.totalWeight || 0
        };
      }
    }));
    
    // 3. Finally set ingredient and show modal together
    // These should update in the same batch to prevent showing savedWeight before modal
    setSelectedIngredient(ingredientWithSaved);
    setShowProductVerification(true);
    // Don't reset zero check weight here - let it continue reading
  }

  const handleProductVerification = (isValid, expDate = null) => {
    if (isValid && selectedIngredient) {
      // Update selectedIngredient with exp date if provided
      if (expDate) {
        setSelectedIngredient(prev => ({
          ...prev,
          expDate: expDate
        }))
        
        // Also update in recipe state
        setRecipe(prev => prev.map(ing => {
          if (ing.id === selectedIngredient.id || 
              ing.code === selectedIngredient.code ||
              ing.name === selectedIngredient.name) {
            return {
              ...ing,
              expDate: expDate
            }
          }
          return ing
        }))
        
        console.log('✅ Exp date extracted from scan:', expDate)
      }
      
      // Just close modal after verification, don't start weighing yet
      setShowProductVerification(false)
    } else {
      // User cancelled or verification failed - reset selectedIngredient
      setShowProductVerification(false)
      setSelectedIngredient(null)
    }
  }

  // Handle start weighing button click from RightPanel
  // OPTIMIZED: Uses WebSocket zeroCheckWeight for real-time zero check
  // WebSocket continuously updates zeroCheckWeight when ingredient is selected but not weighing
  const handleStartWeighingFromPanel = async () => {
    if (!selectedIngredient) {
      console.warn('⚠️ Cannot start weighing: selectedIngredient is null')
      return
    }
    
    // Use zeroCheckWeight from WebSocket (already updated in real-time)
    // This is more reliable than HTTP fetch which can timeout
    const zeroThreshold = 0.5 // Allow ±0.5g tolerance for zero
    const currentZeroWeight = zeroCheckWeight // Use WebSocket value
    
    console.log('🔍 Zero check before starting weighing:', {
      zeroCheckWeight: currentZeroWeight.toFixed(2) + 'g',
      threshold: zeroThreshold + 'g',
      isZero: Math.abs(currentZeroWeight) <= zeroThreshold
    })
    
    const isZero = Math.abs(currentZeroWeight) <= zeroThreshold
    
    if (!isZero) {
      // Don't start weighing if scale is not zero
      alert.warning(
        `Timbangan belum zero! Nilai saat ini: ${currentZeroWeight.toFixed(2)}g\n\nPastikan timbangan menunjukkan 0.00g sebelum memulai penimbangan.`, 
        'Timbangan Belum Zero'
      )
      return
    }
    
    // Zero check passed - start weighing
    // Reset zero check weight and start weighing
    setZeroCheckWeight(0)
    
    // Start weighing process - update selectedIngredient first, then set isWeighingActive
    const updatedIngredient = {...selectedIngredient, status: 'weighing'}
    setSelectedIngredient(updatedIngredient)
    
    // Update refs immediately to avoid race condition
    selectedIngredientRef.current = updatedIngredient
    isWeighingActiveRef.current = true
    setIsWeighingActive(true) // Activate weighing to start scale polling
    
    console.log('✅ Weighing started:', {
      ingredient: updatedIngredient.name || updatedIngredient.product_name,
      id: updatedIngredient.id,
      hasWorkOrder: !!workOrder,
      autoSaveEnabled: autoSaveConfig.enabled,
      zeroCheckWeight: currentZeroWeight.toFixed(2) + 'g'
    })
  }

  const handleStartScan = (type) => {
    setScanType(type)
    setShowBarcodeScanner(true)
  }

  // Handle MO scan completion
  const handleStartWeighing = (moData) => {
    const targetQuantity = parseFloat(moData.quantity) || 1000
    const baseQuantity = moData.baseQuantity || 1000
    const scalingFactor = moData.scalingFactor || (targetQuantity / baseQuantity)
    
    console.log(`📏 Work Order Scaling: Base=${baseQuantity}g, Target=${targetQuantity}g, Factor=${scalingFactor}x`)
    
    setWorkOrder({
      workOrder: moData.moNumber,
      formulaName: moData.skuName,
      orderQty: targetQuantity,
      sku: moData.formulationCode,
      mo: moData.moNumber,
      formulationId: moData.formulationId,
      baseQuantity: baseQuantity, // Store base quantity (1000g)
      scalingFactor: scalingFactor // Store scaling factor for reference
    })
    
    // Check if this is a resume operation (has existing progress)
    if (moData.isResume && moData.ingredients && moData.ingredients.length > 0) {
      // Resume mode: Load ingredients with existing progress from database
      console.log('📋 Resuming work order with existing progress')
      console.log('📋 Resume data received:', {
        ingredientCount: moData.ingredients.length,
        firstIngredient: moData.ingredients[0],
        scalingFactor: moData.scalingFactor || '1.00x',
        baseQuantity: moData.baseQuantity || 1000
      })
      
      // CRITICAL: If target_mass is 0 or missing, calculate from base * scaling factor
      // This handles ingredients that haven't been saved yet but need scaled target
      const baseQuantity = moData.baseQuantity || 1000
      const scalingFactor = moData.scalingFactor || (targetQuantity / baseQuantity)
      
      const mapped = moData.ingredients.map(it => {
        const ingredientId = it.ingredient_id || it.formulation_ingredient_id || it.id
        const actualMass = parseFloat(it.actual_mass || 0) || 0
        let targetMass = parseFloat(it.target_mass || 0) || 0
        
        // If target_mass is 0 or missing, try to calculate from base_target_mass or use base formula
        // Note: This should not happen if backend query is correct, but adding safety check
        if (targetMass === 0 && moData.baseQuantity) {
          // Try to get base target from ingredient data if available
          const baseTarget = parseFloat(it.base_target_mass || 0) || 0
          if (baseTarget > 0) {
            targetMass = baseTarget * scalingFactor
            console.log(`⚠️  Calculated scaled target for ${it.product_name}: ${baseTarget}g × ${scalingFactor} = ${targetMass}g`)
          }
        }
        
        const savedWeight = actualMass
        
        return {
          id: ingredientId,
          code: it.product_code || '',
          name: it.product_name || 'Unknown',
          currentWeight: 0, // Reset current reading for new measurement session
          targetWeight: targetMass,
          status: it.status || 'pending',
          savedWeight: savedWeight, // Load saved/accumulated weight from database
          totalWeight: savedWeight, // Set total to saved weight
          actualWeight: savedWeight,
          // Include all tracking fields from database
          progressPercentage: parseFloat(it.progress_percentage || ((targetMass > 0 ? (actualMass / targetMass * 100) : 0))) || 0,
          remainingWeight: parseFloat(it.remaining_weight || Math.max(0, targetMass - actualMass)) || 0,
          isWithinTolerance: it.is_within_tolerance,
          toleranceMin: parseFloat(it.tolerance_min || 0) || 0,
          toleranceMax: parseFloat(it.tolerance_max || 0) || 0,
          weighingStartedAt: it.weighing_started_at,
          weighingUpdatedAt: it.weighing_updated_at,
          weighingCompletedAt: it.weighing_completed_at,
          weighingNotes: it.weighing_notes || '',
          sessionNumber: it.last_session_number || null // Include last session number for print tracking
        }
      })
      
      console.log('📋 Mapped ingredients for resume:', mapped.map(ing => ({
        id: ing.id,
        name: ing.name,
        savedWeight: ing.savedWeight,
        totalWeight: ing.totalWeight,
        targetWeight: ing.targetWeight,
        status: ing.status
      })))
      
      // Verify that saved weights are loaded correctly
      const totalSavedWeight = mapped.reduce((sum, ing) => sum + (ing.savedWeight || 0), 0)
      
      setRecipe(mapped)
      // CRITICAL FIX: Don't set isWeighingActive to true immediately after resume
      // Weighing should only start when user selects an ingredient and clicks Start button
      // This ensures zero check polling works correctly after modal closes
      setIsWeighingActive(false)
      setZeroCheckWeight(0) // Reset zero check weight for fresh start
      setShowMOScanModal(false)
      
      // CRITICAL: Force WebSocket connection check after modal closes
      // This ensures digital-weight display starts showing real-time data immediately
      console.log('🔄 MO Scan Modal closed (Resume mode) - WebSocket should be active for digital-weight display')
      console.log('📡 ScaleDisplayWeight:', scaleDisplayWeight, 'g - Should update continuously from WebSocket')
      
      // Show resume notification with detailed info
      const completedCount = mapped.filter(ing => ing.status === 'completed').length
      const inProgressCount = mapped.filter(ing => {
        const status = ing.status || 'pending'
        const hasWeight = (ing.savedWeight || 0) > 0
        return status === 'weighing' || (status === 'pending' && hasWeight)
      }).length
      const totalWithProgress = mapped.filter(ing => (ing.savedWeight || 0) > 0).length
      
        alert.success(`Work Order Diresume!\n\nProgress:\n- ${completedCount}/${mapped.length} bahan selesai\n- ${inProgressCount} bahan sedang ditimbang\n- ${totalWithProgress} bahan memiliki saved weight\n\nLanjutkan penimbangan dari progress sebelumnya.`, 'Work Order Diresume')
      return
    }
    
    // New work order mode: Load ingredients from formulation
    // Note: ingredient.target_mass is already scaled in MOScanModal (multiplied by scalingFactor)
    const ingredients = moData.ingredients.map(ingredient => ({
      id: ingredient.formulation_ingredient_id || ingredient.ingredient_id || ingredient.id,
      code: ingredient.product_code || '',
      name: ingredient.product_name || 'Unknown',
      currentWeight: 0,
      targetWeight: parseFloat(ingredient.target_mass || 0) || 0, // Already scaled from MOScanModal
      status: 'pending',
      savedWeight: 0,
      totalWeight: 0,
      actualWeight: 0
    }))
    
    console.log(`📏 New work order ingredients (scaled):`, ingredients.map(ing => ({
      name: ing.name,
      targetWeight: ing.targetWeight
    })))
    
    setRecipe(ingredients)
    // CRITICAL FIX: Don't set isWeighingActive to true immediately after MO scan
    // Weighing should only start when user selects an ingredient and clicks Start button
    // This ensures zero check polling works correctly after modal closes
    setIsWeighingActive(false)
    setZeroCheckWeight(0) // Reset zero check weight for fresh start
    setShowMOScanModal(false)
    
    // CRITICAL: Force WebSocket connection check after modal closes
    // This ensures digital-weight display starts showing real-time data immediately
    console.log('🔄 MO Scan Modal closed (New WO mode) - WebSocket should be active for digital-weight display')
    console.log('📡 ScaleDisplayWeight:', scaleDisplayWeight, 'g - Should update continuously from WebSocket')

    // Try to check for existing progress on server (fallback check)
    (async () => {
      try {
        const resp = await fetch(`/api/work-orders/${encodeURIComponent(moData.moNumber)}`)
        const data = await resp.json()
        if (data && data.success && data.data) {
          const wo = data.data.workOrder
          const ings = data.data.ingredients || []
          const hasProgress = ings.some(ing => {
            const actualMass = parseFloat(ing.actual_mass || 0) || 0
            return actualMass > 0
          })
          
          if (hasProgress) {
            const mapped = ings.map(it => ({
              id: it.ingredient_id || it.product_code,
              name: it.product_name || 'Unknown',
              code: it.product_code || '',
              currentWeight: 0,
              targetWeight: parseFloat(it.target_mass || 0) || 0,
              status: it.status || 'pending',
              savedWeight: parseFloat(it.actual_mass || 0) || 0,
              totalWeight: parseFloat(it.actual_mass || 0) || 0,
              actualWeight: parseFloat(it.actual_mass || 0) || 0,
              progressPercentage: parseFloat(it.progress_percentage || 0) || 0,
              remainingWeight: parseFloat(it.remaining_weight || 0) || 0,
              isWithinTolerance: it.is_within_tolerance,
              toleranceMin: parseFloat(it.tolerance_min || 0) || 0,
              toleranceMax: parseFloat(it.tolerance_max || 0) || 0,
              weighingStartedAt: it.weighing_started_at,
              weighingUpdatedAt: it.weighing_updated_at,
              weighingCompletedAt: it.weighing_completed_at,
              weighingNotes: it.weighing_notes || ''
            }))
            setRecipe(mapped)
            console.log('📋 Loaded existing progress from server')
          }
        }
      } catch (e) {
        // ignore resume error, continue fresh
        console.warn('Could not check for existing progress:', e)
      }
    })()

    // Ensure Work Order appears in history immediately by creating/updating record
    ;(async () => {
      try {
        await fetch('http://localhost:3001/api/weighing/save-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            moNumber: moData.moNumber,
            formulationId: moData.formulationId,
            ingredients: [],
            progress: {
              totalQuantity: parseFloat(moData.quantity) || 0,
              completedIngredients: 0,
              totalIngredients: ingredients.length
            }
          })
        })
      } catch (e) {
        console.error('Failed to create work order history at start', e)
      }
    })()
  }

  // Handle weighing completion
  const handleWeighingComplete = async () => {
    if (!workOrder) return;
    
    try {
      const response = await fetch('http://localhost:3001/api/weighing/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          moNumber: workOrder.mo,
          ingredients: recipe
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert.success('Penimbangan berhasil diselesaikan!');
        resetWeighing();
      } else {
        alert.error('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error completing weighing:', error);
      alert.error('Error menyelesaikan penimbangan');
    }
  }

  // Use refs to store functions for auto save (avoid circular dependency)
  const handleSaveProgressRef = useRef(null)
  const resetWeighingRef = useRef(null)
  const handlePrintReceiptRef = useRef(null)
  
  // Refs to store latest values for autosave (avoid stale closure in setInterval)
  const selectedIngredientRef = useRef(null)
  const currentWeightRef = useRef(0)
  const workOrderRef = useRef(null)
  const isWeighingActiveRef = useRef(false)
  const autoSaveConfigRef = useRef(autoSaveConfig)
  // CRITICAL: Use ref for counter interval to prevent it from being cleared during re-renders
  const counterIntervalRef = useRef(null)
  // CRITICAL: Use ref to track counter start time to prevent race conditions
  const counterStartTimeRef = useRef(null)
  // Sampling interval ref for range verification during counter
  const samplingIntervalRef = useRef(null)
  // Ref to track last log time for counter progress (prevent spam)
  const counterLastLogTimeRef = useRef(0)
  
  // Update refs when values change
  useEffect(() => {
    selectedIngredientRef.current = selectedIngredient
    currentWeightRef.current = currentWeight
    workOrderRef.current = workOrder
    isWeighingActiveRef.current = isWeighingActive
    autoSaveConfigRef.current = autoSaveConfig
    
    // Debug log when autosave is enabled and values change
    if (autoSaveConfig.enabled && isWeighingActive && selectedIngredient && workOrder) {
      console.log('🔄 Auto save refs updated:', {
        hasIngredient: !!selectedIngredient,
        isWeighingActive,
        hasWorkOrder: !!workOrder,
        currentWeight: currentWeight.toFixed(2)
      })
    }
  }, [selectedIngredient, currentWeight, workOrder, isWeighingActive, autoSaveConfig])

  // Handle save progress
  const handleSaveProgress = useCallback(async (skipPrint = false) => {
    if (!workOrder) {
      alert.error('Error: Work Order tidak tersedia');
      return;
    }
    
    // Validate required fields before sending request
    if (!workOrder.mo) {
      alert.error('Error: MO Number tidak tersedia');
      console.error('Work Order data:', workOrder);
      return;
    }
    
    if (!workOrder.formulationId) {
      alert.error('Error: Formulation ID tidak tersedia');
      console.error('Work Order data:', workOrder);
      return;
    }
    
    if (!recipe || !Array.isArray(recipe)) {
      alert.error('Error: Recipe data tidak valid');
      console.error('Recipe data:', recipe);
      return;
    }
    
    try {
      // Only send the currently selected ingredient that has new weight to save
      // This prevents accidentally processing other ingredients that shouldn't be updated
      // CRITICAL: Always include targetWeight (scaled) when saving
      // This ensures backend saves the scaled target_mass to database
      // Get operator name from currentUser
    const operatorName = currentUser?.name || currentUser?.username || 'Operator';
    
    const ingredientsToSave = selectedIngredient && currentWeight > 0
        ? [{
            ...selectedIngredient,
            // Send only the current reading from scale (not accumulated)
            // Server will accumulate this with saved weight from database
            currentWeight: currentWeight,
            actualWeight: currentWeight,
            // CRITICAL: Explicitly include scaled targetWeight
            targetWeight: selectedIngredient.targetWeight || 0,
            target_mass: selectedIngredient.targetWeight || 0,
            // CRITICAL: Include expDate if available (from product verification modal)
            expDate: selectedIngredient.expDate || null,
            exp_date: selectedIngredient.expDate || null
          }]
        : recipe
            .filter(ing => {
              // Only include ingredients with actual new weight to save
              // Exclude completed ingredients and ingredients with 0 currentWeight
              const hasNewWeight = (ing.currentWeight || 0) > 0;
              const isNotCompleted = ing.status !== 'completed';
              return hasNewWeight && isNotCompleted;
            })
            .map(ing => ({
              ...ing,
              currentWeight: ing.currentWeight || 0,
              actualWeight: ing.currentWeight || 0,
              // CRITICAL: Explicitly include scaled targetWeight
              targetWeight: ing.targetWeight || 0,
              target_mass: ing.targetWeight || 0,
              // CRITICAL: Include expDate if available (from product verification modal)
              expDate: ing.expDate || null,
              exp_date: ing.expDate || null
            }));
      
      // If no ingredients to save, show warning
      if (ingredientsToSave.length === 0) {
        alert.warning('Tidak ada data penimbangan baru untuk disimpan.\n\nPastikan Anda sedang mengukur bahan dan scale menunjukkan berat.', 'Tidak Ada Data')
        return;
      }
      
      const requestBody = {
        moNumber: workOrder.mo,
        formulationId: workOrder.formulationId,
        ingredients: ingredientsToSave,
        progress: {
          totalQuantity: workOrder.orderQty,
          completedIngredients: recipe.filter(ing => ing.status === 'completed').length,
          totalIngredients: recipe.length
        },
        operatorName: operatorName, // Include operator name from currentUser
        operatorId: currentUser?.id || null // Include operator ID from currentUser for database reference
      };
      
      console.log('Saving progress for ingredients:', ingredientsToSave.map(ing => ({
        id: ing.id,
        name: ing.name,
        currentWeight: ing.currentWeight
      })));
      
      console.log('Sending save progress request:', {
        moNumber: requestBody.moNumber,
        formulationId: requestBody.formulationId,
        ingredientsCount: requestBody.ingredients.length
      });
      
      const response = await fetch('http://localhost:3001/api/weighing/save-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // Read response first to check if it's a tolerance violation or other error
      let result;
      try {
        const text = await response.text();
        if (!text) {
          throw new Error('Empty response from server');
        }
        result = JSON.parse(text);
        } catch (e) {
        // If response is not JSON, handle as generic error
        console.error('Failed to parse response:', e);
        console.error('Response status:', response.status);
        console.error('Response statusText:', response.statusText);
        if (!response.ok) {
          const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
          console.error('Error message:', errorMsg);
          alert.error(`Error: ${errorMsg}\n\nSilakan cek console untuk detail lebih lanjut.`);
          throw new Error(errorMsg);
        }
        throw new Error('Failed to parse server response');
      }
      
      // Handle tolerance violation - this is a controlled error response (400 status)
      if (result.error === 'TOLERANCE_VIOLATION' || result.rejected) {
        // IMPORTANT: Print receipt FIRST before showing error (data is already saved)
        // Skip print if skipPrint parameter is true
        if (result.printData && !skipPrint) {
          try {
            if (handlePrintReceiptRef.current) {
              await handlePrintReceiptRef.current(result.printData);
              console.log('✅ Receipt printed for rejected MO before showing error');
            } else {
              console.warn('handlePrintReceipt not yet initialized, skipping print');
            }
          } catch (printError) {
            console.error('Error printing receipt for rejected MO:', printError);
            // Don't block user if print fails
          }
        } else if (skipPrint && result.printData) {
          console.log('⏭️ Print skipped by user request (tolerance violation)');
        }
        
        const violationMsg = result.details || result.message || 'Berat melebihi toleransi yang diizinkan';
        const ingredientName = result.violatingIngredient?.name || result.violatingIngredient?.product_name || 'Bahan';
        
        // Safely format numeric values
        const accumulatedMass = parseFloat(result.violatingIngredient?.accumulatedMass || 0) || 0;
        const toleranceMax = parseFloat(result.violatingIngredient?.toleranceMax || 0) || 0;
        const actualWeight = isNaN(accumulatedMass) ? '0.00' : accumulatedMass.toFixed(2);
        const maxWeight = isNaN(toleranceMax) ? '0.00' : toleranceMax.toFixed(2);
        
        alert.warning(`PELANGGARAN TOLERANSI!\n\n${violationMsg}\n\n` +
              `Detail:\n` +
              `- Bahan: ${ingredientName}\n` +
              `- Berat Aktual: ${actualWeight} g\n` +
              `- Batas Maksimal: ${maxWeight} g\n\n` +
              `Data penimbangan telah disimpan dan dicetak.\n` +
              `MO akan ditolak (status: REJECT) dan Anda akan dikembalikan ke halaman utama.`);
        
        // Force reset - clear everything
        if (resetWeighingRef.current) {
          resetWeighingRef.current();
        } else {
          setWorkOrder(null)
          setRecipe([])
          setSelectedIngredient(null)
          setIsWeighingActive(false)
          setCurrentWeight(0)
          setZeroCheckWeight(0) // Reset zero check weight
          setShowProductVerification(false)
          setShowBarcodeScanner(false)
        }
        
        // Navigate to home page
        setCurrentPage('home');
        return;
      }
      
      // Handle other errors (non-tolerance violations)
      if (!response.ok && !result.success) {
        const errorMessage = result.error || result.details || `HTTP ${response.status}: ${response.statusText}`;
        const errorDetails = result.details || result.message || '';
        const fullErrorMsg = errorDetails ? `${errorMessage}\n\nDetail: ${errorDetails}` : errorMessage;
        
        console.error('Error saving progress:', {
          status: response.status,
          error: result.error,
          details: result.details,
          message: result.message,
          receivedBody: result.receivedBody
        });
        
        alert.error(`Error menyimpan progress:\n\n${fullErrorMsg}`);
        throw new Error(errorMessage);
      }
      
      if (result.success) {
        // Print receipt FIRST if printData is available (before any redirect/reset)
        // Skip print if skipPrint parameter is true
        if (result.printData && !skipPrint) {
          if (handlePrintReceiptRef.current) {
            handlePrintReceiptRef.current(result.printData)
              .then(() => {
                console.log('✅ Receipt generation & queue request completed (background)')
              })
              .catch((printError) => {
                console.error('Error printing receipt:', printError)
              })
          } else {
            console.warn('handlePrintReceipt not yet initialized, skipping print')
          }
        } else if (skipPrint && result.printData) {
          console.log('⏭️ Print skipped by user request')
        }
        
        // Check if MO was auto-completed (all ingredients completed)
        // Only show this message if ALL ingredients in formulation are truly completed
        if (result.autoCompleted && result.moStatus === 'completed') {
          const completedCount = result.progress?.completed || 0;
          const totalCount = result.progress?.total || 0;
          
          // Double-check: only show if all ingredients are completed
          if (completedCount > 0 && totalCount > 0 && completedCount === totalCount) {
            alert.success(`SEMUA BAHAN TELAH SELESAI DITIMBANG!\n\n` +
                  `Progress: ${completedCount}/${totalCount} bahan completed\n\n` +
                  `MO otomatis diselesaikan (status: COMPLETED).`, 'Penimbangan Selesai')
          // Reset after auto-completion (print already done above)
          if (resetWeighingRef.current) {
            resetWeighingRef.current();
          } else {
            setWorkOrder(null)
            setRecipe([])
            setSelectedIngredient(null)
            setIsWeighingActive(false)
            setCurrentWeight(0)
            setZeroCheckWeight(0) // Reset zero check weight
            setShowProductVerification(false)
            setShowBarcodeScanner(false)
          }
          setCurrentPage('home');
          return;
          } else {
            console.warn(`⚠️ MO marked as completed but ingredients count mismatch: ${completedCount}/${totalCount}`);
          }
        }
        
        alert.success('Progress berhasil disimpan!');
        
        // Reset auto save state after successful manual save
        // CRITICAL: Clear refs too
        if (counterIntervalRef.current) {
          clearInterval(counterIntervalRef.current)
          counterIntervalRef.current = null
        }
        counterStartTimeRef.current = null
        
        setAutoSaveState(prev => {
          return {
            ...prev,
            isSaving: false,
            lastSavedWeight: currentWeight,
            counterStartTime: null,
            counterInterval: null,
            lastCheckedWeight: 0
          }
        })
        
        // CRITICAL: Store current recipe state BEFORE resetting anything
        // This allows us to preserve currentWeight for ingredients that are still being weighed
        const currentRecipeState = [...recipe];
        
        // CRITICAL: Reset all weighing state immediately after save
        // This prevents stuck state and ensures clean state for next weighing
        setSelectedIngredient(null);
        setCurrentWeight(0);
        setIsWeighingActive(false); // Stop weighing immediately to prevent stuck state
        setZeroCheckWeight(0); // Reset zero check weight to allow fresh polling for next ingredient
        setShowProductVerification(false);
        
        // CRITICAL: Reset currentWeight for all ingredients in recipe state immediately
        // This ensures no ingredient has stuck currentWeight after save
        setRecipe(prev => prev.map(ing => ({
          ...ing,
          currentWeight: 0  // Reset currentWeight for all ingredients after save
        })));
        
        // OPTIMIZED: Fetch updated recipe from backend in background (non-blocking)
        // This ensures we have the correct status without blocking UI or zero check polling
        // Fire and forget - don't await, let it complete in background
        (async () => {
          try {
            const refreshResponse = await fetch(`http://localhost:3001/api/work-orders/${encodeURIComponent(workOrder.mo)}`);
            const refreshData = await refreshResponse.json();
          
          if (refreshData && refreshData.success && refreshData.data) {
            const refreshedIngredients = refreshData.data.ingredients || [];
            
            // Map refreshed ingredients to match recipe structure
            // CRITICAL: Preserve all data including scaled target_mass and saved actual_mass
            const updatedRecipe = refreshedIngredients.map(it => {
              const actualMass = parseFloat(it.actual_mass || 0) || 0;
              const targetMass = parseFloat(it.target_mass || 0) || 0; // SCALED target from database!
              
              // Find existing ingredient in current recipe to preserve currentWeight if still weighing
              const existingIngredient = currentRecipeState.find(ing => 
                (ing.id === it.ingredient_id) || 
                (ing.id === it.product_code) ||
                (ing.code === it.product_code)
              );
              
              // CRITICAL FIX: Preserve currentWeight if ingredient is still being weighed (not completed)
              // Only reset currentWeight if ingredient was just saved (not if it's a different ingredient)
              const wasJustSaved = ingredientsToSave.some(saved => 
                (saved.id === it.ingredient_id) || 
                (saved.id === it.product_code) ||
                (saved.code === it.product_code)
              );
              
              // Preserve currentWeight if:
              // 1. Ingredient exists in current recipe
              // 2. Has currentWeight > 0
              // 3. Status is not completed
              // 4. Was NOT just saved (don't preserve currentWeight for ingredient that was just saved)
              const shouldPreserveCurrentWeight = existingIngredient && 
                existingIngredient.currentWeight > 0 && 
                it.status !== 'completed' &&
                !wasJustSaved; // CRITICAL: Don't preserve if this ingredient was just saved
              
              // CRITICAL: Log for debugging savedWeight update issue
              if (wasJustSaved) {
                const previousSavedWeight = existingIngredient ? (existingIngredient.savedWeight || 0) : 0;
                const previousCurrentWeight = existingIngredient ? (existingIngredient.currentWeight || 0) : 0;
                console.log(`💾 Updating savedWeight for ${it.product_name}:`, {
                  previousSavedWeight,
                  previousCurrentWeight,
                  expectedAccumulated: previousSavedWeight + previousCurrentWeight,
                  actualMassFromDB: actualMass,
                  wasJustSaved,
                  ingredientId: it.ingredient_id
                });
              }
              
              return {
                id: it.ingredient_id || it.product_code,
                code: it.product_code || '',
                name: it.product_name || 'Unknown',
                currentWeight: shouldPreserveCurrentWeight ? (existingIngredient.currentWeight || 0) : 0, // Preserve if still weighing (and not just saved)
                targetWeight: targetMass, // SCALED target weight from database (CRITICAL!)
                status: it.status || 'pending', // Use status from backend (includes 'completed' if within tolerance)
                savedWeight: actualMass, // Updated accumulated weight from database (CRITICAL: don't lose this!)
                totalWeight: actualMass + (shouldPreserveCurrentWeight ? (existingIngredient.currentWeight || 0) : 0), // Total = saved + current
                actualWeight: actualMass,
                progressPercentage: parseFloat(it.progress_percentage || 0) || 0,
                remainingWeight: parseFloat(it.remaining_weight || 0) || 0,
                isWithinTolerance: it.is_within_tolerance,
                toleranceMin: parseFloat(it.tolerance_min || 0) || 0,
                toleranceMax: parseFloat(it.tolerance_max || 0) || 0,
                weighingStartedAt: it.weighing_started_at,
                weighingUpdatedAt: it.weighing_updated_at,
                weighingCompletedAt: it.weighing_completed_at,
                weighingNotes: it.weighing_notes || '',
                sessionNumber: it.last_session_number || null // CRITICAL: Include updated session number after save
              };
            });
            
            console.log('🔄 Refreshed recipe from backend after save (SCALED, background):', updatedRecipe.map(ing => ({
              id: ing.id,
              name: ing.name,
              savedWeight: ing.savedWeight,
              targetWeight: ing.targetWeight,
              currentWeight: ing.currentWeight,
              totalWeight: ing.totalWeight,
              status: ing.status,
              scalingInfo: workOrder.scalingFactor ? `Scaling: ${workOrder.scalingFactor}x` : 'No scaling'
            })));
            
            // Verify all ingredients have savedWeight preserved
            const lostWeights = updatedRecipe.filter(ing => {
              const original = currentRecipeState.find(o => o.id === ing.id || o.code === ing.code);
              return original && original.savedWeight > 0 && ing.savedWeight === 0;
            });
            
            if (lostWeights.length > 0) {
              console.warn('⚠️  WARNING: Some ingredients lost savedWeight:', lostWeights.map(ing => ({
                name: ing.name,
                original: currentRecipeState.find(o => o.id === ing.id)?.savedWeight || 0,
                refreshed: ing.savedWeight
              })));
            }
            
            // CRITICAL: Force React to re-render by creating new array reference
            // This ensures RecipePanel receives the updated recipe prop
            // CRITICAL: Ensure all currentWeight is reset to 0 after save
            // This prevents stuck state where currentWeight persists after save
            const cleanedRecipe = updatedRecipe.map(ing => ({
              ...ing,
              currentWeight: 0  // Force reset all currentWeight after save refresh
            }));
            
            setRecipe([...cleanedRecipe]);
            
            // Log for debugging RecipePanel update
            console.log('📋 Recipe state updated, RecipePanel should re-render with:', cleanedRecipe.map(ing => ({
              name: ing.name,
              savedWeight: ing.savedWeight,
              currentWeight: ing.currentWeight,
              displayWeight: ing.savedWeight + ing.currentWeight // This is what RecipePanel will show
            })));
            
            // Ensure isWeighingActive is false after save (should already be false from above)
            setIsWeighingActive(false);
          } else {
            // Fallback: update recipe locally if refresh fails
            console.warn('⚠️ Failed to refresh recipe from backend, using local update');
            const savedIngredientIds = ingredientsToSave.map(ing => ing.id);
            
            setRecipe(prev => prev.map(ing => {
              if (savedIngredientIds.includes(ing.id)) {
                const previousSavedWeight = ing.savedWeight || 0;
                const currentReading = ing.currentWeight || 0;
                const newSavedWeight = previousSavedWeight + currentReading;
                
                // Calculate if within tolerance for local check
                const targetWeight = ing.targetWeight || 0;
                const toleranceMin = ing.toleranceMin !== undefined && ing.toleranceMin !== null
                  ? parseFloat(ing.toleranceMin)
                  : Math.max(0, targetWeight - 3);
                const toleranceMax = ing.toleranceMax !== undefined && ing.toleranceMax !== null
                  ? parseFloat(ing.toleranceMax)
                  : targetWeight + 3;
                
                const withinTolerance = targetWeight > 0 && newSavedWeight >= toleranceMin && newSavedWeight <= toleranceMax;
                
                return { 
                  ...ing, 
                  status: (ing.status === 'completed' || withinTolerance) ? 'completed' : 'weighing',
                  savedWeight: newSavedWeight,
                  currentWeight: 0, // CRITICAL: Reset currentWeight after save
                  totalWeight: newSavedWeight
                };
              }
              
              // CRITICAL: Reset currentWeight for all other ingredients
              // This ensures no stuck state after save
              return { 
                ...ing, 
                currentWeight: 0  // Reset currentWeight for all ingredients after save
              };
            }));
            
            // Ensure isWeighingActive is false in fallback case too
            setIsWeighingActive(false);
          }
          } catch (refreshError) {
            console.error('❌ Error refreshing recipe after save (non-critical, background):', refreshError);
          // Fallback to local update
          const savedIngredientIds = ingredientsToSave.map(ing => ing.id);
          
          setRecipe(prev => prev.map(ing => {
            if (savedIngredientIds.includes(ing.id)) {
              const previousSavedWeight = ing.savedWeight || 0;
              const currentReading = ing.currentWeight || 0;
              const newSavedWeight = previousSavedWeight + currentReading;
              
              const targetWeight = ing.targetWeight || 0;
              const toleranceMin = ing.toleranceMin !== undefined && ing.toleranceMin !== null
                ? parseFloat(ing.toleranceMin)
                : Math.max(0, targetWeight - 3);
              const toleranceMax = ing.toleranceMax !== undefined && ing.toleranceMax !== null
                ? parseFloat(ing.toleranceMax)
                : targetWeight + 3;
              
              const withinTolerance = targetWeight > 0 && newSavedWeight >= toleranceMin && newSavedWeight <= toleranceMax;
              
              return { 
                ...ing, 
                status: (ing.status === 'completed' || withinTolerance) ? 'completed' : 'weighing',
                savedWeight: newSavedWeight,
                currentWeight: 0,
                totalWeight: newSavedWeight
              };
            }
            
            if (ing.currentWeight && ing.currentWeight > 0 && ing.status !== 'completed') {
              return { ...ing, currentWeight: 0 };
            }
            
            return ing;
          }));
          }
        })(); // Execute async function immediately, don't await - runs in background
      } else {
        alert.error('Error: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      console.error('Error details:', error.message);
      alert.error('Error menyimpan progress: ' + error.message);
      // Reset auto save state on error
      setAutoSaveState(prev => ({
        ...prev,
        isSaving: false,
        counterStartTime: null,
        counterInterval: null
      }))
    }
  }, [
    workOrder,
    recipe,
    selectedIngredient,
    currentWeight,
    alert
  ])

  // Update refs when functions change - CRITICAL: This must run immediately
  useEffect(() => {
    handleSaveProgressRef.current = handleSaveProgress
    // Removed excessive logging - only log when needed for debugging
  }, [handleSaveProgress])

  // Print receipt function - supports multiple print methods (Windows RAW, Network TCP/IP, COM Serial)
  const handlePrintReceipt = useCallback(async (printData) => {
    try {
      const activeTemplate = getActiveLabelTemplate()
      const labelWidth = activeTemplate?.width || 72
      const labelHeight = activeTemplate?.height || 100
      const labelDPI = activeTemplate?.dpi || 203
      const layoutConfig = activeTemplate?.layout || {}

      // Step 1: Generate ZPL receipt data with custom label size
      const receiptRequestData = {
        ...printData,
        labelWidth,
        labelHeight,
        labelDPI,
        layout: layoutConfig
      };
      
      const receiptResponse = await fetch('http://localhost:3001/api/print/weighing-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(receiptRequestData),
      });

      const receiptResult = await receiptResponse.json();
      
      if (!receiptResult.success) {
        throw new Error(receiptResult.error || 'Failed to generate receipt');
      }

      console.log('✅ ZPL receipt generated successfully');
      console.log(`   Method: ${printerConfig.printMethod}`);
      console.log(`   Paper size: ${receiptResult.paperSize}, DPI: ${receiptResult.dpi}`);
      
      // Step 2: Send ZPL to printer using configured method (async mode - non-blocking)
      // Prepare print request based on method
      const printRequestBody = {
        receiptBase64: receiptResult.receiptBase64,
        receipt: receiptResult.receipt,
        printMethod: printerConfig.printMethod,
        async: true // Enable async mode for faster response (non-blocking)
      };

      // Add method-specific parameters
      switch (printerConfig.printMethod) {
        case 'network-tcp':
          printRequestBody.printerIP = printerConfig.printerIP;
          printRequestBody.networkPort = printerConfig.networkPort || 9100;
          console.log(`   Network printer: ${printerConfig.printerIP}:${printRequestBody.networkPort}`);
          break;
        case 'serial-com':
          printRequestBody.comPort = printerConfig.comPort;
          printRequestBody.baudRate = printerConfig.baudRate || 9600;
          console.log(`   Serial printer: ${printerConfig.comPort} at ${printRequestBody.baudRate} baud`);
          break;
        case 'windows-raw':
        default:
          printRequestBody.printerPort = printerConfig.printerPort || 'Xprinter XP-420B';
          console.log(`   Windows printer: ${printRequestBody.printerPort}`);
          break;
      }

      // Send print request (async mode - non-blocking)
      // Use fetch without await to make it fire-and-forget for faster response
      fetch('http://localhost:3001/api/print/send-to-xp420', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        body: JSON.stringify(printRequestBody),
      })
      .then(async (printResponse) => {
        const printResult = await printResponse.json();
        if (printResult.success) {
          console.log(`✅ Receipt queued to printer successfully (${printResult.method}):`, printResult.message);
        } else {
          console.warn('⚠️ Failed to queue print job:', printResult.error);
          // Log error but don't block user (print is processed in background)
        }
      })
      .catch((printError) => {
        console.warn('⚠️ Error sending print request:', printError);
        // Log error but don't block user (print is processed in background)
      });

      // Return immediately without waiting for print to complete
      // Print job is queued and will be processed in background
      console.log(`✅ Receipt generated and print job queued (async mode)`);
        return receiptResult;
    } catch (error) {
      console.error('Error printing receipt:', error);
      throw error;
    }
  }, [printerConfig, getActiveLabelTemplate])

  // Update handlePrintReceipt ref
  useEffect(() => {
    handlePrintReceiptRef.current = handlePrintReceipt
  }, [handlePrintReceipt])

  // Print current weighing receipt (for Print button)
  const handlePrintCurrentReceipt = async () => {
    if (!selectedIngredient || !workOrder) {
      alert.warning('Tidak ada data penimbangan untuk dicetak. Pilih ingredient terlebih dahulu.', 'Tidak Ada Data')
      return;
    }

    const savedWeight = selectedIngredient.savedWeight || 0;
    const currentReading = currentWeight || 0;
    const totalWeight = savedWeight + currentReading;

    // Calculate next session number for this print
    // This represents which weighing number this is (1st, 2nd, 3rd, etc.)
    // If last session was 2, this print is for session 3 (the next one)
    const lastSessionNumber = selectedIngredient.sessionNumber || 0;
    const nextSessionNumber = lastSessionNumber + 1;

    console.log(`🖨️  Print receipt data:`, {
      ingredient: selectedIngredient.name,
      currentWeight: currentReading,
      totalWeight: totalWeight,
      lastSessionNumber: lastSessionNumber,
      nextSessionNumber: nextSessionNumber,
      scalingFactor: workOrder.scalingFactor || '1.00x'
    });

    const printData = {
      skuName: workOrder.formulaName || workOrder.skuName || workOrder.formulationName || workOrder.mo || 'N/A',
      ingredientName: selectedIngredient.name || 'N/A',
      currentWeight: totalWeight, // Use total weight (saved + current reading)
      sessionNumber: nextSessionNumber, // Use next session number (for current weighing)
      operatorName: 'Operator',
      moNumber: workOrder.mo || null,
      expDate: selectedIngredient.expDate || null // Include expiration date if available
    };

    alert.info('Mengirim data cetak ke printer...', 'Sedang Mencetak')
    handlePrintReceipt(printData)
      .then(() => {
        alert.success('Print berhasil dikirim ke printer.', 'Print Selesai')
      })
      .catch((error) => {
        console.error('Error printing receipt:', error)
        alert.error('Gagal mencetak receipt: ' + error.message, 'Print Gagal')
      });
  }

  // Reset weighing process
  const resetWeighing = useCallback(() => {
    setWorkOrder(null)
    setRecipe([])
    setSelectedIngredient(null)
    setIsWeighingActive(false)
    setCurrentWeight(0)
    setZeroCheckWeight(0) // Reset zero check weight
    setShowProductVerification(false)
    setShowBarcodeScanner(false)
  }, [])

  // Update resetWeighing ref
  useEffect(() => {
    resetWeighingRef.current = resetWeighing
  }, [resetWeighing])

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <div className="home-content">
            <RecipePanel 
              workOrder={workOrder}
              recipe={recipe}
              onIngredientClick={handleIngredientClick}
              onStartScan={handleStartScan}
              onStartMOScan={() => setShowMOScanModal(true)}
              isWeighingActive={isWeighingActive}
              selectedIngredient={selectedIngredient}
            />
            <RightPanel 
              workOrder={workOrder}
              selectedIngredient={selectedIngredient}
              currentPage={currentPage}
              currentWeight={currentWeight}
              scaleConnected={scaleConnected}
              onSaveProgress={handleSaveProgress}
              onCompleteWeighing={handleWeighingComplete}
              isWeighingActive={isWeighingActive}
              onPrintReceipt={handlePrintCurrentReceipt}
              onStartWeighing={handleStartWeighingFromPanel}
              scaleDisplayWeight={scaleDisplayWeight}
              zeroCheckWeight={zeroCheckWeight}
              showProductVerification={showProductVerification}
            />
          </div>
        )
      case 'database':
        return <Database />
      case 'database-import':
        return <DatabaseImport />
      case 'settings':
        return <Settings />
      case 'history':
        return <History 
          currentUser={currentUser}
          onNavigateToDetail={(moNumber) => setCurrentPage(`history-detail-${moNumber}`)} 
        />
      case 'user-management':
        return <UserManagement 
          currentUser={currentUser}
          onAccessDenied={() => setCurrentPage('home')}
        />
      case 'weighing-receiver':
        return <WeighingReceiverList 
          onNavigateToDetail={(dataId) => setCurrentPage(`weighing-receiver-detail-${dataId}`)} 
        />
      default:
        if (currentPage && currentPage.startsWith('history-detail-')) {
          const moNumber = currentPage.replace('history-detail-', '')
          return <HistoryDetail 
            moNumber={moNumber} 
            currentUser={currentUser}
            onBack={() => setCurrentPage('history')} 
          />
        }
        if (currentPage && currentPage.startsWith('weighing-receiver-detail-')) {
          const dataId = currentPage.replace('weighing-receiver-detail-', '')
          return <WeighingReceiverDetail 
            dataId={dataId}
            onBack={() => setCurrentPage('weighing-receiver')} 
          />
        }
        return (
          <div className="home-content">
            <RecipePanel 
              workOrder={workOrder}
              recipe={recipe}
              onIngredientClick={handleIngredientClick}
              onStartScan={handleStartScan}
              onStartMOScan={() => setShowMOScanModal(true)}
              isWeighingActive={isWeighingActive}
              selectedIngredient={selectedIngredient}
            />
            <RightPanel 
              workOrder={workOrder}
              selectedIngredient={selectedIngredient}
              currentPage={currentPage}
              currentWeight={currentWeight}
              scaleConnected={scaleConnected}
              onSaveProgress={handleSaveProgress}
              onCompleteWeighing={handleWeighingComplete}
              isWeighingActive={isWeighingActive}
              onPrintReceipt={handlePrintCurrentReceipt}
              onStartWeighing={handleStartWeighingFromPanel}
              scaleDisplayWeight={scaleDisplayWeight}
              zeroCheckWeight={zeroCheckWeight}
              showProductVerification={showProductVerification}
            />
          </div>
        )
      }
    }

  const handleLogin = (user) => {
    setCurrentUser(user)
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setIsLoggedIn(false)
    setWorkOrder(null)
    setRecipe([])
    setSelectedIngredient(null)
  }

  const handleRefresh = () => {
    // Refresh data
    console.log('Refreshing data...')
  }

  // Show login page if not logged in
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="app">
      <Header 
        currentUser={currentUser}
        onRefresh={handleRefresh}
        onLogout={handleLogout}
      />
      
      <div className="main-content">
        <LeftPanel 
          workOrder={workOrder}
          recipe={recipe}
          onIngredientClick={handleIngredientClick}
          onStartScan={handleStartScan}
          onStartMOScan={() => setShowMOScanModal(true)}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          currentUser={currentUser}
        />
        {renderCurrentPage()}
      </div>

      <Footer currentTime={currentTime} />

      {showBarcodeScanner && (
        useHardwareScanner ? (
          <HardwareBarcodeScanner 
            type={scanType}
            onScan={handleBarcodeScan}
            onClose={() => setShowBarcodeScanner(false)}
          />
        ) : (
          <BarcodeScanner 
            type={scanType}
            onScan={handleBarcodeScan}
            onClose={() => setShowBarcodeScanner(false)}
          />
        )
      )}

      {showProductVerification && selectedIngredient && (
        <ProductVerification 
          ingredient={selectedIngredient}
          onVerify={handleProductVerification}
          onClose={() => {
            setShowProductVerification(false)
            setSelectedIngredient(null) // Reset ingredient when modal is cancelled
          }}
        />
      )}

      {showMOScanModal && (
        <MOScanModal
          isOpen={showMOScanModal}
          onClose={() => setShowMOScanModal(false)}
          onStartWeighing={handleStartWeighing}
        />
      )}
    </div>
  )
}

function App() {
  return (
    <AlertModalProvider>
      <AppContent />
    </AlertModalProvider>
  )
}

export default App
