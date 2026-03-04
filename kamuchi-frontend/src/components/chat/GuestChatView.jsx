import React, { useState, useEffect } from 'react';
import GroupChatHub from '../chat/GroupChatHub';
import '../worker/WorkerDashboard.css';
import '../client/ClientDashboard.css';

const STATUS_CLASS = {
    'Not Started': 'status-not-started',
    'Started': 'status-started',
    'Completed': 'status-completed',
};

const GuestChatView = ({ secretCode, onLogout }) => {
    const [importData, setImportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchImport = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/imports');
                const allImports = await res.json();

                const matched = allImports.find(imp => imp.client?.accessCode === secretCode);
                if (matched) {
                    setImportData(matched);
                } else {
                    setError('No chat found for this secret code. Please verify the code and try again.');
                }
            } catch (err) {
                setError('Could not connect to the server. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchImport();
    }, [secretCode]);

    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2>Kamuchi Trans</h2>
                    <span className="badge">Guest</span>
                </div>
                <nav className="sidebar-nav">
                    <a href="#" className="nav-item active">💬 Group Chat</a>
                </nav>
                <div className="sidebar-footer">
                    <button onClick={onLogout} className="btn-secondary logout-btn">Leave</button>
                </div>
            </aside>

            <main className="main-content">
                <header className="topbar">
                    <h1>Group Chat</h1>
                    <div className="user-info">
                        <span>🔑 {secretCode}</span>
                    </div>
                </header>

                {loading && (
                    <div className="content-area">
                        <p style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Connecting to chat...</p>
                    </div>
                )}

                {error && (
                    <div className="content-area" style={{ padding: '2rem' }}>
                        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#EF4444' }}>
                            <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>❌</p>
                            <p>{error}</p>
                            <button className="btn-secondary" onClick={onLogout} style={{ marginTop: '1rem' }}>
                                Try Again
                            </button>
                        </div>
                    </div>
                )}

                {importData && (
                    <div className="client-workspace">
                        {/* Left Panel: Shipment Info */}
                        <div className="shipment-panel">
                            <div className="shipment-status-card">
                                <h2>Shipment Info</h2>
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
                                    <div className="detail-row">
                                        <span className="detail-label">Exportador</span>
                                        <span className="detail-value">{importData.exportador || '—'}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Date d'embarque</span>
                                        <span className="detail-value">{importData.dateEmbarque || '—'}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Date Livraison</span>
                                        <span className="detail-value">{importData.dateLivraison || '—'}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Port de Sortie</span>
                                        <span className="detail-value">{importData.sortie || '—'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Panel: Full Chat */}
                        <div className="client-chat-area">
                            <GroupChatHub
                                reference={importData.reference}
                                importId={importData.id}
                                accessCode={secretCode}
                                currentUserType="Client"
                                onAssignData={() => { }}
                            />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default GuestChatView;
