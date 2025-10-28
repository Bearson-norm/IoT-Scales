import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Clock, Database, RefreshCw } from 'lucide-react';

const DatabaseImport = () => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importLogs, setImportLogs] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [fullRefresh, setFullRefresh] = useState(true);
  const fileInputRef = useRef(null);

  // Load import logs on component mount
  React.useEffect(() => {
    loadImportLogs();
  }, []);

  const loadImportLogs = async () => {
    try {
      const response = await fetch('/api/import-logs');
      if (response.ok) {
        const logs = await response.json();
        setImportLogs(logs.data || []);
      }
    } catch (error) {
      console.error('Error loading import logs:', error);
    }
  };

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  const handlePreview = async () => {
    if (!file) return;

    setIsPreviewLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fullRefresh', fullRefresh.toString());

      const response = await fetch('/api/preview-import', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setPreviewData(result.preview);
        setShowPreview(true);
      } else {
        const error = await response.json();
        alert(`Preview failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Preview error:', error);
      alert('Preview failed. Please try again.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setShowPreview(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fullRefresh', fullRefresh.toString());

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/import-database', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        const result = await response.json();
        
        if (result.comparison) {
          setComparisonData(result.comparison);
          setShowComparison(true);
        }
        
        // Reload logs
        await loadImportLogs();
        
        // Trigger stats refresh for database page
        window.dispatchEvent(new CustomEvent('database_updated'));
        
        alert('Database imported successfully!');
      } else {
        const error = await response.json();
        alert(`Import failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'in_progress':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="database-import-page">
      <div className="page-header">
        <h1 className="page-title">
          <Database className="w-6 h-6" />
          Database Import
        </h1>
        <p className="page-description">
          Import database from CSV file with comparison and logging features
        </p>
      </div>

      <div className="import-section">
        <div className="upload-card">
          <div className="upload-header">
            <Upload className="w-8 h-8 text-blue-500" />
            <h2>Upload CSV File</h2>
          </div>
          
          <div className="upload-content">
            <div className="file-input-container">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="file-input"
                disabled={isUploading}
              />
              <div className="file-input-label">
                <FileText className="w-5 h-5" />
                {file ? file.name : 'Choose CSV file...'}
              </div>
            </div>

            {file && (
              <div className="file-info">
                <p><strong>File:</strong> {file.name}</p>
                <p><strong>Size:</strong> {(file.size / 1024).toFixed(2)} KB</p>
                <p><strong>Type:</strong> {file.type}</p>
              </div>
            )}

            {/* Full Refresh Toggle */}
            <div className="refresh-option">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={fullRefresh}
                  onChange={(e) => setFullRefresh(e.target.checked)}
                  disabled={isUploading || isPreviewLoading}
                />
                <span>Full Refresh (Wipe existing data and import fresh)</span>
              </label>
              <p className="toggle-hint">
                {fullRefresh 
                  ? '⚠️ All master products, formulations, and ingredients will be DELETED and replaced with new data'
                  : '⚠️ New data will be added/updated without deleting existing records'}
              </p>
            </div>

            {isUploading && (
              <div className="progress-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="progress-text">{uploadProgress}% Complete</p>
              </div>
            )}

            <button
              onClick={handlePreview}
              disabled={!file || isPreviewLoading || isUploading}
              className="upload-button"
            >
              {isPreviewLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Preview Import
                </>
              )}
            </button>
          </div>
        </div>

        {/* Import Logs */}
        <div className="logs-section">
          <h2>Import History</h2>
          <div className="logs-container">
            {importLogs.length === 0 ? (
              <div className="empty-logs">
                <Clock className="w-12 h-12 text-gray-400" />
                <p>No import history found</p>
              </div>
            ) : (
              <div className="logs-list">
                {importLogs.map((log, index) => (
                  <div key={index} className="log-item">
                    <div className="log-icon">
                      {getStatusIcon(log.status)}
                    </div>
                    <div className="log-content">
                      <div className="log-header">
                        <h3>{log.filename || 'Unknown File'}</h3>
                        <span className="log-date">{formatDate(log.created_at)}</span>
                      </div>
                      <div className="log-details">
                        <p><strong>Status:</strong> {log.status}</p>
                        <p><strong>Records:</strong> {log.total_records || 0}</p>
                        <p><strong>Successful:</strong> {log.successful_records || 0}</p>
                        <p><strong>Failed:</strong> {log.failed_records || 0}</p>
                        {log.error_details && (
                          <p><strong>Error:</strong> {log.error_details}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div className="modal-overlay">
          <div className="modal-content comparison-modal">
            <div className="modal-header">
              <h2>Import Preview</h2>
              <button 
                onClick={() => setShowPreview(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            
            <div className="comparison-content">
              <div className="comparison-summary">
                <h3>Preview Summary</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="summary-label">Total Records:</span>
                    <span className="summary-value">{previewData.total_records}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">New Products:</span>
                    <span className="summary-value text-green-600">{previewData.new_products}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Updated Products:</span>
                    <span className="summary-value text-blue-600">{previewData.updated_products}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">New Formulations:</span>
                    <span className="summary-value text-green-600">{previewData.new_formulations}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">New Ingredients:</span>
                    <span className="summary-value text-green-600">{previewData.new_ingredients}</span>
                  </div>
                </div>
              </div>

              {previewData.changes && previewData.changes.length > 0 && (
                <div className="changes-section">
                  <h3>Changes Preview</h3>
                  <div className="changes-list">
                    {previewData.changes.map((change, index) => (
                      <div key={index} className="change-item">
                        <div className="change-type">
                          <span className={`change-badge ${change.type}`}>
                            {change.type}
                          </span>
                        </div>
                        <div className="change-details">
                          <p><strong>{change.table}:</strong> {change.description}</p>
                          {change.old_value && (
                            <p className="old-value">Old: {change.old_value}</p>
                          )}
                          {change.new_value && (
                            <p className="new-value">New: {change.new_value}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="preview-warning">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <p>This is a preview. No changes have been made to the database yet.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                onClick={() => setShowPreview(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmImport}
                className="btn-primary"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Confirm Import
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {showComparison && comparisonData && (
        <div className="modal-overlay">
          <div className="modal-content comparison-modal">
            <div className="modal-header">
              <h2>Data Comparison</h2>
              <button 
                onClick={() => setShowComparison(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            
            <div className="comparison-content">
              <div className="comparison-summary">
                <h3>Import Summary</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="summary-label">Total Records:</span>
                    <span className="summary-value">{comparisonData.total_records}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">New Products:</span>
                    <span className="summary-value text-green-600">{comparisonData.new_products}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Updated Products:</span>
                    <span className="summary-value text-blue-600">{comparisonData.updated_products}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">New Formulations:</span>
                    <span className="summary-value text-green-600">{comparisonData.new_formulations}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">New Ingredients:</span>
                    <span className="summary-value text-green-600">{comparisonData.new_ingredients}</span>
                  </div>
                </div>
              </div>

              {comparisonData.changes && comparisonData.changes.length > 0 && (
                <div className="changes-section">
                  <h3>Detailed Changes</h3>
                  <div className="changes-list">
                    {comparisonData.changes.map((change, index) => (
                      <div key={index} className="change-item">
                        <div className="change-type">
                          <span className={`change-badge ${change.type}`}>
                            {change.type}
                          </span>
                        </div>
                        <div className="change-details">
                          <p><strong>{change.table}:</strong> {change.description}</p>
                          {change.old_value && (
                            <p className="old-value">Old: {change.old_value}</p>
                          )}
                          {change.new_value && (
                            <p className="new-value">New: {change.new_value}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                onClick={() => setShowComparison(false)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .database-import-page {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 30px;
        }

        .page-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
        }

        .page-description {
          color: #666;
          font-size: 14px;
        }

        .import-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }

        .upload-card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .upload-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .upload-header h2 {
          font-size: 18px;
          font-weight: 600;
        }

        .file-input-container {
          position: relative;
          margin-bottom: 20px;
        }

        .file-input {
          position: absolute;
          opacity: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }

        .file-input-label {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 15px;
          border: 2px dashed #ddd;
          border-radius: 8px;
          cursor: pointer;
          transition: border-color 0.3s;
        }

        .file-input-label:hover {
          border-color: #3b82f6;
        }

        .file-info {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
        }

        .file-info p {
          margin: 5px 0;
          font-size: 14px;
        }

        .refresh-option {
          margin: 20px 0;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-weight: 500;
          margin-bottom: 8px;
        }

        .toggle-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .toggle-hint {
          margin: 0;
          font-size: 13px;
          color: #dc2626;
          font-weight: 500;
        }

        .progress-container {
          margin-bottom: 20px;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #3b82f6;
          transition: width 0.3s;
        }

        .progress-text {
          text-align: center;
          margin-top: 5px;
          font-size: 14px;
          color: #666;
        }

        .upload-button {
          width: 100%;
          padding: 12px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.3s;
        }

        .upload-button:hover:not(:disabled) {
          background: #2563eb;
        }

        .upload-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .logs-section {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .logs-section h2 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
        }

        .empty-logs {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .logs-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .log-item {
          display: flex;
          gap: 15px;
          padding: 15px;
          border-bottom: 1px solid #e5e7eb;
        }

        .log-item:last-child {
          border-bottom: none;
        }

        .log-icon {
          flex-shrink: 0;
        }

        .log-content {
          flex: 1;
        }

        .log-header {
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: 8px;
        }

        .log-header h3 {
          font-size: 16px;
          font-weight: 500;
          margin: 0;
        }

        .log-date {
          font-size: 12px;
          color: #666;
        }

        .log-details p {
          margin: 2px 0;
          font-size: 14px;
          color: #666;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .comparison-modal {
          background: white;
          border-radius: 8px;
          max-width: 800px;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        }

        .comparison-content {
          padding: 20px;
        }

        .comparison-summary h3 {
          margin-bottom: 15px;
          font-size: 18px;
          font-weight: 600;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 6px;
        }

        .summary-label {
          font-weight: 500;
        }

        .summary-value {
          font-weight: 600;
        }

        .changes-section h3 {
          margin-bottom: 15px;
          font-size: 18px;
          font-weight: 600;
        }

        .changes-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .change-item {
          display: flex;
          gap: 15px;
          padding: 10px;
          border-bottom: 1px solid #e5e7eb;
        }

        .change-type {
          flex-shrink: 0;
        }

        .change-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .change-badge.new {
          background: #dcfce7;
          color: #166534;
        }

        .change-badge.updated {
          background: #dbeafe;
          color: #1e40af;
        }

        .change-badge.deleted {
          background: #fee2e2;
          color: #dc2626;
        }

        .change-details p {
          margin: 2px 0;
          font-size: 14px;
        }

        .old-value {
          color: #dc2626;
        }

        .new-value {
          color: #166534;
        }

        .modal-footer {
          padding: 20px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
        }

        .btn-secondary {
          padding: 8px 16px;
          background: #6b7280;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        .btn-primary {
          padding: 8px 16px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-primary:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .preview-warning {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 15px;
          background: #fef3cd;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          margin-top: 20px;
        }

        .preview-warning p {
          margin: 0;
          color: #92400e;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .import-section {
            grid-template-columns: 1fr;
          }
          
          .comparison-modal {
            margin: 20px;
            max-width: calc(100vw - 40px);
          }
        }
      `}</style>
    </div>
  );
};

export default DatabaseImport;
