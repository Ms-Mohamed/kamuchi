import React, { useState } from 'react';
import InvoiceListTable from './InvoiceListTable';
import FournisseurTable from './FournisseurTable';
import './WorkspaceLayout.css';

const InvoiceDashboard = () => {
    const [activeTab, setActiveTab] = useState('client'); // 'client' or 'supplier'

    return (
        <div className="workspace-full">
            <div className="workspace-header">
                <h2>Gestion des Factures</h2>
                <div className="tabs" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button 
                        className={`btn ${activeTab === 'client' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setActiveTab('client')}
                    >
                        Factures Clients
                    </button>
                    <button 
                        className={`btn ${activeTab === 'supplier' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setActiveTab('supplier')}
                    >
                        Factures Fournisseurs
                    </button>
                </div>
            </div>
            
            <div className="workspace-content" style={{ marginTop: '1.5rem' }}>
                {activeTab === 'client' ? (
                    <InvoiceListTable />
                ) : (
                    <FournisseurTable />
                )}
            </div>
        </div>
    );
};

export default InvoiceDashboard;
