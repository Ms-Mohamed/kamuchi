import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, Clock, ShieldCheck } from 'lucide-react';
import './ClientDocumentPortal.css';
import { API_BASE_URL, UPLOAD_BASE_URL } from '../../api';

const ClientDocumentPortal = ({ operationId, operationType, reference }) => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDocuments = async () => {
        if (!operationId || !operationType) return;
        
        console.log(`[Vault] Fetching docs for ${operationType} #${operationId}`);
        try {
            const res = await fetch(`${API_BASE_URL}/logistics-documents/${operationType}/${operationId}`);
            if (res.ok) {
                const data = await res.json();
                console.log(`[Vault] Received ${data.length} docs`);
                setDocuments(data);
            }
        } catch (err) {
            console.error('[Vault] Error fetching documents:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchDocuments();
    }, [operationId, operationType]);

    const handleDownload = (fileName, originalName) => {
        const link = document.createElement('a');
        link.href = `${UPLOAD_BASE_URL}/${fileName}`;
        link.download = originalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePreview = (fileName) => {
        window.open(`${UPLOAD_BASE_URL}/${fileName}`, '_blank');
    };

    if (loading) return <div className="doc-portal-loading">Scanning Document Vault...</div>;

    return (
        <div className="client-doc-portal card">
            <div className="doc-portal-header">
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <div className="doc-icon-main"><ShieldCheck size={24} color="var(--admin-accent)" /></div>
                    <div>
                        <h3>Document Vault</h3>
                        <p>Certified files for {reference}</p>
                    </div>
                </div>
            </div>

            <div className="doc-list">
                {documents.length === 0 ? (
                    <div className="empty-docs">
                        <FileText size={48} color="#e2e8f0" />
                        <p>No documents have been uploaded for this shipment yet.</p>
                    </div>
                ) : (
                    documents.map(doc => (
                        <div key={doc.id} className="doc-item">
                            <div className="doc-type-icon">
                                <FileText size={20} />
                            </div>
                            <div className="doc-info">
                                <span className="doc-name">{doc.originalName}</span>
                                <div className="doc-meta">
                                    <span className="doc-tag">{doc.documentType}</span>
                                    <span className="doc-date"><Clock size={12} /> {new Date(doc.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="doc-actions">
                                <button className="btn-preview" onClick={() => handlePreview(doc.fileName)} title="Preview">
                                    <Eye size={18} />
                                </button>
                                <button className="btn-download" onClick={() => handleDownload(doc.fileName, doc.originalName)} title="Download">
                                    <Download size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="doc-portal-footer">
                <p>All documents are secured and timestamped by Kamuchi Core.</p>
            </div>
        </div>
    );
};

export default ClientDocumentPortal;
