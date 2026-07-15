import React, { useState } from 'react';
import './WorkerDashboard.css';
import './WorkspaceLayout.css';
import ClientManager from './ClientManager';
import LogisticsDashboard from './LogisticsDashboard';
import InvoiceDashboard from './InvoiceDashboard';
import PaymentDashboard from './PaymentDashboard';
import TracteurTable from './TracteurTable';
import NotificationCenter from '../common/NotificationCenter';

const WorkerDashboard = ({ user, onLogout }) => {
    const role = user?.role || 'WORKER';
    
    const getInitialView = () => {
        if (role === 'IMPORT_WORKER' || role === 'EXPORT_WORKER') return 'logistics';
        if (role === 'OPS_MANAGER') return 'confirmed';
        return 'logistics';
    };

    const [activeView, setActiveView] = useState(getInitialView());

    const navItems = [
        { id: 'logistics', label: 'Logistics', roles: ['IMPORT_WORKER', 'EXPORT_WORKER', 'ADMIN', 'WORKER'] },
        { id: 'confirmed', label: 'Confirmed Operations', roles: ['OPS_MANAGER', 'ADMIN', 'WORKER'] },
        { id: 'payments', label: 'Paiements', roles: ['OPS_MANAGER', 'ADMIN', 'WORKER'] },
        { id: 'invoices', label: 'Factures', roles: ['OPS_MANAGER', 'ADMIN', 'WORKER'] },
        { id: 'clients', label: 'Clients & Groups', roles: ['OPS_MANAGER', 'ADMIN', 'WORKER'] },
        { id: 'tracteur', label: 'Tracteur', roles: ['OPS_MANAGER', 'ADMIN'] },
    ];
    
    const visibleNavItems = navItems.filter(item => item.roles.includes(role));

    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2>Kamuchi</h2>
                    <span className="badge">{role.replace('_', ' ')}</span>
                </div>
                <nav className="sidebar-nav">
                    {visibleNavItems.map(item => (
                        <a 
                            key={item.id}
                            href="#" 
                            className={`nav-item ${activeView === item.id ? 'active' : ''}`} 
                            onClick={() => setActiveView(item.id)}
                        >
                            {item.label}
                        </a>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <button onClick={onLogout} className="btn-secondary logout-btn">Logout</button>
                </div>
            </aside>

            <main className="main-content">
                <header className="topbar">
                    <h1>
                        {navItems.find(i => i.id === activeView)?.label || 'Dashboard'}
                    </h1>
                    <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <NotificationCenter role={role} />
                        <span>{user?.username || 'Worker Node'}</span>
                    </div>
                </header>

                <div className="content-area">
                    {activeView === 'logistics' || activeView === 'confirmed' ? (
                        <LogisticsDashboard isConfirmedView={activeView === 'confirmed'} user={user} />
                    ) : activeView === 'invoices' ? (
                        <InvoiceDashboard />
                    ) : activeView === 'payments' ? (
                        <PaymentDashboard />
                    ) : activeView === 'tracteur' ? (
                        <div className="workspace-full">
                            <TracteurTable user={user} />
                        </div>
                    ) : (
                        <div className="workspace-full">
                            <ClientManager user={user} />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default WorkerDashboard;
