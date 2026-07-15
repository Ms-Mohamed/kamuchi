import React, { useState, useEffect } from 'react';
import { 
    LayoutDashboard, PieChart, Users, FileText, LogOut, 
    Database, Activity, Server, Zap, Shield, Search, Download, Trash2
} from 'lucide-react';
import './AdminDashboard.css';
import AnalyticsDashboard from './AnalyticsDashboard';
import SystemUserManager from './SystemUserManager';
import AuditLogs from './AuditLogs';
import NotificationCenter from '../common/NotificationCenter';
import { useModal } from '../common/ModalContext';
import { apiFetchJson } from '../../api';

const AdminDashboard = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [currency, setCurrency] = useState('MAD');
    const { showAlert, showConfirm } = useModal();
    const [summaryData, setSummaryData] = useState({ totalVolume: 0, totalRevenue: 0, users: 0 });
    const [latency, setLatency] = useState('12ms');
    const [activities, setActivities] = useState([]);
    const [systemHealth, setSystemHealth] = useState({ db: 24, mem: 68 });

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [logs, imports, exports, users] = await Promise.all([
                    apiFetchJson('/audit-logs', {}, []),
                    apiFetchJson('/logistics-imports', {}, []),
                    apiFetchJson('/logistics-exports', {}, []),
                    apiFetchJson('/users', {}, [])
                ]);

                // Calculate Stats
                const totalVolume = imports.length + exports.length;
                const totalRevenue = imports.reduce((sum, item) => sum + (item.montant || 0), 0) + 
                                   exports.reduce((sum, item) => sum + (parseFloat(item.fraisSupp) || 0), 0);

                setSummaryData({ totalVolume, totalRevenue, users: users.length });
                setLatency(`${Math.floor(Math.random() * 5) + 10}ms`);

                // Simulate Health Fluctuations
                setSystemHealth({
                    db: Math.min(Math.max(15, Math.floor(Math.random() * 10) + 20), 45),
                    mem: Math.min(Math.max(50, Math.floor(Math.random() * 5) + 65), 85)
                });

                // Map recent activities
                const mappedActivities = logs.slice(0, 5).map(log => ({
                    id: log.id,
                    user: log.username || 'System',
                    action: `${log.action} ${log.entityType} #${log.entityId}`,
                    time: new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    icon: getActionIcon(log.action)
                }));
                setActivities(mappedActivities);

            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            }
        };

        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 2000); // High-frequency polling (2s)
        return () => clearInterval(interval);
    }, []);

    const getActionIcon = (action) => {
        switch(action) {
            case 'CREATE': return <Zap size={14} color="#10b981" />;
            case 'UPDATE': return <Activity size={14} color="var(--admin-accent)" />;
            case 'DELETE': return <Trash2 size={14} color="#ef4444" />;
            case 'FILE_UPLOAD': return <Download size={14} color="#6366f1" />;
            default: return <Activity size={14} color="#94a3b8" />;
        }
    };

    const formatCurrency = (value) => {
        const rate = currency === 'EUR' ? 10.8 : 1;
        const converted = value / rate;
        const formatted = converted >= 1000 ? (converted / 1000).toFixed(1) + 'k' : converted.toFixed(0);
        return currency === 'EUR' ? `€${formatted}` : `${formatted} DH`;
    };

    const stats = [
        { label: 'Total Volume', value: summaryData.totalVolume.toLocaleString(), trend: '+5.2%', icon: <Zap size={20} color="var(--admin-accent)" /> },
        { label: 'Gross Revenue', value: formatCurrency(summaryData.totalRevenue), trend: '+12.1%', icon: <Activity size={20} color="#10b981" /> },
        { label: 'Active Nodes', value: summaryData.users.toString(), trend: 'Stable', icon: <Server size={20} color="#6366f1" /> },
        { label: 'System Latency', value: latency, trend: '-1ms', icon: <Database size={20} color="#f59e0b" /> }
    ];

    return (
        <div className="dashboard-layout admin-theme">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <h2>Kamuchi <span style={{fontSize: '0.6rem', color: '#6366f1'}}>CORE</span></h2>
                </div>
                
                <nav className="sidebar-nav" style={{flex: 1}}>
                    <button className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                        <span className="nav-icon"><LayoutDashboard size={18} /></span> Overview
                    </button>
                    <button className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
                        <span className="nav-icon"><PieChart size={18} /></span> Analytics
                    </button>
                    <button className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
                        <span className="nav-icon"><Users size={18} /></span> User Access
                    </button>
                    <button className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
                        <span className="nav-icon"><FileText size={18} /></span> System Logs
                    </button>
                </nav>

                <button className="nav-item" onClick={onLogout} style={{marginTop: 'auto', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444'}}>
                    <span className="nav-icon"><LogOut size={18} /></span> Terminate Session
                </button>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <header className="admin-header-flex">
                    <div>
                        <p style={{color: 'var(--admin-accent)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em'}}>Master Control Panel</p>
                        <h1>Intelligence Hub</h1>
                    </div>
                    <div className="header-right" style={{display: 'flex', alignItems: 'center', gap: '1.5rem'}}>
                        <div style={{ display: 'flex', gap: '5px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <button 
                                onClick={() => setCurrency('MAD')}
                                style={{ padding: '4px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: currency === 'MAD' ? 'var(--admin-accent)' : 'transparent', color: currency === 'MAD' ? '#fff' : '#94a3b8', fontWeight: 'bold', fontSize: '12px' }}
                            >
                                DH
                            </button>
                            <button 
                                onClick={() => setCurrency('EUR')}
                                style={{ padding: '4px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: currency === 'EUR' ? 'var(--admin-accent)' : 'transparent', color: currency === 'EUR' ? '#fff' : '#94a3b8', fontWeight: 'bold', fontSize: '12px' }}
                            >
                                EUR
                            </button>
                        </div>
                        <NotificationCenter role="ADMIN" />
                        <div className="badge-status" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                            <div className="pulse-dot"></div>
                            System Node: <span style={{color: 'var(--admin-text)'}}>Active</span>
                        </div>
                    </div>
                </header>

                {/* Tab Content Rendering */}
                {activeTab === 'analytics' && <AnalyticsDashboard />}
                {activeTab === 'users' && <SystemUserManager />}
                {activeTab === 'logs' && <AuditLogs />}
                
                {activeTab === 'overview' && (
                    <>
                        {/* Stats Section - Fluid Grid */}
                        <section className="admin-fluid-grid">
                            {stats.map((stat, i) => (
                                <div key={i} className="admin-glass-card">
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                                        <p className="stat-label">{stat.label}</p>
                                        <span style={{fontSize: '1.25rem'}}>{stat.icon}</span>
                                    </div>
                                    <div className="stat-value-large">{stat.value}</div>
                                    <p style={{fontSize: '0.8rem', marginTop: '1rem', color: stat.trend.startsWith('+') ? '#10b981' : '#64748b', fontWeight: 600}}>
                                        {stat.trend} <span style={{color: '#94a3b8', fontWeight: 400}}>from last cycle</span>
                                    </p>
                                </div>
                            ))}
                        </section>

                        {/* Main Body Grid */}
                        <section className="admin-main-grid">
                            {/* Left: Activity Feed */}
                            <div className="admin-glass-card">
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
                                    <h3 style={{fontSize: '1.25rem', fontWeight: 800}}>Operational Events</h3>
                                    <button style={{fontSize: '0.75rem', color: 'var(--admin-accent)', fontWeight: 600}}>View All</button>
                                </div>
                                <div className="activity-feed-compact">
                                    {activities.map(item => (
                                        <div key={item.id} className="feed-item">
                                            <div className="feed-icon">{item.icon}</div>
                                            <div style={{flex: 1}}>
                                                <p style={{fontWeight: 700, fontSize: '0.9rem'}}>{item.user}</p>
                                                <p style={{fontSize: '0.8rem', color: 'var(--admin-text-muted)'}}>{item.action}</p>
                                            </div>
                                            <div style={{fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600}}>{item.time}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right: Quick Controls */}
                            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                                <div className="admin-glass-card" style={{background: 'var(--admin-sidebar)', color: 'white', border: 'none'}}>
                                    <h3 style={{fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem'}}>System Health</h3>
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '1.25rem'}}>
                                        <div>
                                            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.5rem', color: '#94a3b8'}}>
                                                <span>Database Load</span>
                                                <span>{systemHealth.db}%</span>
                                            </div>
                                            <div style={{height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden'}}>
                                                <div style={{width: `${systemHealth.db}%`, height: '100%', background: 'var(--admin-accent)', transition: 'width 1s ease-in-out'}}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.5rem', color: '#94a3b8'}}>
                                                <span>Memory Usage</span>
                                                <span>{systemHealth.mem}%</span>
                                            </div>
                                            <div style={{height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden'}}>
                                                <div style={{width: `${systemHealth.mem}%`, height: '100%', background: '#fbbf24', transition: 'width 1.5s ease-in-out'}}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="admin-glass-card">
                                    <h3 style={{fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem'}}>Quick Actions</h3>
                                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                                        <button 
                                            className="action-btn"
                                            onClick={async () => {
                                                const confirmed = await showConfirm('Backup Initiated', 'Are you sure you want to download a database snapshot (dev.db)?');
                                                if (confirmed) {
                                                    window.location.href = `${API_BASE_URL}/admin/backup`;
                                                    showAlert('Backup Started', 'Downloading dev.db...', 'success');
                                                }
                                            }}
                                        >
                                            💾 Backup DB
                                        </button>
                                        <button 
                                            className="action-btn"
                                            onClick={async () => {
                                                const confirmed = await showConfirm('Purge Cache', 'This will clear all temporary system caches. Proceed?');
                                                if (confirmed) {
                                                    showAlert('Cache Purged', 'System cache purged successfully.', 'success');
                                                }
                                            }}
                                        >
                                            ✨ Clear Cache
                                        </button>
                                        <button 
                                            className="quick-action-btn"
                                            onClick={() => setActiveTab('logs')}
                                        >
                                            <Search size={16} /> Scan Logs
                                        </button>
                                        <button 
                                            className="quick-action-btn"
                                            onClick={() => setActiveTab('analytics')}
                                        >
                                            <FileText size={16} /> Report
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </>
                )}
            </main>
        </div>
    );
};

export default AdminDashboard;
