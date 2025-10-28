import React, { useState } from 'react'
import { Upload, Download, FileText, Database, X, CheckCircle, AlertCircle } from 'lucide-react'
import { 
  exportMasterProduct, 
  exportMasterFormulation, 
  exportMasterToleranceGrouping, 
  exportMasterUser,
  exportAllMasterData 
} from '../utils/dataExport'
import { 
  importMasterProduct, 
  importMasterFormulation, 
  importMasterToleranceGrouping, 
  importMasterUser 
} from '../utils/dataImport'

const ImportExportModal = ({ 
  isOpen, 
  onClose, 
  type, // 'import' or 'export'
  dataType, // 'product', 'formulation', 'tolerance', 'user', 'all'
  data = [],
  onImportSuccess 
}) => {
  const [format, setFormat] = useState('json')
  const [selectedFile, setSelectedFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState(null)

  const handleExport = async () => {
    setIsProcessing(true)
    setResult(null)

    try {
      let exportResult

      switch (dataType) {
        case 'product':
          exportResult = exportMasterProduct(data, format)
          break
        case 'formulation':
          exportResult = exportMasterFormulation(data, format)
          break
        case 'tolerance':
          exportResult = exportMasterToleranceGrouping(data, format)
          break
        case 'user':
          exportResult = exportMasterUser(data, format)
          break
        case 'all':
          exportResult = await exportAllMasterData(data, format)
          break
        default:
          throw new Error('Invalid data type')
      }

      setResult(exportResult)
    } catch (error) {
      setResult({
        success: false,
        message: 'Export failed: ' + error.message
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) {
      setResult({
        success: false,
        message: 'Please select a file to import'
      })
      return
    }

    setIsProcessing(true)
    setResult(null)

    try {
      let importResult

      switch (dataType) {
        case 'product':
          importResult = await importMasterProduct(selectedFile, format)
          break
        case 'formulation':
          importResult = await importMasterFormulation(selectedFile, format)
          break
        case 'tolerance':
          importResult = await importMasterToleranceGrouping(selectedFile, format)
          break
        case 'user':
          importResult = await importMasterUser(selectedFile, format)
          break
        default:
          throw new Error('Invalid data type')
      }

      setResult(importResult)
      
      if (importResult.success && onImportSuccess) {
        onImportSuccess(importResult.data)
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Import failed: ' + error.message
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    setSelectedFile(file)
    setResult(null)
  }

  const getDataTypeLabel = () => {
    switch (dataType) {
      case 'product': return 'Master Product'
      case 'formulation': return 'Master Formulation'
      case 'tolerance': return 'Master Tolerance Grouping'
      case 'user': return 'Master User'
      case 'all': return 'All Master Data'
      default: return 'Data'
    }
  }

  const getFileExtension = () => {
    return format === 'json' ? '.json' : '.csv'
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">
            {type === 'import' ? (
              <>
                <Upload size={20} />
                Import {getDataTypeLabel()}
              </>
            ) : (
              <>
                <Download size={20} />
                Export {getDataTypeLabel()}
              </>
            )}
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          {type === 'export' && (
            <div className="export-section">
              <div className="format-selection">
                <label className="form-label">Export Format:</label>
                <div className="format-options">
                  <label className="format-option">
                    <input
                      type="radio"
                      name="format"
                      value="json"
                      checked={format === 'json'}
                      onChange={(e) => setFormat(e.target.value)}
                    />
                    <FileText size={16} />
                    JSON
                  </label>
                  <label className="format-option">
                    <input
                      type="radio"
                      name="format"
                      value="csv"
                      checked={format === 'csv'}
                      onChange={(e) => setFormat(e.target.value)}
                    />
                    <Database size={16} />
                    CSV
                  </label>
                </div>
              </div>

              <div className="data-preview">
                <h4>Data Preview ({data.length} records)</h4>
                <div className="preview-table">
                  <table>
                    <thead>
                      <tr>
                        {data.length > 0 && Object.keys(data[0]).slice(0, 5).map(key => (
                          <th key={key}>{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(0, 3).map((row, index) => (
                        <tr key={index}>
                          {Object.values(row).slice(0, 5).map((value, i) => (
                            <td key={i}>{String(value).substring(0, 20)}...</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {type === 'import' && (
            <div className="import-section">
              <div className="format-selection">
                <label className="form-label">Import Format:</label>
                <div className="format-options">
                  <label className="format-option">
                    <input
                      type="radio"
                      name="format"
                      value="json"
                      checked={format === 'json'}
                      onChange={(e) => setFormat(e.target.value)}
                    />
                    <FileText size={16} />
                    JSON
                  </label>
                  <label className="format-option">
                    <input
                      type="radio"
                      name="format"
                      value="csv"
                      checked={format === 'csv'}
                      onChange={(e) => setFormat(e.target.value)}
                    />
                    <Database size={16} />
                    CSV
                  </label>
                </div>
              </div>

              <div className="file-upload">
                <label className="form-label">Select File:</label>
                <div className="file-input-container">
                  <input
                    type="file"
                    accept={format === 'json' ? '.json' : '.csv'}
                    onChange={handleFileChange}
                    className="file-input"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="file-upload-label">
                    <Upload size={20} />
                    Choose File
                  </label>
                </div>
                {selectedFile && (
                  <div className="selected-file">
                    <FileText size={16} />
                    {selectedFile.name}
                  </div>
                )}
              </div>

              <div className="import-instructions">
                <h4>Import Instructions:</h4>
                <ul>
                  <li>File must be in {format.toUpperCase()} format</li>
                  <li>Required fields must be present in all rows</li>
                  <li>Data will be validated before import</li>
                  <li>Duplicate records will be updated</li>
                </ul>
              </div>
            </div>
          )}

          {result && (
            <div className={`result-message ${result.success ? 'success' : 'error'}`}>
              {result.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              <div>
                <strong>{result.success ? 'Success!' : 'Error!'}</strong>
                <p>{result.message}</p>
                {result.errors && result.errors.length > 0 && (
                  <div className="error-details">
                    <h5>Validation Errors:</h5>
                    <ul>
                      {result.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={type === 'import' ? handleImport : handleExport}
            disabled={isProcessing || (type === 'import' && !selectedFile)}
          >
            {isProcessing ? 'Processing...' : (type === 'import' ? 'Import' : 'Export')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ImportExportModal


