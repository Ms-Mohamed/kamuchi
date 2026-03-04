import React, { useState } from 'react';
import TrackingTable from './TrackingTable';
import './WorkerDashboard.css';
import './WorkspaceLayout.css';
import GroupChatHub from '../chat/GroupChatHub';
import ClientManager from './ClientManager';
import EditImportModal from './EditImportModal';

const WorkerDashboard = ({ onLogout }) => {
    const [selectedImport, setSelectedImport] = useState(null);
    const [activeView, setActiveView] = useState('tracking'); // 'tracking' or 'clients'
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [editingImport, setEditingImport] = useState(null);

    // Helper function to update the table data based on chat detection
    const handleAssignExtractedData = async (dataToAssign) => {
        if (!selectedImport) return;

        try {
            const res = await fetch(`http://localhost:5000/api/imports/${selectedImport.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    matricule: dataToAssign.matricule,
                    sortie: dataToAssign.port,
                    location: dataToAssign.location
                })
            });

            if (res.ok) {
                // Refresh table and selected row if necessary
                setRefreshTrigger(prev => prev + 1);
                const updatedImport = await res.json();
                setSelectedImport(updatedImport);
                alert('Data successfully assigned to Tracking Grid!');
            }
        } catch (err) {
            console.error("Failed to assign data:", err);
            alert('Failed to assign data.');
        }
    };

    const handleTableAction = async (actionType, rowData) => {
        if (actionType === 'chat') {
            setSelectedImport(rowData);
        } else if (actionType === 'edit') {
            setEditingImport(rowData);
        } else if (actionType === 'delete') {
            const confirmed = window.confirm(`Are you sure you want to delete import ${rowData.reference}?`);
            if (confirmed) {
                try {
                    const res = await fetch(`http://localhost:5000/api/imports/${rowData.id}`, {
                        method: 'DELETE'
                    });
                    if (res.ok) {
                        setRefreshTrigger(prev => prev + 1);
                        if (selectedImport && selectedImport.id === rowData.id) {
                            setSelectedImport(null);
                        }
                    } else {
                        alert("Failed to delete the import.");
                    }
                } catch (err) {
                    console.error("Delete failed", err);
                }
            }
        }
    };

    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2>Kamuchi</h2>
                    <span className="badge">Worker</span>
                </div>
                <nav className="sidebar-nav">
                    <a href="#" className={`nav-item ${activeView === 'tracking' ? 'active' : ''}`} onClick={() => setActiveView('tracking')}>Import Tracking</a>
                    <a href="#" className={`nav-item ${activeView === 'clients' ? 'active' : ''}`} onClick={() => setActiveView('clients')}>Clients & Groups</a>
                </nav>
                <div className="sidebar-footer">
                    <button onClick={onLogout} className="btn-secondary logout-btn">Logout</button>
                </div>
            </aside>

            <main className="main-content">
                <header className="topbar">
                    <h1>Import Dashboard</h1>
                    <div className="user-info">
                        <span>Worker Node</span>
                    </div>
                </header>

                <div className="content-area">
                    {activeView === 'tracking' ? (
                        <>
                            {editingImport && (
                                <EditImportModal
                                    importData={editingImport}
                                    onClose={() => setEditingImport(null)}
                                    onImportUpdated={(updatedImport) => {
                                        setRefreshTrigger(prev => prev + 1);
                                        if (selectedImport && selectedImport.id === updatedImport.id) {
                                            setSelectedImport(updatedImport);
                                        }
                                    }}
                                />
                            )}
                            <div className="workspace-table">
                                <TrackingTable
                                    selectedRowId={selectedImport?.id}
                                    onActionClick={handleTableAction}
                                    refreshTrigger={refreshTrigger}
                                />
                            </div>
                            <div className="workspace-chat">
                                {selectedImport ? (
                                    <GroupChatHub
                                        reference={selectedImport.reference}
                                        importId={selectedImport.id}
                                        accessCode={selectedImport.client?.accessCode}
                                        onAssignData={handleAssignExtractedData}
                                    />
                                ) : (
                                    <div className="chat-placeholder card empty">
                                        <p>Select an import to view group chat</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="workspace-full">
                            <ClientManager />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default WorkerDashboard;
