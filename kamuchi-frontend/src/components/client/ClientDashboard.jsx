import React, { useState, useEffect } from 'react';
import GroupChatHub from '../chat/GroupChatHub';
import '../worker/WorkerDashboard.css';
import './ClientDashboard.css';

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
                const res = await fetch('http://localhost:5000/api/imports');
                const allImports = await res.json();

                // Match by client's reference or accessCode against the userRole entered at login
                const matched = allImports.find(imp =>
                    imp.client?.reference === userRole ||
                    imp.client?.accessCode === userRole
                );
                setImportData(matched || null);
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
                    <div className="user-info">
                        <span>Access Code: <strong>{userRole}</strong></span>
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
                            ) : (
                                <div className="no-shipment-card">
                                    <p>🚢 No active shipment found for your access code.</p>
                                    <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Please contact your Kamuchi worker.</p>
                                </div>
                            )}
                        </div>

                        {/* --- Right Panel: Chat --- */}
                        <div className="client-chat-area">
                            {importData ? (
                                <GroupChatHub
                                    reference={importData.reference}
                                    importId={importData.id}
                                    currentUserType="Client"
                                    onAssignData={() => { }} // Clients don't assign data
                                />
                            ) : (
                                <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    <p>💬 Chat will appear once your shipment is assigned.</p>
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
