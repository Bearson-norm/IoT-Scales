import React, { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Save, RotateCcw, Scale, Database, User, Bell, Shield, Server, Printer } from 'lucide-react'
import ServerDatabaseConfig from './ServerDatabaseConfig'
import { useAlert } from '../utils/alertModal'
import { createDefaultLabelTemplate, mergeTemplateWithDefaults, cloneTemplate } from '../utils/labelTemplates'

// API Base URL for standalone executable compatibility
const API_BASE_URL = 'http://localhost:3001/api'

// Label Preview Component
const LabelPreview = ({ width, height, dpi, layout = {} }) => {
  // Default layout values (matching server.js DEFAULT_LABEL_LAYOUT)
  const DEFAULT_LAYOUT = {
    marginLeftMm: 5,
    marginTopMm: 5,
    sectionSpacingMm: 6,
    lineSpacingMm: 4,
    lineThicknessDots: 2,
    headerFontPt: 28,
    labelFontPt: 14,
    valueFontPt: 16,
    weightFontPt: 26,
    footerFontPt: 12,
    rightColumnMarginMm: 20,
    lineWidthMm: 62
  };

  const layoutConfig = { ...DEFAULT_LAYOUT, ...layout };
  
  // Convert mm to pixels for display (assuming 96 DPI for screen)
  const mmToPx = (mm) => (mm / 25.4) * 96;
  const ptToPx = (pt) => (pt / 72) * 96;
  
  // Calculate dimensions
  const labelWidthPx = mmToPx(width);
  const labelHeightPx = mmToPx(height);
  const marginLeftPx = mmToPx(layoutConfig.marginLeftMm);
  const marginTopPx = mmToPx(layoutConfig.marginTopMm);
  const sectionSpacingPx = mmToPx(layoutConfig.sectionSpacingMm);
  const lineSpacingPx = mmToPx(layoutConfig.lineSpacingMm);
  const lineWidthPx = mmToPx(layoutConfig.lineWidthMm);
  const rightColumnMarginPx = mmToPx(layoutConfig.rightColumnMarginMm);
  
  // Font sizes in pixels
  const headerFontPx = ptToPx(layoutConfig.headerFontPt);
  const labelFontPx = ptToPx(layoutConfig.labelFontPt);
  const valueFontPx = ptToPx(layoutConfig.valueFontPt);
  const weightFontPx = ptToPx(layoutConfig.weightFontPt);
  const footerFontPx = ptToPx(layoutConfig.footerFontPt);
  
  // Sample data for preview
  const sampleData = {
    skuName: 'PRODUK CONTOH',
    ingredientName: 'BAHAN CONTOH',
    currentWeight: 1234.56,
    targetWeight: 2000.00,
    remainingWeight: 765.44,
    operatorName: 'Operator',
    dateStr: new Date().toLocaleDateString('id-ID'),
    timeStr: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    moNumber: 'MO-2024-001'
  };
  
  const currentWeightStr = sampleData.currentWeight.toFixed(2);
  const targetWeightStr = sampleData.targetWeight.toFixed(2);
  const remainingWeightStr = sampleData.remainingWeight.toFixed(2);
  
  // Calculate positions - simulate ZPL positioning
  const rightColumnX = Math.max(marginLeftPx, labelWidthPx - rightColumnMarginPx);
  
  // Calculate cumulative Y positions (matching ZPL generation logic)
  let yPos = marginTopPx;
  const headerY = yPos;
  yPos += headerFontPx + lineSpacingPx;
  const moY = yPos; // MO number position (below header)
  yPos += labelFontPx + sectionSpacingPx; // Add spacing after MO if present
  const line1Y = yPos;
  yPos += layoutConfig.lineThicknessDots + sectionSpacingPx;
  const skuLabelY = yPos;
  yPos += labelFontPx + lineSpacingPx;
  const skuValueY = yPos;
  yPos += valueFontPx + sectionSpacingPx;
  const ingredientLabelY = yPos;
  yPos += labelFontPx + lineSpacingPx;
  const ingredientValueY = yPos;
  yPos += valueFontPx + sectionSpacingPx;
  const line2Y = yPos;
  yPos += layoutConfig.lineThicknessDots + sectionSpacingPx;
  const weightLabelY = yPos;
  yPos += labelFontPx + lineSpacingPx;
  const weightValueY = yPos;
  yPos += weightFontPx + sectionSpacingPx;
  const targetY = yPos;
  yPos += labelFontPx + lineSpacingPx;
  const remainingLabelY = yPos;
  yPos += labelFontPx + lineSpacingPx;
  const remainingValueY = yPos;
  yPos += weightFontPx + sectionSpacingPx;
  const line3Y = yPos;
  yPos += layoutConfig.lineThicknessDots + sectionSpacingPx;
  const footerY = labelHeightPx - marginTopPx - footerFontPx;
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '15px',
      padding: '20px',
      backgroundColor: '#f9f9f9',
      borderRadius: '8px',
      border: '1px solid #e0e0e0'
    }}>
      <div style={{
        width: `${labelWidthPx}px`,
        height: `${labelHeightPx}px`,
        backgroundColor: 'white',
        border: '2px solid #333',
        borderRadius: '4px',
        padding: '0',
        position: 'relative',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        minHeight: '200px' // Ensure minimum size for small labels
      }}>
        {/* Label Content */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          fontFamily: 'monospace, "Courier New", Courier',
          color: '#000',
          lineHeight: '1.2'
        }}>
          {/* Header */}
          <div style={{
            position: 'absolute',
            left: `${marginLeftPx}px`,
            top: `${headerY}px`,
            fontSize: `${headerFontPx}px`,
            fontWeight: 'bold'
          }}>
            LABEL PENIMBANGAN
          </div>
          {sampleData.moNumber && (
            <div style={{
              position: 'absolute',
              left: `${marginLeftPx}px`,
              top: `${moY}px`,
              fontSize: `${labelFontPx}px`
            }}>
              MO: {sampleData.moNumber}
            </div>
          )}
          
          {/* Line 1 */}
          <div style={{
            position: 'absolute',
            left: `${marginLeftPx}px`,
            top: `${line1Y}px`,
            width: `${lineWidthPx}px`,
            height: `${layoutConfig.lineThicknessDots}px`,
            backgroundColor: '#000'
          }} />
          
          {/* SKU/Product */}
          <div style={{
            position: 'absolute',
            left: `${marginLeftPx}px`,
            top: `${skuLabelY}px`,
            fontSize: `${labelFontPx}px`
          }}>
            SKU/PRODUK:
          </div>
          <div style={{
            position: 'absolute',
            left: `${marginLeftPx}px`,
            top: `${skuValueY}px`,
            fontSize: `${valueFontPx}px`,
            fontWeight: '500'
          }}>
            {sampleData.skuName}
          </div>
          
          {/* Ingredient */}
          <div style={{
            position: 'absolute',
            left: `${marginLeftPx}px`,
            top: `${ingredientLabelY}px`,
            fontSize: `${labelFontPx}px`
          }}>
            BAHAN:
          </div>
          <div style={{
            position: 'absolute',
            left: `${marginLeftPx}px`,
            top: `${ingredientValueY}px`,
            fontSize: `${valueFontPx}px`,
            fontWeight: '500'
          }}>
            {sampleData.ingredientName}
          </div>
          
          {/* Line 2 */}
          <div style={{
            position: 'absolute',
            left: `${marginLeftPx}px`,
            top: `${line2Y}px`,
            width: `${lineWidthPx}px`,
            height: `${layoutConfig.lineThicknessDots}px`,
            backgroundColor: '#000'
          }} />
          
          {/* Weight Data */}
          <div style={{
            position: 'absolute',
            left: `${marginLeftPx}px`,
            top: `${weightLabelY}px`,
            fontSize: `${labelFontPx}px`
          }}>
            Berat Saat Ini:
          </div>
          <div style={{
            position: 'absolute',
            left: `${marginLeftPx}px`,
            top: `${weightValueY}px`,
            fontSize: `${weightFontPx}px`,
            fontWeight: 'bold'
          }}>
            {currentWeightStr} gram
          </div>
          <div style={{
            position: 'absolute',
            left: `${marginLeftPx}px`,
            top: `${targetY}px`,
            fontSize: `${labelFontPx}px`
          }}>
            Target: {targetWeightStr} gram
          </div>
          <div style={{
            position: 'absolute',
            left: `${marginLeftPx}px`,
            top: `${remainingLabelY}px`,
            fontSize: `${labelFontPx}px`
          }}>
            Sisa:
          </div>
          <div style={{
            position: 'absolute',
            left: `${marginLeftPx}px`,
            top: `${remainingValueY}px`,
            fontSize: `${weightFontPx}px`,
            fontWeight: 'bold'
          }}>
            {remainingWeightStr} gram
          </div>
          
          {/* Line 3 */}
          <div style={{
            position: 'absolute',
            left: `${marginLeftPx}px`,
            top: `${line3Y}px`,
            width: `${lineWidthPx}px`,
            height: `${layoutConfig.lineThicknessDots}px`,
            backgroundColor: '#000'
          }} />
          
          {/* Footer */}
          <div style={{
            position: 'absolute',
            left: `${marginLeftPx}px`,
            right: `${rightColumnMarginPx}px`,
            bottom: `${marginTopPx}px`,
            fontSize: `${footerFontPx}px`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end'
          }}>
            <span>{sampleData.dateStr} {sampleData.timeStr}</span>
            {sampleData.operatorName && (
              <span>Op: {sampleData.operatorName}</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Label Info */}
      <div style={{
        fontSize: '12px',
        color: '#666',
        textAlign: 'center'
      }}>
        Ukuran: {width}mm × {height}mm @ {dpi} DPI
        <br />
        <span style={{ fontSize: '11px', color: '#999' }}>
          Preview ini menunjukkan bagaimana label akan terlihat saat dicetak
        </span>
      </div>
    </div>
  );
};

