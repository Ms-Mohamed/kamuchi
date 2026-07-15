import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Image as ImageIcon, Trash2, X, Download, Eye, UploadCloud } from 'lucide-react';
import './LogisticsFilesModal.css';
import { apiFetch, UPLOAD_BASE_URL } from '../../api';
import { useModal } from '../common/ModalContext';

const DOCUMENT_TYPES = ['CMR', 'TO', 'BL', 'DECLARATION', 'TRYPTIQUE'];

const LogisticsFilesModal = ({ isOpen, onClose, rowData, operationType }) => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);
    const { showAlert, showConfirm } = useModal();

    const fetchDocuments = async () => {
        if (!rowData || !operationType) return;
        try {
            const res = await apiFetch(`/logistics-documents/${operationType}/${rowData.id}`);
            if (res.ok) {
                const data = await res.json();
                setDocuments(data);
            }
        } catch (error) {
            console.error("Failed to fetch documents:", error);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchDocuments();
        } else {
            setDocuments([]);
        }
    }, [isOpen, rowData, operationType]);

    if (!isOpen || !rowData) return null;

    const handleUpload = async (file, docType) => {
        if (!file) return;
        
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await apiFetch(`/logistics-documents/${operationType}/${rowData.id}/${docType}`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                await fetchDocuments();
            } else {
                showAlert("Upload Failed", "Could not upload the document.", "error");
            }
        } catch (error) {
            console.error("Upload error:", error);
            showAlert("Error", "An error occurred during upload.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (fileId) => {
        const confirmed = await showConfirm(
            'Delete Document', 
            'Are you sure you want to delete this document?',
            { confirmText: 'Delete', cancelText: 'Cancel' }
        );

        if (!confirmed) return;
        
        try {
            const res = await apiFetch(`/logistics-documents/${fileId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                await fetchDocuments();
                if (previewFile && previewFile.id === fileId) setPreviewFile(null);
            }
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    const Dropzone = ({ type }) => {
        const onDrop = useCallback(acceptedFiles => {
            handleUpload(acceptedFiles[0], type);
        }, [type]);

        const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
            onDrop, 
            accept: { 'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png'] },
            multiple: false 
        });

        return (
            <div {...getRootProps()} className={`file-dropzone ${isDragActive ? 'active' : ''}`}>
                <input {...getInputProps()} />
                <UploadCloud size={24} />
                <p>{isDragActive ? 'Drop it here!' : 'Drag & drop or click'}</p>
            </div>
        );
    };

    const FilePreview = () => {
        if (!previewFile) return null;
        const isImage = previewFile.fileName.match(/\.(jpg|jpeg|png|gif)$/i);
        const fileUrl = `${UPLOAD_BASE_URL}/${previewFile.fileName}`;

        return (
            <div className="preview-overlay">
                <div className="preview-container">
                    <div className="preview-header">
                        <h3>{previewFile.originalName}</h3>
                        <div className="preview-actions">
                            <a href={fileUrl} download className="btn-icon"><Download size={20} /></a>
                            <button onClick={() => setPreviewFile(null)} className="btn-icon"><X size={20} /></button>
                        </div>
                    </div>
                    <div className="preview-content">
                        {isImage ? (
                            <img src={fileUrl} alt="Preview" />
                        ) : (
                            <iframe src={fileUrl} title="PDF Preview" width="100%" height="100%" />
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="files-modal-overlay">
            <div className="files-modal-content">
                <div className="files-modal-header">
                    <h2>
                        📁 Documents Manager
                        <span className="ref-badge">{rowData.reference}</span>
                    </h2>
                    <button className="logistics-btn-close" onClick={onClose}>×</button>
                </div>
                
                <div className="files-modal-body">
                    {DOCUMENT_TYPES.map(type => {
                        const typeDocs = documents.filter(d => d.documentType === type);
                        
                        return (
                            <div key={type} className="file-upload-card">
                                <div className="file-upload-header">
                                    <h3>{type}</h3>
                                    <span className="count-badge">{typeDocs.length}</span>
                                </div>

                                <div className="uploaded-files-list">
                                    {typeDocs.map(doc => (
                                        <div key={doc.id} className="uploaded-file-item">
                                            <div className="file-info" onClick={() => setPreviewFile(doc)}>
                                                {doc.fileName.match(/\.(pdf)$/i) ? <FileText size={16} /> : <ImageIcon size={16} />}
                                                <span className="file-name">{doc.originalName}</span>
                                            </div>
                                            <div className="file-actions">
                                                <button className="btn-icon view" onClick={() => setPreviewFile(doc)}><Eye size={14} /></button>
                                                <button className="btn-icon delete" onClick={() => handleDelete(doc.id)}><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Dropzone type={type} />
                            </div>
                        );
                    })}
                </div>

                <div className="files-modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Close Manager</button>
                </div>
            </div>

            <FilePreview />
        </div>
    );
};

export default LogisticsFilesModal;
