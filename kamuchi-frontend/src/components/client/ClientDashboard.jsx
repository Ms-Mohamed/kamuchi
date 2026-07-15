import React, { useState, useEffect } from 'react';
import ClientShipmentMap from './ClientShipmentMap';
import ClientDocumentPortal from './ClientDocumentPortal';
import NotificationCenter from '../common/NotificationCenter';
import '../worker/WorkerDashboard.css';
import './ClientDashboard.css';
import { apiFetchJson } from '../../api';

const STATUS_CLASS = {
    'Not Started': 'status-not-started',
    'Started': 'status-started',
    'Completed': 'status-completed',
};

const ClientDashboard = ({ userRole, onLogout }) => {
    const [importData, setImportData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMyImport = async () => {
            try {
                // Fetch from multiple sources to ensure we catch the correct operation
                const [legacyData, importsData, exportsData] = await Promise.all([
                    apiFetchJson('/imports', {}, []),
                    apiFetchJson('/logistics-imports', {}, []),
                    apiFetchJson('/logistics-exports', {}, [])
                ]);

                // 1. Try to match in modern imports
                const matchedImport = importsData.find(imp => imp.reference === userRole);
                if (matchedImport) {
                    setImportData({ ...matchedImport, opType: 'IMPORT' });
                    setLoading(false);
                    return;
                }

                // 2. Try to match in modern exports
                const matchedExport = exportsData.find(exp => exp.reference === userRole);
                if (matchedExport) {
                    setImportData({ ...matchedExport, opType: 'EXPORT' });
                    setLoading(false);
                    return;
                }

                // 3. Fallback to legacy tracking
                const matchedLegacy = legacyData.find(imp =>
                    imp.client?.reference === userRole ||
                    imp.client?.accessCode === userRole
                );
                if (matchedLegacy) {
                    setImportData({ ...matchedLegacy, opType: 'IMPORT' });
                } else {
                    setImportData(null);
                }
            } catch (err) {
                console.error('Failed to fetch imports:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchMyImport();
    }, [userRole]);

    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2>Kamuchi Client</h2>
                    <span className="badge">Client</span>
                </div>
                <nav className="sidebar-nav">
                    <a href="#" className="nav-item active">My Shipment</a>
                </nav>
                <div className="sidebar-footer">
                    <button onClick={onLogout} className="btn-secondary logout-btn">Logout</button>
                </div>
            </aside>

            <main className="main-content">
                <header className="topbar">
                    <h1>Client Portal</h1>
                    <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <NotificationCenter role="CLIENT" />
                        <div className="user-info">
                            <span>Access Code: <strong>{userRole}</strong></span>
                        </div>
                    </div>
                </header>

                {loading ? (
                    <div className="content-area">
                        <p style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading your shipment...</p>
                    </div>
                ) : (
                    <div className="client-workspace">
                        {/* --- Left Panel: Status --- */}
                        <div className="shipment-panel">
                            {importData ? (
                                <div className="shipment-status-card">
                                    <h2>My Shipment</h2>
                                    <span className={`status-badge-large ${STATUS_CLASS[importData.status] || 'status-not-started'}`}>
                                        {importData.status}
                                    </span>
                                    <div className="shipment-details">
                                        <div className="detail-row">
                                            <span className="detail-label">Reference</span>
                                            <span className="detail-value">{importData.reference || '—'}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Matricule</span>
                                            <span className="detail-value">{importData.matricule || '—'}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Location</span>
                                            <span className="detail-value">{importData.location || '—'}</span>
                                        </div>
                                    </div>

                                    {/* Integrated Map */}
                                    <div style={{ marginTop: '1.5rem' }}>
                                        <ClientShipmentMap shipment={importData} />
                                    </div>
                                </div>
                            ) : (
                                <div className="no-shipment-card">
                                    <p>🚢 No active shipment found for your access code.</p>
                                    <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Please contact your Kamuchi worker.</p>
                                </div>
                            )}
                        </div>

                        {/* --- Right Panel: Documents & Specs --- */}
                        <div className="client-chat-area">
                            {importData ? (
                                <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%'}}>
                                    <ClientDocumentPortal 
                                        operationId={importData.id} 
                                        operationType={importData.opType} 
                                        reference={importData.reference} 
                                    />
                                    
                                    <div className="card" style={{padding: '1.5rem'}}>
                                        <h3 style={{fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                            🛡️ Operational Specs
                                        </h3>
                                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                                            <div className="spec-item">
                                                <p className="spec-label">Truck Matrix</p>
                                                <p className="spec-val">{importData.matriculeRemorque || importData.matricule || 'Pending'}</p>
                                            </div>
                                            <div className="spec-item">
                                                <p className="spec-label">Tractor Unit</p>
                                                <p className="spec-val">{importData.matriculeTracteur || importData.tracteurImport || 'Pending'}</p>
                                            </div>
                                            <div className="spec-item">
                                                <p className="spec-label">Route Path</p>
                                                <p className="spec-val">{importData.trajet || importData.location || 'Calculated'}</p>
                                            </div>
                                            <div className="spec-item">
                                                <p className="spec-label">Expected Completion</p>
                                                <p className="spec-val">{importData.dateLivraison || 'In Transit'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    <p>📁 Your document vault will appear once your shipment is assigned.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ClientDashboard;
