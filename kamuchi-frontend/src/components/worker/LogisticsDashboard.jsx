import React, { useState } from 'react';
import LogisticsImportTable from './LogisticsImportTable';
import LogisticsExportTable from './LogisticsExportTable';
import './WorkspaceLayout.css'; // Reusing standard layout styles

const LogisticsDashboard = ({ isConfirmedView, user }) => {
    const role = user?.role || 'WORKER';
    
    // Determine the default tab based on role
    const getInitialTab = () => {
        if (role === 'EXPORT_WORKER') return 'export';
        return 'import';
    };

    const [activeTab, setActiveTab] = useState(getInitialTab());

    // Filter available tabs based on role
    const canSeeImport = role === 'ADMIN' || role === 'WORKER' || role === 'IMPORT_WORKER' || role === 'OPS_MANAGER';
    const canSeeExport = role === 'ADMIN' || role === 'WORKER' || role === 'EXPORT_WORKER' || role === 'OPS_MANAGER';

    return (
        <div className="workspace-full">
            <div className="workspace-header">
                <h2>{isConfirmedView ? 'Confirmed Operations' : 'Logistics Tracking'}</h2>
                <div className="tabs" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    {canSeeImport && (
                        <button 
                            className={`btn ${activeTab === 'import' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveTab('import')}
                        >
                            {isConfirmedView ? 'Confirmed Imports' : 'Import Tracking'}
                        </button>
                    )}
                    {canSeeExport && (
                        <button 
                            className={`btn ${activeTab === 'export' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveTab('export')}
                        >
                            {isConfirmedView ? 'Confirmed Exports' : 'Export Tracking'}
                        </button>
                    )}
                </div>
            </div>
            
            <div className="workspace-content" style={{ marginTop: '1.5rem' }}>
                {activeTab === 'import' && canSeeImport ? (
                    <LogisticsImportTable isConfirmedView={isConfirmedView} user={user} />
                ) : activeTab === 'export' && canSeeExport ? (
                    <LogisticsExportTable isConfirmedView={isConfirmedView} user={user} />
                ) : (
                    <div className="no-access">Access Restricted</div>
                )}
            </div>
        </div>
    );
};

export default LogisticsDashboard;