const BASE_DEFAULT_LABEL_TEMPLATE = createDefaultLabelTemplate({
  id: 'default-label-72x100',
  name: 'Label 72 × 100 mm (Default)'
})

const cloneDefaultLabelTemplate = () =>
  mergeTemplateWithDefaults({
    ...BASE_DEFAULT_LABEL_TEMPLATE,
    layout: { ...BASE_DEFAULT_LABEL_TEMPLATE.layout }
  })

const Settings = () => {
  const { alert } = useAlert()
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState({
    // General Settings
    companyName: 'Foom Lab Global',
    appVersion: 'v1.0.0',
    language: 'id',
    timezone: 'Asia/Jakarta',
    
    // Auto Save Settings
    autoSaveEnabled: false,
    autoSaveCounterTime: 3,
    autoSaveThreshold: 0.5,
    autoSaveOnlyInRange: true,
    
    // Scale Settings (Vibra)
    scalePort: 'COM1',
    scaleBaudRate: 9600,
    scaleDataBits: 8,
    scaleParity: 'none',
    scaleStopBits: 2,
    scaleTimeout: 3000,
    scaleModel: 'vibra',
    weightUnit: 'kg',
    autoTare: true,
    weightTolerance: 0.1,
    
    // Database Settings
    dbHost: 'localhost',
    dbPort: 5432,
    dbName: 'FLB_MOWS',
    dbUser: 'postgres',
    backupInterval: 24,
    
    // User Settings
    sessionTimeout: 30,
    requirePasswordChange: false,
    maxLoginAttempts: 3,
    
    // Notification Settings
    enableNotifications: true,
    emailNotifications: false,
    soundNotifications: true,
    lowWeightAlert: true,
    errorAlert: true,
    
    // Printer Settings
    printMethod: 'windows-raw', // 'windows-raw', 'network-tcp', 'serial-com'
    printerFormat: 'ZPL', // 'ZPL' or 'ESC-POS'
    printerPort: 'Xprinter XP-420B',
    printerIP: '192.168.1.100',
    networkPort: 9100,
    comPort: 'COM3',
    baudRate: 9600,
    
    // Label Template Settings
    labelTemplates: [cloneDefaultLabelTemplate()],
    activeLabelTemplateId: BASE_DEFAULT_LABEL_TEMPLATE.id,
    labelWidth: BASE_DEFAULT_LABEL_TEMPLATE.width,
    labelHeight: BASE_DEFAULT_LABEL_TEMPLATE.height,
    labelDPI: BASE_DEFAULT_LABEL_TEMPLATE.dpi,
    
    // Label Size Settings (legacy compatibility)
    labelWidthLegacy: BASE_DEFAULT_LABEL_TEMPLATE.width,
    labelHeightLegacy: BASE_DEFAULT_LABEL_TEMPLATE.height,
    labelDPILegacy: BASE_DEFAULT_LABEL_TEMPLATE.dpi,
    
    // API Reporting Settings
    apiReportingEnabled: false,
    apiReportingUrl: 'https://api.example.com/weighing-data',
    apiReportingEndpoint: '/api/weighing-data',
    apiReportingMethod: 'POST',
    apiReportingHeaders: JSON.stringify({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN_HERE'
    }, null, 2)
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [isAutoConfiguring, setIsAutoConfiguring] = useState(false)
  const [serialAvailable, setSerialAvailable] = useState(true)
  const [serialPortActive, setSerialPortActive] = useState(false)
  const [availablePorts, setAvailablePorts] = useState([]) // Dynamic port list

  useEffect(() => {
    // Load scale config from server
    fetch(`${API_BASE_URL}/scale/config`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          setSerialAvailable(data.serialAvailable !== false)
          setSerialPortActive(!!data.portActive)
          setSettings(prev => ({
            ...prev,
            scalePort: data.data.port || prev.scalePort,
            scaleModel: data.data.model || prev.scaleModel,
            scaleBaudRate: data.data.baudRate || prev.scaleBaudRate,
            scaleDataBits: data.data.dataBits || prev.scaleDataBits,
            scaleParity: data.data.parity || prev.scaleParity,
            scaleStopBits: data.data.stopBits
          }))
        } else {
          setSerialAvailable(data.serialAvailable !== false)
          setSerialPortActive(false)
        }
      })
      .catch(e => {
        console.error('Failed to load scale config:', e)
        setSerialAvailable(false)
        setSerialPortActive(false)
      })
    
    // Load available ports list
    fetch(`${API_BASE_URL}/scale/ports`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          setAvailablePorts(data.data)
        }
      })
      .catch(e => {
        console.error('Failed to load ports:', e)
        // Fallback to common ports if API fails
        setAvailablePorts([
          { path: 'COM1' },
          { path: 'COM2' },
          { path: 'COM3' },
          { path: 'COM4' },
          { path: 'COM5' },
          { path: 'COM6' },
          { path: 'COM7' },
          { path: 'COM8' }
        ])
      })
    
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

        templates = templates.map(template => mergeTemplateWithDefaults(template))

        const activeTemplateId = templates.some(t => t.id === config.activeLabelTemplateId)
          ? config.activeLabelTemplateId
          : templates[0].id

        const activeTemplate = templates.find(t => t.id === activeTemplateId) || templates[0]

        setSettings(prev => ({
          ...prev,
          printMethod: config.printMethod || prev.printMethod,
          printerFormat: config.printerFormat || prev.printerFormat || 'ZPL',
          printerPort: config.printerPort || prev.printerPort,
          printerIP: config.printerIP || prev.printerIP,
          networkPort: config.networkPort || prev.networkPort,
          comPort: config.comPort || prev.comPort,
          baudRate: config.baudRate || prev.baudRate,
          labelTemplates: templates,
          activeLabelTemplateId: activeTemplateId,
          labelWidth: activeTemplate.width,
          labelHeight: activeTemplate.height,
          labelDPI: activeTemplate.dpi,
          labelWidthLegacy: activeTemplate.width,
          labelHeightLegacy: activeTemplate.height,
          labelDPILegacy: activeTemplate.dpi
        }))
      } catch (e) {
        console.error('Failed to load printer config:', e)
      }
    }

    loadPrinterConfig()

    const handlePrinterConfigChange = (e) => {
      if (e.key === 'printerConfig') {
        loadPrinterConfig()
      }
    }
    window.addEventListener('storage', handlePrinterConfigChange)

    const handlePrinterConfigUpdated = () => {
      loadPrinterConfig()
    }
    window.addEventListener('printerConfigUpdated', handlePrinterConfigUpdated)
    
    // Load autosave config from localStorage
    const loadAutoSaveConfig = () => {
      try {
        const savedAutoSaveConfig = localStorage.getItem('autoSaveConfig')
        if (savedAutoSaveConfig) {
          const config = JSON.parse(savedAutoSaveConfig)
          setSettings(prev => ({
            ...prev,
            autoSaveEnabled: config.autoSaveEnabled !== undefined ? config.autoSaveEnabled : prev.autoSaveEnabled,
            autoSaveCounterTime: config.autoSaveCounterTime !== undefined ? config.autoSaveCounterTime : prev.autoSaveCounterTime,
            autoSaveThreshold: config.autoSaveThreshold !== undefined ? config.autoSaveThreshold : prev.autoSaveThreshold,
            autoSaveOnlyInRange: config.autoSaveOnlyInRange !== undefined ? config.autoSaveOnlyInRange : prev.autoSaveOnlyInRange
          }))
        }
      } catch (e) {
        console.error('Failed to load autosave config from localStorage:', e)
      }
    }
    loadAutoSaveConfig()
    
    // Listen for autosave config updates
    const handleAutoSaveConfigUpdated = () => {
      loadAutoSaveConfig()
    }
    window.addEventListener('autoSaveConfigUpdated', handleAutoSaveConfigUpdated)
    
    // Also load from server
    fetch(`${API_BASE_URL}/print/config`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.config) {
          setSettings(prev => ({
            ...prev,
            printerPort: data.config.port || prev.printerPort
          }))
        }
      })
      .catch(e => console.error('Failed to load printer config from server:', e))
    
    // Load API reporting config from localStorage
    const loadAPIReportingConfig = () => {
      try {
        const savedAPIReportingConfig = localStorage.getItem('apiReportingConfig')
        if (savedAPIReportingConfig) {
          const config = JSON.parse(savedAPIReportingConfig)
          setSettings(prev => ({
            ...prev,
            apiReportingEnabled: config.apiReportingEnabled !== undefined ? config.apiReportingEnabled : prev.apiReportingEnabled,
            apiReportingUrl: config.apiReportingUrl || prev.apiReportingUrl,
            apiReportingEndpoint: config.apiReportingEndpoint || prev.apiReportingEndpoint,
            apiReportingMethod: config.apiReportingMethod || prev.apiReportingMethod,
            apiReportingHeaders: config.apiReportingHeaders || prev.apiReportingHeaders
          }))
        }
      } catch (e) {
        console.error('Failed to load API reporting config from localStorage:', e)
      }
    }
    loadAPIReportingConfig()
    
    // Listen for API reporting config updates
    const handleAPIReportingConfigUpdated = () => {
      loadAPIReportingConfig()
    }
    window.addEventListener('apiReportingConfigUpdated', handleAPIReportingConfigUpdated)

    return () => {
      window.removeEventListener('storage', handlePrinterConfigChange)
      window.removeEventListener('printerConfigUpdated', handlePrinterConfigUpdated)
      window.removeEventListener('autoSaveConfigUpdated', handleAutoSaveConfigUpdated)
      window.removeEventListener('apiReportingConfigUpdated', handleAPIReportingConfigUpdated)
    }
  }, [])

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const getActiveLabelTemplate = () => {
    const templates = settings.labelTemplates || []
    const active = templates.find(t => t.id === settings.activeLabelTemplateId)
    if (active) {
      return mergeTemplateWithDefaults(active)
    }
    if (templates.length > 0) {
      return mergeTemplateWithDefaults(templates[0])
    }
    return cloneDefaultLabelTemplate()
  }

  const updateActiveTemplate = (updater) => {
    setSettings(prev => {
      let templates = prev.labelTemplates || []
      if (templates.length === 0) {
        templates = [cloneDefaultLabelTemplate()]
      }
      const activeId = prev.activeLabelTemplateId || templates[0].id
      const updatedTemplates = templates.map(template => {
        if (template.id !== activeId) {
          return template
        }
        const updatedTemplate = typeof updater === 'function' ? updater(template) : { ...template, ...updater }
        return mergeTemplateWithDefaults({
          ...updatedTemplate,
          id: activeId
        })
      })
      const activeTemplate = updatedTemplates.find(t => t.id === activeId) || updatedTemplates[0]
      return {
        ...prev,
        labelTemplates: updatedTemplates,
        activeLabelTemplateId: activeTemplate.id,
        labelWidth: activeTemplate.width,
        labelHeight: activeTemplate.height,
        labelDPI: activeTemplate.dpi,
        labelWidthLegacy: activeTemplate.width,
        labelHeightLegacy: activeTemplate.height,
        labelDPILegacy: activeTemplate.dpi
      }
    })
  }

  const updateActiveTemplateLayout = (field, value) => {
    updateActiveTemplate(template => ({
      ...template,
      layout: {
        ...template.layout,
        [field]: value
      }
    }))
  }

  const handleTemplateChange = (templateId) => {
    setSettings(prev => {
      const templates = (prev.labelTemplates || []).map(mergeTemplateWithDefaults)
      const activeTemplate = templates.find(t => t.id === templateId) || templates[0] || cloneDefaultLabelTemplate()
      return {
        ...prev,
        labelTemplates: templates,
        activeLabelTemplateId: activeTemplate.id,
        labelWidth: activeTemplate.width,
        labelHeight: activeTemplate.height,
        labelDPI: activeTemplate.dpi,
        labelWidthLegacy: activeTemplate.width,
        labelHeightLegacy: activeTemplate.height,
        labelDPILegacy: activeTemplate.dpi
      }
    })
  }

  const handleAddTemplate = () => {
    const newTemplate = mergeTemplateWithDefaults(createDefaultLabelTemplate({
      name: `Template Baru ${(settings.labelTemplates?.length || 0) + 1}`
    }))
    setSettings(prev => ({
      ...prev,
      labelTemplates: [...(prev.labelTemplates || []), newTemplate],
      activeLabelTemplateId: newTemplate.id,
      labelWidth: newTemplate.width,
      labelHeight: newTemplate.height,
      labelDPI: newTemplate.dpi,
      labelWidthLegacy: newTemplate.width,
      labelHeightLegacy: newTemplate.height,
      labelDPILegacy: newTemplate.dpi
    }))
  }

  const handleDuplicateTemplate = () => {
    const activeTemplate = getActiveLabelTemplate()
    const duplicatedTemplate = cloneTemplate(activeTemplate, {
      name: `${activeTemplate.name} (Copy)`
    })
    setSettings(prev => ({
      ...prev,
      labelTemplates: [...(prev.labelTemplates || []), duplicatedTemplate],
      activeLabelTemplateId: duplicatedTemplate.id,
      labelWidth: duplicatedTemplate.width,
      labelHeight: duplicatedTemplate.height,
      labelDPI: duplicatedTemplate.dpi,
      labelWidthLegacy: duplicatedTemplate.width,
      labelHeightLegacy: duplicatedTemplate.height,
      labelDPILegacy: duplicatedTemplate.dpi
    }))
  }

  const handleDeleteTemplate = (templateId) => {
    const templates = settings.labelTemplates || []
    if (templates.length <= 1) {
      alert.warning('Minimal harus ada satu template label.')
      return
    }

    setSettings(prev => {
      const filteredTemplates = (prev.labelTemplates || []).filter(template => template.id !== templateId)
      const normalizedTemplates = filteredTemplates.length > 0
        ? filteredTemplates.map(mergeTemplateWithDefaults)
        : [cloneDefaultLabelTemplate()]
      const activeTemplateId = normalizedTemplates.some(t => t.id === prev.activeLabelTemplateId)
        ? prev.activeLabelTemplateId
        : normalizedTemplates[0].id
      const activeTemplate = normalizedTemplates.find(t => t.id === activeTemplateId) || normalizedTemplates[0]

      return {
        ...prev,
        labelTemplates: normalizedTemplates,
        activeLabelTemplateId,
        labelWidth: activeTemplate.width,
        labelHeight: activeTemplate.height,
        labelDPI: activeTemplate.dpi,
        labelWidthLegacy: activeTemplate.width,
        labelHeightLegacy: activeTemplate.height,
        labelDPILegacy: activeTemplate.dpi
      }
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    
    // Save printer config to localStorage
    if (activeTab === 'printer' || true) { // Always save printer config
      const normalizedTemplates = (settings.labelTemplates || []).map(mergeTemplateWithDefaults)
      const activeTemplate = normalizedTemplates.find(t => t.id === settings.activeLabelTemplateId) || normalizedTemplates[0] || cloneDefaultLabelTemplate()
      const printerConfig = {
        printMethod: settings.printMethod,
        printerFormat: settings.printerFormat || 'ZPL',
        printerPort: settings.printerPort,
        printerIP: settings.printerIP,
        networkPort: settings.networkPort,
        comPort: settings.comPort,
        baudRate: settings.baudRate,
        labelTemplates: normalizedTemplates,
        activeLabelTemplateId: activeTemplate.id,
        labelWidth: activeTemplate.width,
        labelHeight: activeTemplate.height,
        labelDPI: activeTemplate.dpi
      }
      localStorage.setItem('printerConfig', JSON.stringify(printerConfig))
      // Dispatch custom event to notify App.jsx
      window.dispatchEvent(new Event('printerConfigUpdated'))
    }
    
    // Save auto save config to localStorage
    if (activeTab === 'general' || true) { // Always save auto save config
      const autoSaveConfig = {
        autoSaveEnabled: settings.autoSaveEnabled,
        autoSaveCounterTime: settings.autoSaveCounterTime,
        autoSaveThreshold: settings.autoSaveThreshold,
        autoSaveOnlyInRange: settings.autoSaveOnlyInRange
      }
      localStorage.setItem('autoSaveConfig', JSON.stringify(autoSaveConfig))
      // Dispatch custom event to notify App.jsx
      window.dispatchEvent(new Event('autoSaveConfigUpdated'))
    }
    
    // Save API reporting config to localStorage
    if (activeTab === 'api-reporting' || true) { // Always save API reporting config
      const apiReportingConfig = {
        apiReportingEnabled: settings.apiReportingEnabled,
        apiReportingUrl: settings.apiReportingUrl,
        apiReportingEndpoint: settings.apiReportingEndpoint,
        apiReportingMethod: settings.apiReportingMethod,
        apiReportingHeaders: settings.apiReportingHeaders
      }
      localStorage.setItem('apiReportingConfig', JSON.stringify(apiReportingConfig))
      // Dispatch custom event to notify other components
      window.dispatchEvent(new Event('apiReportingConfigUpdated'))
    }
    setSaveMessage('')
    
    // Simulate save delay
    try {
      // Save scale config if on scale tab
      if (activeTab === 'scale') {
        await fetch(`${API_BASE_URL}/scale/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enabled: true,
            model: settings.scaleModel,
            port: settings.scalePort,
            baudRate: settings.scaleBaudRate,
            dataBits: settings.scaleDataBits,
            stopBits: settings.scaleStopBits,
            parity: settings.scaleParity
          })
        })
      }
      setSaveMessage('Pengaturan berhasil disimpan!')
    } catch (e) {
      setSaveMessage('Gagal menyimpan pengaturan')
      console.error('Save error:', e)
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(''), 3000)
    }
  }

  const handleReset = () => {
    if (window.confirm('Apakah Anda yakin ingin mengembalikan pengaturan ke default?')) {
      // Reset to default values
      setSettings({
        companyName: 'FoomLabGlobal',
        appVersion: 'v1.7.0',
        language: 'id',
        timezone: 'Asia/Jakarta',
        scalePort: 'COM1',
        scaleBaudRate: 9600,
        scaleDataBits: 8,
        scaleParity: 'none',
        scaleStopBits: 2,
        scaleTimeout: 3000,
        scaleModel: 'vibra',
        weightUnit: 'kg',
        autoTare: true,
        weightTolerance: 0.1,
        dbHost: 'localhost',
        dbPort: 5432,
        dbName: 'FLB_MOWS',
        dbUser: 'postgres',
        backupInterval: 24,
        sessionTimeout: 30,
        requirePasswordChange: false,
        maxLoginAttempts: 3,
        enableNotifications: true,
        emailNotifications: false,
        soundNotifications: true,
        lowWeightAlert: true,
        errorAlert: true
      })
      setSaveMessage('Pengaturan telah direset ke default!')
      setTimeout(() => setSaveMessage(''), 3000)
    }
  }

  const tabs = [
    { id: 'general', label: 'Umum', icon: SettingsIcon },
    { id: 'scale', label: 'Timbangan', icon: Scale },
    { id: 'printer', label: 'Printer', icon: Printer },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'server-database', label: 'Server Database', icon: Server },
    { id: 'user', label: 'Pengguna', icon: User },
    { id: 'notifications', label: 'Notifikasi', icon: Bell },
    { id: 'api-reporting', label: 'API Reporting', icon: Server }
  ]

  const renderGeneralSettings = () => (
    <div className="settings-section">
      <h3>Pengaturan Umum</h3>
      <div className="settings-grid">
        <div className="form-group">
          <label className="form-label">Nama Perusahaan</label>
          <input
            type="text"
            className="form-input"
            value={settings.companyName}
            onChange={(e) => handleSettingChange('general', 'companyName', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Versi Aplikasi</label>
          <input
            type="text"
            className="form-input readonly"
            value={settings.appVersion}
            readOnly
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Bahasa</label>
          <select
            className="form-input"
            value={settings.language}
            onChange={(e) => handleSettingChange('general', 'language', e.target.value)}
          >
            <option value="id">Bahasa Indonesia</option>
            <option value="en">English</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">Zona Waktu</label>
          <select
            className="form-input"
            value={settings.timezone}
            onChange={(e) => handleSettingChange('general', 'timezone', e.target.value)}
          >
            <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
            <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
            <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
          </select>
        </div>
      </div>
      
      {/* Auto Save Settings */}
      <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '2px solid #e5e7eb' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
          Pengaturan Auto Save Penimbangan
        </h3>
        <div className="settings-grid">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={settings.autoSaveEnabled}
                onChange={(e) => handleSettingChange('general', 'autoSaveEnabled', e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span>Aktifkan Auto Save</span>
            </label>
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', marginLeft: '26px' }}>
              Otomatis menyimpan hasil penimbangan ketika berat masuk ke range target
            </p>
          </div>
          
          {settings.autoSaveEnabled && (
            <>
              <div className="form-group">
                <label className="form-label">Counter Time (detik)</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="30"
                  value={settings.autoSaveCounterTime}
                  onChange={(e) => handleSettingChange('general', 'autoSaveCounterTime', parseInt(e.target.value) || 3)}
                />
                <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                  Waktu tunggu sebelum auto save (1-30 detik)
                </p>
              </div>
              
              <div className="form-group">
                <label className="form-label">Threshold (gram)</label>
                <input
                  type="number"
                  className="form-input"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={settings.autoSaveThreshold}
                  onChange={(e) => handleSettingChange('general', 'autoSaveThreshold', parseFloat(e.target.value) || 0.5)}
                />
                <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                  Perubahan berat minimum untuk trigger auto save (0.1-10 gram)
                </p>
              </div>
              
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={settings.autoSaveOnlyInRange}
                    onChange={(e) => handleSettingChange('general', 'autoSaveOnlyInRange', e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Auto Save Hanya Saat Dalam Range Target</span>
                </label>
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', marginLeft: '26px' }}>
                  Auto save hanya akan aktif ketika berat berada dalam range toleransi target
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )

  const renderScaleSettings = () => (
    <div className="settings-section">
      <h3>Pengaturan Timbangan</h3>
      <div className="settings-grid">
        <div className="form-group">
          <label className="form-label">Model Timbangan</label>
          <select
            className="form-input"
            value={settings.scaleModel}
            onChange={(e) => handleSettingChange('scale', 'scaleModel', e.target.value)}
          >
            <option value="vibra">Vibra Scale (Default)</option>
            <option value="and-ek15kl">AND EK-15KL</option>
            <option value="generic">Generic RS232</option>
            <option value="ohaus_ranger">OHAUS Ranger</option>
            <option value="mettler_toledo">Mettler Toledo</option>
            <option value="and_fx">A&D FX/FG</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Port Serial</label>
          <select
            className="form-input"
            value={settings.scalePort}
            onChange={(e) => handleSettingChange('scale', 'scalePort', e.target.value)}
          >
            {availablePorts.length > 0 ? (
              availablePorts.map(port => (
                <option key={port.path} value={port.path}>
                  {port.path}{port.manufacturer ? ` (${port.manufacturer})` : ''}
                </option>
              ))
            ) : (
              // Fallback to common ports if list not loaded
              <>
                <option value="COM1">COM1</option>
                <option value="COM2">COM2</option>
                <option value="COM3">COM3</option>
                <option value="COM4">COM4</option>
                <option value="COM5">COM5</option>
                <option value="COM6">COM6</option>
                <option value="COM7">COM7</option>
                <option value="COM8">COM8</option>
              </>
            )}
          </select>
          <small style={{ display: 'block', marginTop: '5px', color: '#666', fontSize: '12px' }}>
            {availablePorts.length > 0 
              ? `${availablePorts.length} port(s) terdeteksi` 
              : 'Menggunakan daftar port default'}
          </small>
        </div>
        
        <div className="form-group">
          <label className="form-label">Baud Rate</label>
          <select
            className="form-input"
            value={settings.scaleBaudRate}
            onChange={(e) => handleSettingChange('scale', 'scaleBaudRate', parseInt(e.target.value))}
          >
            <option value={1200}>1200</option>
            <option value={2400}>2400</option>
            <option value={4800}>4800</option>
            <option value={9600}>9600</option>
            <option value={19200}>19200</option>
            <option value={38400}>38400</option>
            <option value={57600}>57600</option>
            <option value={115200}>115200</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">Data Bits</label>
          <select
            className="form-input"
            value={settings.scaleDataBits}
            onChange={(e) => handleSettingChange('scale', 'scaleDataBits', parseInt(e.target.value))}
          >
            <option value={7}>7</option>
            <option value={8}>8</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">Parity</label>
          <select
            className="form-input"
            value={settings.scaleParity}
            onChange={(e) => handleSettingChange('scale', 'scaleParity', e.target.value)}
          >
            <option value="none">None</option>
            <option value="even">Even</option>
            <option value="odd">Odd</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">Stop Bits</label>
          <select
            className="form-input"
            value={settings.scaleStopBits}
            onChange={(e) => handleSettingChange('scale', 'scaleStopBits', parseInt(e.target.value))}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">Timeout (ms)</label>
          <input
            type="number"
            className="form-input"
            value={settings.scaleTimeout}
            onChange={(e) => handleSettingChange('scale', 'scaleTimeout', parseInt(e.target.value))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Unit Berat</label>
          <select
            className="form-input"
            value={settings.weightUnit}
            onChange={(e) => handleSettingChange('scale', 'weightUnit', e.target.value)}
          >
            <option value="g">Gram (g)</option>
            <option value="kg">Kilogram (kg)</option>
            <option value="mg">Miligram (mg)</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">Toleransi Berat</label>
          <input
            type="number"
            step="0.1"
            className="form-input"
            value={settings.weightTolerance}
            onChange={(e) => handleSettingChange('scale', 'weightTolerance', parseFloat(e.target.value))}
          />
        </div>
        
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.autoTare}
              onChange={(e) => handleSettingChange('scale', 'autoTare', e.target.checked)}
            />
            <span className="checkmark"></span>
            Auto Tare
          </label>
        </div>
      </div>

      <div style={{ marginTop: '24px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
        <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>🔧 Tool Konfigurasi Timbangan</h4>
        {!serialAvailable && (
          <div style={{
            background: '#fff8e1',
            border: '1px solid #ffecb3',
            color: '#8d6e63',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '12px'
          }}>
            Modul <code>serialport</code> belum tersedia di server sehingga fitur auto configure tidak dapat dijalankan. Silakan instal dependensi <code>serialport</code> atau konfigurasikan port secara manual melalui opsi di atas.
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={async () => {
              if (!serialAvailable) {
                alert.error('Auto configure tidak tersedia karena modul serialport belum terpasang di server.', 'Auto Configure Nonaktif');
                return;
              }

              setIsAutoConfiguring(true);
              try {
                const resp = await fetch(`${API_BASE_URL}/scale/auto-configure`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ model: settings.scaleModel })
                });

                const data = await resp.json();
                if (data.success) {
                  const config = data.detectedConfig || {};
                  setSettings(prev => ({
                    ...prev,
                    scalePort: data.detectedPort || prev.scalePort,
                    scaleBaudRate: config.baudRate || prev.scaleBaudRate,
                    scaleDataBits: config.dataBits || prev.scaleDataBits,
                    scaleParity: config.parity || prev.scaleParity,
                    scaleStopBits: config.stopBits || prev.scaleStopBits
                  }));

                  const message =
                    `✅ Auto Configure Berhasil!\n\n` +
                    `Port: ${data.detectedPort || '-'}\n` +
                    `Baud Rate: ${config.baudRate || '-'}\n` +
                    `Data Bits: ${config.dataBits || '-'}\n` +
                    `Stop Bits: ${config.stopBits || '-'}\n` +
                    `Parity: ${config.parity || '-'}\n\n` +
                    `Pengaturan telah diperbarui. Klik "Simpan" untuk menyimpan konfigurasi.`;

                  alert.success(message, 'Auto Configure Berhasil');
                  setSaveMessage('Konfigurasi timbangan berhasil di-detect! Klik Simpan untuk menyimpan.');
                } else {
                  const errorMsg = data.details || data.error || 'Gagal auto configure';
                  const testInfo = data.testResults ? 
                    `\n\nPort yang diuji:\n${data.testResults.map(r => `- ${r.port} (${r.success ? 'OK' : 'Gagal'})`).join('\n')}` : '';
                  alert.error(`Auto Configure Gagal\n\n${errorMsg}${testInfo}`, 'Auto Configure Gagal');
                }
              } catch (e) {
                alert.error(`Gagal auto configure: ${e.message}`, 'Error');
              } finally {
                setIsAutoConfiguring(false);
              }
            }}
            style={{ minWidth: '200px' }}
            disabled={isAutoConfiguring || !serialAvailable}
          >
            {isAutoConfiguring ? '⏳ Memindai...' : '🔍 Auto Configure Timbangan'}
          </button>

          <button className="btn btn-secondary" onClick={async () => {
            try {
              const resp = await fetch(`${API_BASE_URL}/scale/ports`);
              const data = await resp.json();
              if (data.success) {
                const ports = data.data || [];
                if (ports.length === 0) {
                  alert.info('Tidak ada port serial yang terdeteksi', 'Port Serial');
                } else {
                  const portList = ports.map(p => `${p.path}${p.manufacturer ? ` (${p.manufacturer})` : ''}`).join('\n');
                  alert.info(`Port Serial Tersedia:\n${portList}`, 'Port Serial');
                }
              }
            } catch (e) {
              alert.error('Gagal mengambil daftar port', 'Error')
            }
          }}>📋 Daftar Port</button>

          <button className="btn btn-secondary" onClick={async () => {
            try {
              const resp = await fetch(`${API_BASE_URL}/scale/read`);
              const data = await resp.json();
              if (data.success) {
                alert.info(`Berat: ${data.weight.toFixed(4)} ${data.unit}\nOriginal: ${data.weightOriginal} ${data.originalUnit}\nStable: ${data.stable ? 'Ya' : 'Tidak'}\nRaw: ${data.raw?.slice(0,120)}`, 'Test Baca Timbangan')
              } else {
                alert.error(`Gagal baca timbangan: ${data.error || 'Unknown'}`, 'Error')
              }
            } catch (e) {
              alert.error('Gagal tes baca timbangan', 'Error')
            }
          }}>⚖️ Tes Baca Timbangan</button>
        </div>

        {serialPortActive && (
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#2c7b2d' }}>
            Port saat ini aktif dan siap digunakan.
          </div>
        )}
      </div>
    </div>
  )

  const renderDatabaseSettings = () => (
    <div className="settings-section">
      <h3>Pengaturan Database</h3>
      <div className="settings-grid">
        <div className="form-group">
          <label className="form-label">Host Database</label>
          <input
            type="text"
            className="form-input"
            value={settings.dbHost}
            onChange={(e) => handleSettingChange('database', 'dbHost', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Port Database</label>
          <input
            type="number"
            className="form-input"
            value={settings.dbPort}
            onChange={(e) => handleSettingChange('database', 'dbPort', parseInt(e.target.value))}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Nama Database</label>
          <input
            type="text"
            className="form-input"
            value={settings.dbName}
            onChange={(e) => handleSettingChange('database', 'dbName', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Username Database</label>
          <input
            type="text"
            className="form-input"
            value={settings.dbUser}
            onChange={(e) => handleSettingChange('database', 'dbUser', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Interval Backup (jam)</label>
          <input
            type="number"
            className="form-input"
            value={settings.backupInterval}
            onChange={(e) => handleSettingChange('database', 'backupInterval', parseInt(e.target.value))}
          />
        </div>
      </div>
    </div>
  )

  const renderUserSettings = () => (
    <div className="settings-section">
      <h3>Pengaturan Pengguna</h3>
      <div className="settings-grid">
        <div className="form-group">
          <label className="form-label">Session Timeout (menit)</label>
          <input
            type="number"
            className="form-input"
            value={settings.sessionTimeout}
            onChange={(e) => handleSettingChange('user', 'sessionTimeout', parseInt(e.target.value))}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Max Login Attempts</label>
          <input
            type="number"
            className="form-input"
            value={settings.maxLoginAttempts}
            onChange={(e) => handleSettingChange('user', 'maxLoginAttempts', parseInt(e.target.value))}
          />
        </div>
        
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.requirePasswordChange}
              onChange={(e) => handleSettingChange('user', 'requirePasswordChange', e.target.checked)}
            />
            <span className="checkmark"></span>
            Wajib Ganti Password
          </label>
        </div>
      </div>
    </div>
  )

  const renderNotificationSettings = () => (
    <div className="settings-section">
      <h3>Pengaturan Notifikasi</h3>
      <div className="settings-grid">
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.enableNotifications}
              onChange={(e) => handleSettingChange('notifications', 'enableNotifications', e.target.checked)}
            />
            <span className="checkmark"></span>
            Aktifkan Notifikasi
          </label>
        </div>
        
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) => handleSettingChange('notifications', 'emailNotifications', e.target.checked)}
            />
            <span className="checkmark"></span>
            Notifikasi Email
          </label>
        </div>
        
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.soundNotifications}
              onChange={(e) => handleSettingChange('notifications', 'soundNotifications', e.target.checked)}
            />
            <span className="checkmark"></span>
            Notifikasi Suara
          </label>
        </div>
        
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.lowWeightAlert}
              onChange={(e) => handleSettingChange('notifications', 'lowWeightAlert', e.target.checked)}
            />
            <span className="checkmark"></span>
            Alert Berat Rendah
          </label>
        </div>
        
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.errorAlert}
              onChange={(e) => handleSettingChange('notifications', 'errorAlert', e.target.checked)}
            />
            <span className="checkmark"></span>
            Alert Error
          </label>
        </div>
      </div>
    </div>
  )

  const renderAPIReportingSettings = () => (
    <div className="settings-section">
      <h3>Pengaturan API Reporting</h3>
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '1px solid #90caf9' }}>
        <h4 style={{ marginTop: 0, marginBottom: '10px', fontSize: '14px', fontWeight: '600' }}>
          Konfigurasi API untuk Mengirim Data Hasil Penimbangan
        </h4>
        <p style={{ margin: 0, fontSize: '13px', color: '#555' }}>
          Konfigurasi ini digunakan untuk mengirim data hasil penimbangan ke website eksternal menggunakan POST API. Format data kompatibel dengan Postman untuk testing.
        </p>
      </div>
      
      <div className="settings-grid">
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={settings.apiReportingEnabled}
              onChange={(e) => handleSettingChange('api-reporting', 'apiReportingEnabled', e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span>Aktifkan API Reporting</span>
          </label>
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', marginLeft: '26px' }}>
            Aktifkan untuk mengirim data hasil penimbangan ke API eksternal
          </p>
        </div>
        
        {settings.apiReportingEnabled && (
          <>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">URL API Base</label>
              <input
                type="text"
                className="form-input"
                value={settings.apiReportingUrl}
                onChange={(e) => handleSettingChange('api-reporting', 'apiReportingUrl', e.target.value)}
                placeholder="https://api.example.com"
              />
              <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                Base URL dari API website (tanpa endpoint, contoh: https://api.example.com)
              </p>
            </div>
            
            <div className="form-group">
              <label className="form-label">Endpoint</label>
              <input
                type="text"
                className="form-input"
                value={settings.apiReportingEndpoint}
                onChange={(e) => handleSettingChange('api-reporting', 'apiReportingEndpoint', e.target.value)}
                placeholder="/api/weighing-data"
              />
              <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                Path endpoint API (contoh: /api/weighing-data)
              </p>
            </div>
            
            <div className="form-group">
              <label className="form-label">Method HTTP</label>
              <select
                className="form-input"
                value={settings.apiReportingMethod}
                onChange={(e) => handleSettingChange('api-reporting', 'apiReportingMethod', e.target.value)}
              >
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
              </select>
              <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                Method HTTP untuk mengirim data (disarankan POST)
              </p>
            </div>
            
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Headers (JSON)</label>
              <textarea
                className="form-input"
                value={settings.apiReportingHeaders}
                onChange={(e) => handleSettingChange('api-reporting', 'apiReportingHeaders', e.target.value)}
                placeholder='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_TOKEN"}'
                style={{ minHeight: '120px', fontFamily: 'monospace', fontSize: '12px' }}
              />
              <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                Header HTTP dalam format JSON (contoh: Authorization, API Key, dll)
              </p>
            </div>
            
            <div style={{ gridColumn: '1 / -1', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107', marginTop: '10px' }}>
              <h4 style={{ marginTop: 0, marginBottom: '10px', fontSize: '14px', fontWeight: '600', color: '#856404' }}>
                📋 Format Data yang Dikirim
              </h4>
              <p style={{ fontSize: '12px', color: '#856404', marginBottom: '8px' }}>
                Data yang dikirim akan berformat JSON dengan struktur berikut:
              </p>
              <pre style={{ 
                fontSize: '11px', 
                backgroundColor: '#fff', 
                padding: '10px', 
                borderRadius: '4px', 
                overflow: 'auto',
                border: '1px solid #ddd',
                maxHeight: '300px'
              }}>
{`{
  "work_order": "MO-2024-001",
  "sku": "SKU-001",
  "formulation_name": "Formula Name",
  "production_date": "2024-01-01T00:00:00Z",
  "planned_quantity": 1000.0,
  "status": "completed",
  "operator_name": "Operator Name",
  "end_time": "2024-01-01T12:00:00Z",
  "ingredients": [
    {
      "ingredient_id": 1,
      "ingredient_code": "ING-001",
      "ingredient_name": "Ingredient Name",
      "target_mass": 100.0,
      "current_accumulated_mass": 100.5,
      "current_status": "completed",
      "tolerance_min": 95.0,
      "tolerance_max": 105.0,
      "sessions": [...]
    }
  ]
}`}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralSettings()
      case 'scale':
        return renderScaleSettings()
      case 'database':
        return renderDatabaseSettings()
      case 'server-database':
        return <ServerDatabaseConfig />
      case 'user':
        return renderUserSettings()
      case 'notifications':
        return renderNotificationSettings()
      case 'printer':
        return renderPrinterSettings()
      case 'api-reporting':
        return renderAPIReportingSettings()
      default:
        return renderGeneralSettings()
    }
  }

  const renderPrinterSettings = () => {
    const templates = settings.labelTemplates || []
    const activeTemplate = getActiveLabelTemplate()
    const layout = activeTemplate?.layout || BASE_DEFAULT_LABEL_TEMPLATE.layout
    const dpi = activeTemplate?.dpi || 203
    const widthMm = activeTemplate?.width || 0
    const heightMm = activeTemplate?.height || 0
    const widthDots = Math.round(widthMm * (dpi / 25.4))
    const heightDots = Math.round(heightMm * (dpi / 25.4))

    const safeNumber = (value, fallback) => (Number.isFinite(value) ? value : fallback)

    const onWidthChange = (event) => {
      const parsed = parseFloat(event.target.value)
      updateActiveTemplate(template => {
        const fallbackWidth = template.width || BASE_DEFAULT_LABEL_TEMPLATE.width
        const nextWidth = Math.max(20, safeNumber(parsed, fallbackWidth))
        const currentLineWidth = template.layout?.lineWidthMm ?? layout.lineWidthMm
        const adjustedLineWidth = Math.max(20, Math.min(currentLineWidth, nextWidth - 5))
        return {
          ...template,
          width: Number(nextWidth.toFixed(2)),
          layout: {
            ...template.layout,
            lineWidthMm: Number(adjustedLineWidth.toFixed(2))
          }
        }
      })
    }

    const onHeightChange = (event) => {
      const parsed = parseFloat(event.target.value)
      updateActiveTemplate(template => {
        const fallbackHeight = template.height || BASE_DEFAULT_LABEL_TEMPLATE.height
        const nextHeight = Math.max(20, safeNumber(parsed, fallbackHeight))
        return {
          ...template,
          height: Number(nextHeight.toFixed(2))
        }
      })
    }

    const onLayoutChange = (field, options = {}) => (event) => {
      const parsed = parseFloat(event.target.value)
      let numeric = safeNumber(parsed, layout[field] ?? 0)
      if (Number.isFinite(options.min)) numeric = Math.max(options.min, numeric)
      if (Number.isFinite(options.max)) numeric = Math.min(options.max, numeric)
      numeric = Number(numeric.toFixed(2))
      updateActiveTemplateLayout(field, numeric)
    }

    const onLayoutIntChange = (field, options = {}) => (event) => {
      const parsed = parseInt(event.target.value, 10)
      let numeric = safeNumber(parsed, layout[field] ?? 0)
      if (Number.isFinite(options.min)) numeric = Math.max(options.min, numeric)
      if (Number.isFinite(options.max)) numeric = Math.min(options.max, numeric)
      updateActiveTemplateLayout(field, Math.round(numeric))
    }

    const applyPreset = (preset) => {
      const { width, height, dpi: presetDpi } = preset
      updateActiveTemplate(template => {
        const nextWidth = width ?? template.width
        const nextHeight = height ?? template.height
        const newLineWidth = Math.max(20, Math.min(template.layout?.lineWidthMm ?? (nextWidth - 10), nextWidth - 5))
        return {
          ...template,
          width: Number(nextWidth.toFixed(2)),
          height: Number(nextHeight.toFixed(2)),
          dpi: presetDpi ?? template.dpi,
          layout: {
            ...template.layout,
            lineWidthMm: Number(newLineWidth.toFixed(2))
          }
        }
      })
    }

    return (
      <div className="settings-section">
        <h3>Pengaturan Printer Thermal Label</h3>
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '1px solid #90caf9' }}>
          <h4 style={{ marginTop: 0, marginBottom: '10px', fontSize: '14px', fontWeight: '600' }}>
            {settings.printerFormat === 'ZPL' ? 'Format ZPL' : 'Format ESC/POS'}
          </h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#555' }}>
            {settings.printerFormat === 'ZPL' 
              ? 'Printer thermal label menggunakan format ZPL (Zebra Programming Language). Label size: 100mm x 72mm, DPI: 203. Mendukung text, barcode Code 128, QR code, dan boxes.'
              : 'Printer thermal menggunakan format ESC/POS (Epson Standard Code for Point of Sale). Format ini kompatibel dengan printer thermal receipt dan label printer seperti DLP 50, Epson, dan printer ESC/POS lainnya.'}
          </p>
        </div>
        
        <div className="settings-grid">
          <div className="form-group">
            <label className="form-label">Format Print</label>
            <select
              className="form-input"
              value={settings.printerFormat || 'ZPL'}
              onChange={(e) => handleSettingChange('printer', 'printerFormat', e.target.value)}
            >
              <option value="ZPL">ZPL (Zebra Programming Language)</option>
              <option value="ESC-POS">ESC/POS (Epson Standard Code)</option>
            </select>
            <small style={{ display: 'block', marginTop: '5px', color: '#666', fontSize: '12px' }}>
              {settings.printerFormat === 'ZPL' 
                ? 'Format untuk printer thermal label (Zebra, Xprinter, TSC, dll)'
                : 'Format untuk printer thermal receipt/label ESC/POS (DLP 50, Epson, dll)'}
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Metode Koneksi</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <select
                className="form-input"
                value={settings.printMethod}
                onChange={(e) => handleSettingChange('printer', 'printMethod', e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="windows-raw">Windows RAW (via Printer Queue)</option>
                <option value="network-tcp">Network TCP/IP (Port 9100)</option>
                <option value="serial-com">COM Serial (USB/RS232)</option>
              </select>
              <button
                className="btn btn-secondary"
                onClick={async () => {
                  setIsAutoConfiguring(true);
                  try {
                    const resp = await fetch(`${API_BASE_URL}/print/auto-configure`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await resp.json();
                    
                    if (data.success && data.data) {
                      const result = data.data;
                      
                      // Apply recommended configuration
                      if (result.recommended) {
                        const rec = result.recommended;
                        const updatedSettings = {
                          ...settings,
                          printMethod: rec.method,
                          printerPort: rec.printerName || settings.printerPort,
                          printerIP: rec.printerIP || settings.printerIP,
                          networkPort: rec.networkPort || settings.networkPort,
                          comPort: rec.comPort || settings.comPort,
                          baudRate: rec.baudRate || settings.baudRate,
                          labelWidth: rec.labelWidth || settings.labelWidth,
                          labelHeight: rec.labelHeight || settings.labelHeight,
                          labelDPI: rec.labelDPI || settings.labelDPI
                        };
                        
                        setSettings(updatedSettings);
                        
                        // CRITICAL: Auto-save config to localStorage immediately after autoconfigure
                        const normalizedTemplates = (updatedSettings.labelTemplates || []).map(mergeTemplateWithDefaults);
                        const activeTemplate = normalizedTemplates.find(t => t.id === updatedSettings.activeLabelTemplateId) || normalizedTemplates[0] || cloneDefaultLabelTemplate();
                        const printerConfig = {
                          printMethod: updatedSettings.printMethod,
                          printerFormat: updatedSettings.printerFormat || 'ZPL',
                          printerPort: updatedSettings.printerPort,
                          printerIP: updatedSettings.printerIP,
                          networkPort: updatedSettings.networkPort,
                          comPort: updatedSettings.comPort,
                          baudRate: updatedSettings.baudRate,
                          labelTemplates: normalizedTemplates,
                          activeLabelTemplateId: activeTemplate.id,
                          labelWidth: activeTemplate.width,
                          labelHeight: activeTemplate.height,
                          labelDPI: activeTemplate.dpi
                        };
                        localStorage.setItem('printerConfig', JSON.stringify(printerConfig));
                        window.dispatchEvent(new Event('printerConfigUpdated'));
                        
                        // Build summary message
                        let summary = `✅ Auto-configure Berhasil!\n\n`;
                        summary += `Metode yang Direkomendasikan: ${rec.method.toUpperCase()}\n\n`;
                        
                        if (rec.method === 'windows-raw') {
                          summary += `Printer: ${rec.printerName}\n`;
                          // Warn if printer might not support ZPL
                          const printerNameLower = (rec.printerName || '').toLowerCase();
                          if (printerNameLower.includes('epson l') || printerNameLower.includes('epson ecotank') || printerNameLower.includes('inkjet')) {
                            summary += `\n⚠️ PERINGATAN: Printer ini mungkin tidak mendukung ZPL format!\n`;
                            summary += `Pastikan printer adalah thermal label printer (Xprinter, Zebra, dll).\n`;
                          }
                        } else if (rec.method === 'network-tcp') {
                          summary += `IP Address: ${rec.printerIP}\n`;
                          summary += `Port: ${rec.networkPort}\n`;
                        } else if (rec.method === 'serial-com') {
                          summary += `COM Port: ${rec.comPort}\n`;
                          summary += `Baud Rate: ${rec.baudRate}\n`;
                        }
                        
                        summary += `\nUkuran Label:\n`;
                        summary += `- Lebar: ${rec.labelWidth} mm\n`;
                        summary += `- Tinggi: ${rec.labelHeight} mm\n`;
                        summary += `- DPI: ${rec.labelDPI}\n`;
                        
                        if (result.windowsPrinters.length > 0) {
                          summary += `\n📋 Printer Windows Terdeteksi: ${result.windowsPrinters.length}`;
                        }
                        if (result.networkPrinters.length > 0) {
                          summary += `\n🌐 Printer Network Terdeteksi: ${result.networkPrinters.length}`;
                        }
                        if (result.serialPorts.length > 0) {
                          summary += `\n🔌 Port Serial Tersedia: ${result.serialPorts.length}`;
                        }
                        
                        alert.success(summary, 'Auto Configure Printer');
                      } else {
                        let message = 'Auto-configure selesai, tetapi tidak ada printer yang terdeteksi.\n\n';
                        if (result.windowsPrinters.length > 0) {
                          message += `Printer Windows: ${result.windowsPrinters.length}\n`;
                        }
                        if (result.serialPorts.length > 0) {
                          message += `Port Serial: ${result.serialPorts.length}\n`;
                        }
                        if (result.networkPrinters.length > 0) {
                          message += `Printer Network: ${result.networkPrinters.length}\n`;
                        }
                        alert.info(message, 'Auto Configure');
                      }
                    } else {
                      alert.error(data.error || 'Gagal auto-configure printer', 'Error');
                    }
                  } catch (e) {
                    alert.error(`Gagal auto-configure: ${e.message}`, 'Error');
                  } finally {
                    setIsAutoConfiguring(false);
                  }
                }}
                disabled={isAutoConfiguring}
                style={{ whiteSpace: 'nowrap' }}
              >
                {isAutoConfiguring ? '⏳ Memindai...' : '🔍 Auto Configure'}
              </button>
            </div>
            <small style={{ display: 'block', marginTop: '5px', color: '#666', fontSize: '12px' }}>
              {settings.printMethod === 'windows-raw' && `Menggunakan Windows Print API untuk mengirim RAW data ke printer queue (${settings.printerFormat || 'ZPL'})`}
              {settings.printMethod === 'network-tcp' && `Mengirim ${settings.printerFormat || 'ZPL'} langsung ke printer via TCP socket (port 9100)`}
              {settings.printMethod === 'serial-com' && `Mengirim ${settings.printerFormat || 'ZPL'} via serial port (USB/RS232)`}
            </small>
          </div>

          {/* Windows RAW Settings */}
          {settings.printMethod === 'windows-raw' && (
            <div className="form-group">
              <label className="form-label">Nama Printer</label>
              <input
                type="text"
                className="form-input"
                value={settings.printerPort}
                onChange={(e) => handleSettingChange('printer', 'printerPort', e.target.value)}
                placeholder="Xprinter XP-420B"
              />
              <small style={{ display: 'block', marginTop: '5px', color: '#666', fontSize: '12px' }}>
                Nama printer yang terdaftar di Windows (Control Panel → Devices and Printers)
              </small>
              <button 
                className="btn btn-secondary" 
                style={{ marginTop: '10px' }}
                onClick={async () => {
                  try {
                    const resp = await fetch(`${API_BASE_URL}/print/list-printers`)
                    const data = await resp.json()
                    if (data.success && data.printers && data.printers.length > 0) {
                      const printerList = data.printers.map(p => `- ${p.name}`).join('\n')
                      alert.info(`Printer yang Tersedia:\n\n${printerList}`, 'Daftar Printer')
                    } else {
                      alert.info('Tidak ada printer yang terdeteksi', 'Daftar Printer')
                    }
                  } catch (e) {
                    alert.error('Gagal mengambil daftar printer: ' + e.message, 'Error')
                  }
                }}
              >
                📋 Daftar Printer
              </button>
            </div>
          )}

          {/* Network TCP/IP Settings */}
          {settings.printMethod === 'network-tcp' && (
            <>
              <div className="form-group">
                <label className="form-label">IP Address Printer</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.printerIP}
                  onChange={(e) => handleSettingChange('printer', 'printerIP', e.target.value)}
                  placeholder="192.168.1.100"
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666', fontSize: '12px' }}>
                  IP address printer thermal label di network
                </small>
              </div>
              <div className="form-group">
                <label className="form-label">Port TCP/IP</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.networkPort}
                  onChange={(e) => handleSettingChange('printer', 'networkPort', parseInt(e.target.value))}
                  placeholder="9100"
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666', fontSize: '12px' }}>
                  Default: 9100 (ZPL standard port)
                </small>
              </div>
            </>
          )}

          {/* Serial COM Settings */}
          {settings.printMethod === 'serial-com' && (
            <>
              <div className="form-group">
                <label className="form-label">COM Port</label>
                <select
                  className="form-input"
                  value={settings.comPort}
                  onChange={(e) => handleSettingChange('printer', 'comPort', e.target.value)}
                >
                  <option value="COM1">COM1</option>
                  <option value="COM2">COM2</option>
                  <option value="COM3">COM3</option>
                  <option value="COM4">COM4</option>
                  <option value="COM5">COM5</option>
                  <option value="COM6">COM6</option>
                  <option value="COM7">COM7</option>
                  <option value="COM8">COM8</option>
                  <option value="COM9">COM9</option>
                  <option value="COM10">COM10</option>
                </select>
                <button 
                  className="btn btn-secondary" 
                  style={{ marginTop: '10px' }}
                  onClick={async () => {
                    try {
                      const resp = await fetch(`${API_BASE_URL}/scale/ports`);
                      const data = await resp.json();
                      if (data.success) {
                        const ports = data.data || [];
                        if (ports.length === 0) {
                          alert.info('Tidak ada port serial yang terdeteksi', 'Port Serial');
                        } else {
                          const portList = ports.map(p => `${p.path}${p.manufacturer ? ` (${p.manufacturer})` : ''}`).join('\n');
                          alert.info(`Port Serial Tersedia:\n${portList}`, 'Port Serial');
                        }
                      }
                    } catch (e) {
                      alert.error('Gagal mengambil daftar port', 'Error');
                    }
                  }}
                >
                  📋 Daftar Port Serial
                </button>
              </div>
              <div className="form-group">
                <label className="form-label">Baud Rate</label>
                <select
                  className="form-input"
                  value={settings.baudRate}
                  onChange={(e) => handleSettingChange('printer', 'baudRate', parseInt(e.target.value))}
                >
                  <option value={9600}>9600</option>
                  <option value={19200}>19200</option>
                  <option value={38400}>38400</option>
                  <option value={57600}>57600</option>
                  <option value={115200}>115200</option>
                </select>
                <small style={{ display: 'block', marginTop: '5px', color: '#666', fontSize: '12px' }}>
                  Default: 9600 baud
                </small>
              </div>
            </>
          )}
        </div>

        {/* Label Template Configuration */}
        <div style={{ marginTop: '30px', marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '15px', fontSize: '16px', fontWeight: '600', borderBottom: '2px solid #4CAF50', paddingBottom: '8px' }}>
            📏 Template Label Thermal
          </h4>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end', marginBottom: '16px' }}>
            <div style={{ flex: '1 1 260px' }}>
              <label className="form-label">Template Aktif</label>
              <select
                className="form-input"
                value={settings.activeLabelTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
              >
                {templates.map(template => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
              <small style={{ display: 'block', marginTop: '5px', color: '#666', fontSize: '12px' }}>
                Pilih template ukuran label yang ingin digunakan saat mencetak hasil penimbangan
              </small>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={handleAddTemplate}>+ Template Baru</button>
              <button className="btn btn-secondary" onClick={handleDuplicateTemplate} disabled={templates.length === 0}>📄 Duplikasi</button>
              <button className="btn btn-danger" onClick={() => handleDeleteTemplate(settings.activeLabelTemplateId)} disabled={templates.length <= 1}>🗑️ Hapus</button>
            </div>
          </div>

          {activeTemplate ? (
            <>
              <div className="form-group">
                <label className="form-label">Nama Template</label>
                <input
                  type="text"
                  className="form-input"
                  value={activeTemplate.name}
                  onChange={(e) => updateActiveTemplate({ name: e.target.value })}
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666', fontSize: '12px' }}>
                  Contoh: "72×100 mm Portrait" atau "80×60 mm Landscape"
                </small>
              </div>

              <div className="settings-grid">
                <div className="form-group">
                  <label className="form-label">Lebar Label (mm)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={widthMm}
                    min={20}
                    max={300}
                    step={1}
                    onChange={onWidthChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tinggi Label (mm)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={heightMm}
                    min={20}
                    max={300}
                    step={1}
                    onChange={onHeightChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">DPI Printer</label>
                  <select
                    className="form-input"
                    value={dpi}
                    onChange={(e) => {
                      const parsed = parseInt(e.target.value, 10)
                      updateActiveTemplate(template => ({
                        ...template,
                        dpi: safeNumber(parsed, template.dpi)
                      }))
                    }}
                  >
                    <option value={203}>203 DPI (Standard)</option>
                    <option value={300}>300 DPI (High Resolution)</option>
                  </select>
                  <small style={{ display: 'block', marginTop: '5px', color: '#666', fontSize: '12px' }}>
                    Resolusi printer (dots per inch) - cek spesifikasi printer Anda
                  </small>
                </div>
              </div>

              {/* Label Preview */}
              <div style={{ marginTop: '30px', marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '15px', fontSize: '16px', fontWeight: '600', borderBottom: '2px solid #4CAF50', paddingBottom: '8px' }}>
                  👁️ Preview Label
                </h4>
                <LabelPreview 
                  width={widthMm}
                  height={heightMm}
                  dpi={dpi}
                  layout={activeTemplate?.layout || {}}
                />
              </div>

              <div className="settings-grid">
                <div className="form-group">
                  <label className="form-label">Margin Kiri (mm)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={layout.marginLeftMm}
                    min={0}
                    max={Math.max(widthMm - 10, 5)}
                    step="0.5"
                    onChange={onLayoutChange('marginLeftMm', { min: 0, max: Math.max(widthMm - 10, 5) })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Margin Atas (mm)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={layout.marginTopMm}
                    min={0}
                    max={Math.max(heightMm - 10, 5)}
                    step="0.5"
                    onChange={onLayoutChange('marginTopMm', { min: 0, max: Math.max(heightMm - 10, 5) })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Jarak Antar Bagian (mm)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={layout.sectionSpacingMm}
                    min={1}
                    max={25}
                    step="0.5"
                    onChange={onLayoutChange('sectionSpacingMm', { min: 1, max: 25 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Jarak Antar Baris (mm)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={layout.lineSpacingMm}
                    min={1}
                    max={20}
                    step="0.5"
                    onChange={onLayoutChange('lineSpacingMm', { min: 1, max: 20 })}
                  />
                </div>
              </div>

              <div className="settings-grid">
                <div className="form-group">
                  <label className="form-label">Lebar Garis Pembatas (mm)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={layout.lineWidthMm}
                    min={20}
                    max={Math.max(widthMm - 5, 20)}
                    step="0.5"
                    onChange={(event) => {
                      const parsed = parseFloat(event.target.value)
                      const numeric = safeNumber(parsed, layout.lineWidthMm)
                      const clamped = Math.max(20, Math.min(numeric, Math.max(widthMm - 5, 20)))
                      updateActiveTemplateLayout('lineWidthMm', Number(clamped.toFixed(2)))
                    }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Margin Kolom Kanan (mm)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={layout.rightColumnMarginMm}
                    min={0}
                    max={Math.max(widthMm - 20, 10)}
                    step="0.5"
                    onChange={onLayoutChange('rightColumnMarginMm', { min: 0, max: Math.max(widthMm - 20, 10) })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Ketebalan Garis (dots)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={layout.lineThicknessDots}
                    min={1}
                    max={10}
                    onChange={onLayoutIntChange('lineThicknessDots', { min: 1, max: 10 })}
                  />
                </div>
              </div>

              <div className="settings-grid">
                <div className="form-group">
                  <label className="form-label">Font Header (pt)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={layout.headerFontPt}
                    min={10}
                    max={72}
                    onChange={onLayoutChange('headerFontPt', { min: 10, max: 72 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Font Label (pt)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={layout.labelFontPt}
                    min={8}
                    max={48}
                    onChange={onLayoutChange('labelFontPt', { min: 8, max: 48 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Font Nilai (pt)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={layout.valueFontPt}
                    min={8}
                    max={48}
                    onChange={onLayoutChange('valueFontPt', { min: 8, max: 48 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Font Berat (pt)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={layout.weightFontPt}
                    min={10}
                    max={72}
                    onChange={onLayoutChange('weightFontPt', { min: 10, max: 72 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Font Footer (pt)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={layout.footerFontPt}
                    min={8}
                    max={36}
                    onChange={onLayoutChange('footerFontPt', { min: 8, max: 36 })}
                  />
                </div>
              </div>

              <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '1px solid #4CAF50' }}>
                <div style={{ fontSize: '13px', color: '#2e7d32', marginBottom: '8px' }}>
                  <strong>📐 Ukuran Saat Ini: {widthMm}mm × {heightMm}mm @ {dpi} DPI</strong>
                </div>
                <div style={{ fontSize: '12px', color: '#555' }}>
                  ≈ {widthDots} × {heightDots} dots (pixels)
                </div>
              </div>

              <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '1px solid #2196F3' }}>
                <h5 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: '#1976D2' }}>💡 Preset Ukuran:</h5>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                    onClick={() => applyPreset({ width: 72, height: 100, dpi: 203 })}
                  >
                    72 × 100 mm (Portrait)
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                    onClick={() => applyPreset({ width: 80, height: 60, dpi: 203 })}
                  >
                    80 × 60 mm
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                    onClick={() => applyPreset({ width: 100, height: 150, dpi: 203 })}
                  >
                    100 × 150 mm
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                    onClick={() => applyPreset({ width: 58, height: 40, dpi: 203 })}
                  >
                    58 × 40 mm (Kecil)
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: '12px', backgroundColor: '#fff8e1', borderRadius: '8px', border: '1px solid #ffe082', color: '#8d6e63', fontSize: '13px' }}>
              Belum ada template label. Tambahkan template baru untuk mulai mengatur ukuran kertas dan layout cetak.
            </div>
          )}
        </div>

        <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
          <h4 style={{ marginTop: 0, fontSize: '15px', fontWeight: '600', color: '#2E7D32', marginBottom: '12px' }}>⚙️ Pengaturan Otomatis Timbangan</h4>
          <p style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>
            Gunakan fitur auto configure untuk mendeteksi konfigurasi port timbangan secara otomatis, atau gunakan tombol tes untuk memastikan pembacaan data dari timbangan sudah benar.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={async () => {
              setIsAutoConfiguring(true);
              try {
                const resp = await fetch(`${API_BASE_URL}/scale/auto-configure`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ model: settings.scaleModel })
                });
                const data = await resp.json();
                if (data.success) {
                  const config = data.detectedConfig || {};
                  setSettings(prev => ({
                    ...prev,
                    scalePort: data.detectedPort || prev.scalePort,
                    scaleBaudRate: config.baudRate || prev.scaleBaudRate,
                    scaleDataBits: config.dataBits || prev.scaleDataBits,
                    scaleParity: config.parity || prev.scaleParity,
                    scaleStopBits: config.stopBits || prev.scaleStopBits
                  }));

                  const message =
                    `✅ Auto Configure Berhasil!\n\n` +
                    `Port: ${data.detectedPort || '-'}\n` +
                    `Baud Rate: ${config.baudRate || '-'}\n` +
                    `Data Bits: ${config.dataBits || '-'}\n` +
                    `Stop Bits: ${config.stopBits || '-'}\n` +
                    `Parity: ${config.parity || '-'}\n\n` +
                    `Pengaturan telah diperbarui. Klik "Simpan" untuk menyimpan konfigurasi.`;

                  alert.success(message, 'Auto Configure Berhasil');
                  setSaveMessage('Konfigurasi timbangan berhasil di-detect! Klik Simpan untuk menyimpan.');
                } else {
                  const errorMsg = data.details || data.error || 'Gagal auto configure';
                  const testInfo = data.testResults ? 
                    `\n\nPort yang diuji:\n${data.testResults.map(r => `- ${r.port} (${r.success ? 'OK' : 'Gagal'})`).join('\n')}` : '';
                  alert.error(`Auto Configure Gagal\n\n${errorMsg}${testInfo}`, 'Auto Configure Gagal');
                }
              } catch (e) {
                alert.error(`Gagal auto configure: ${e.message}`, 'Error');
              } finally {
                setIsAutoConfiguring(false);
              }
            }}
            style={{ backgroundColor: '#4CAF50', color: 'white' }}
            >
              {isAutoConfiguring ? '⏳ Memindai...' : '🔍 Auto Configure Timbangan'}
            </button>
            <button className="btn btn-secondary" onClick={async () => {
              try {
                const resp = await fetch(`${API_BASE_URL}/scale/ports`);
                const data = await resp.json();
                if (data.success) {
                  const ports = data.data || [];
                  if (ports.length === 0) {
                    alert.info('Tidak ada port serial yang terdeteksi', 'Port Serial');
                  } else {
                    const portList = ports.map(p => `${p.path}${p.manufacturer ? ` (${p.manufacturer})` : ''}`).join('\n');
                    alert.info(`Port Serial Tersedia:\n${portList}`, 'Port Serial');
                  }
                }
              } catch (e) {
                alert.error('Gagal mengambil daftar port', 'Error')
              }
            }}>📋 Daftar Port</button>
            <button className="btn btn-secondary" onClick={async () => {
              try {
                const resp = await fetch(`${API_BASE_URL}/scale/read`);
                const data = await resp.json();
                if (data.success) {
                  alert.info(`Berat: ${data.weight.toFixed(4)} ${data.unit}\nOriginal: ${data.weightOriginal} ${data.originalUnit}\nStable: ${data.stable ? 'Ya' : 'Tidak'}\nRaw: ${data.raw?.slice(0,120)}`, 'Test Baca Timbangan')
                } else {
                  alert.error(`Gagal baca timbangan: ${data.error || 'Unknown'}`, 'Error')
                }
              } catch (e) {
                alert.error('Gagal tes baca timbangan', 'Error')
              }
            }}>⚖️ Tes Baca Timbangan</button>
          </div>
          <p style={{ marginTop: '10px', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
            💡 Tips: Gunakan "Auto Configure" untuk secara otomatis mendeteksi port dan konfigurasi timbangan yang terhubung.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <div className="page-title">
          <SettingsIcon size={28} />
          <h1>System Settings</h1>
        </div>
        <div className="page-description">
          <p>Konfigurasi sistem penimbangan, database, pengguna, dan notifikasi untuk optimalisasi performa aplikasi.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={handleReset}>
            <RotateCcw size={16} />
            Reset
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save size={16} />
            {isSaving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="save-message success">
          {saveMessage}
        </div>
      )}

      <div className="settings-container">
        <div className="settings-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="settings-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}

export default Settings
