import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle, Eye, Download } from 'lucide-react';
import { importFormulaFile, validateFormulaFile } from '../utils/formulaImport.js';

const FormulaImportModal = ({ isOpen, onClose, onImportComplete }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [validationResult, setValidationResult] = useState(null);
    const [isValidating, setIsValidating] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [showPreview, setShowPreview] = useState(false);

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            setValidationResult(null);
            setImportResult(null);
            setShowPreview(false);
            
            // Auto-validate file
            setIsValidating(true);
            try {
                const result = await validateFormulaFile(file);
                setValidationResult(result);
            } catch (error) {
                setValidationResult({
                    valid: false,
                    error: error.message
                });
            }
            setIsValidating(false);
        }
    };

    const handleImport = async () => {
        if (!selectedFile || !validationResult?.valid) return;

        setIsImporting(true);
        try {
            const result = await importFormulaFile(selectedFile, 'current-user-id');
            setImportResult(result);
            
            if (result.success) {
                onImportComplete?.(result);
            }
        } catch (error) {
            setImportResult({
                success: false,
                error: error.message
            });
        }
        setIsImporting(false);
    };

    const handleClose = () => {
        setSelectedFile(null);
        setValidationResult(null);
        setImportResult(null);
        setShowPreview(false);
        onClose();
    };

    const downloadTemplate = () => {
        const template = `formulationCode,formulationName,productCode,productName,targetMass,totalMass,uom,totalIngredient,status,mustFollowOrder,min,max,toleranceGroupingName,toleranceType,maxAllowedWeighingQty,implementToleranceGrouping,instruction
MIXING - FROOZY BANANA BLISS,MIXING - FROOZY BANANA BLISS,RMLIQ00255,YOGHURT N7S8006,40,1000,g,11,active,FALSE,0,0,timbanganKecil,mass,5000,TRUE,-
MIXING - FROOZY BANANA BLISS,MIXING - FROOZY BANANA BLISS,RMLIQ00254,YOGHURT M4B2149,80,1000,g,11,active,FALSE,0,0,timbanganKecil,mass,5000,TRUE,-`;
        
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'formula_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Import Formula to Input
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* File Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Pilih File Formula to Input
                        </label>
                        <div className="flex items-center space-x-4">
                            <input
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={handleFileSelect}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            <button
                                onClick={downloadTemplate}
                                className="flex items-center space-x-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
                            >
                                <Download className="w-4 h-4" />
                                <span>Download Template</span>
                            </button>
                        </div>
                    </div>

                    {/* Validation Result */}
                    {validationResult && (
                        <div className={`p-4 rounded-lg ${
                            validationResult.valid 
                                ? 'bg-green-50 border border-green-200' 
                                : 'bg-red-50 border border-red-200'
                        }`}>
                            <div className="flex items-center space-x-2">
                                {validationResult.valid ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                )}
                                <span className={`font-medium ${
                                    validationResult.valid ? 'text-green-800' : 'text-red-800'
                                }`}>
                                    {validationResult.valid ? 'File Valid' : 'File Tidak Valid'}
                                </span>
                            </div>
                            
                            {validationResult.valid ? (
                                <div className="mt-2 text-sm text-green-700">
                                    <p>Total Rows: {validationResult.totalRows}</p>
                                    <p>Unique Formulations: {validationResult.uniqueFormulations}</p>
                                    <p>Unique Products: {validationResult.uniqueProducts}</p>
                                </div>
                            ) : (
                                <div className="mt-2 text-sm text-red-700">
                                    <p>{validationResult.error}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Preview Button */}
                    {validationResult?.valid && (
                        <div>
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className="flex items-center space-x-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
                            >
                                <Eye className="w-4 h-4" />
                                <span>{showPreview ? 'Hide' : 'Show'} Preview</span>
                            </button>
                        </div>
                    )}

                    {/* Preview Data */}
                    {showPreview && validationResult?.preview && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="font-medium text-gray-900 mb-3">Preview Data</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            {Object.keys(validationResult.preview[0]).map(key => (
                                                <th key={key} className="text-left py-2 px-3 font-medium text-gray-700">
                                                    {key}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {validationResult.preview.map((row, index) => (
                                            <tr key={index} className="border-b">
                                                {Object.values(row).map((value, i) => (
                                                    <td key={i} className="py-2 px-3 text-gray-600">
                                                        {value}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Import Result */}
                    {importResult && (
                        <div className={`p-4 rounded-lg ${
                            importResult.success 
                                ? 'bg-green-50 border border-green-200' 
                                : 'bg-red-50 border border-red-200'
                        }`}>
                            <div className="flex items-center space-x-2">
                                {importResult.success ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                )}
                                <span className={`font-medium ${
                                    importResult.success ? 'text-green-800' : 'text-red-800'
                                }`}>
                                    {importResult.success ? 'Import Berhasil' : 'Import Gagal'}
                                </span>
                            </div>
                            
                            {importResult.success ? (
                                <div className="mt-2 text-sm text-green-700">
                                    <p>Total Records: {importResult.totalRecords}</p>
                                    <p>Successful: {importResult.successfulRecords}</p>
                                    <p>Failed: {importResult.failedRecords}</p>
                                </div>
                            ) : (
                                <div className="mt-2 text-sm text-red-700">
                                    <p>{importResult.error}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={!selectedFile || !validationResult?.valid || isImporting}
                            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg"
                        >
                            {isImporting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Importing...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    <span>Import</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FormulaImportModal;
