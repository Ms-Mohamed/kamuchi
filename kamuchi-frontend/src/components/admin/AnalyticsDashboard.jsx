import React, { useState, useEffect } from 'react';
import { 
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Package, CheckCircle, Clock, AlertTriangle, ArrowUpRight, DollarSign, ArrowDownRight, Activity } from 'lucide-react';
import './AnalyticsDashboard.css';
import { API_BASE_URL } from '../../api';

const AnalyticsDashboard = () => {
    const [currency, setCurrency] = useState('MAD');
    const [data, setData] = useState({ imports: [], exports: [] });
    const [financials, setFinancials] = useState({
        totalRevenue: 0,
        totalUnpaid: 0,
        totalExpenses: 0,
        tracteurExpenses: 0,
        fournisseurExpenses: 0,
        netProfit: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const [impRes, expRes, finRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/logistics-imports`),
                    fetch(`${API_BASE_URL}/logistics-exports`),
                    fetch(`${API_BASE_URL}/analytics/financials`)
                ]);
                const impData = await impRes.json();
                const expData = await expRes.json();
                const finData = await finRes.json();
                setData({ imports: impData, exports: expData });
                setFinancials(finData);
                setLoading(false);
            } catch (error) {
                console.error('Failed to fetch analytics:', error);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) return <div className="analytics-loading">Preparing your Command Center...</div>;

    // Data Processing
    const completedOps = [...data.imports, ...data.exports].filter(op => op.status === 'Completed').length;
    const pendingOps = [...data.imports, ...data.exports].filter(op => op.status !== 'Completed').length;

    const statusData = [
        { name: 'Completed', value: completedOps, color: '#10b981' },
        { name: 'In Progress', value: [...data.imports, ...data.exports].filter(op => op.status === 'Started').length, color: '#f59e0b' },
        { name: 'Not Started', value: [...data.imports, ...data.exports].filter(op => op.status === 'Not Started').length, color: '#6b7280' },
    ];

    const volumeData = [
        { name: 'Imports', value: data.imports.length },
        { name: 'Exports', value: data.exports.length }
    ];

    // Build trend data based on ops count per month
    const trendMap = {};
    const allOps = [...data.imports, ...data.exports];
    allOps.forEach(op => {
        const date = new Date(op.createdAt || Date.now());
        const monthYear = date.toLocaleString('default', { month: 'short' });
        if (!trendMap[monthYear]) trendMap[monthYear] = 0;
        trendMap[monthYear] += 1;
    });
    const trendData = Object.keys(trendMap).map(k => ({ month: k, operations: trendMap[k] }));

    const formatCurrency = (value) => {
        const rate = currency === 'EUR' ? 10.8 : 1;
        const converted = value / rate;
        
        const formatted = converted >= 1000 
            ? (converted / 1000).toFixed(1) + 'k'
            : converted.toFixed(0);
            
        return currency === 'EUR' ? `€${formatted}` : `${formatted} DH`;
    };

    return (
        <div className="analytics-container">
            <header className="analytics-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Operational Intelligence</h1>
                    <p>Real-time financial and logistics performance</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', background: '#f1f5f9', padding: '5px', borderRadius: '8px' }}>
                    <button 
                        onClick={() => setCurrency('MAD')}
                        style={{ padding: '5px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', background: currency === 'MAD' ? '#fff' : 'transparent', boxShadow: currency === 'MAD' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', fontWeight: currency === 'MAD' ? 'bold' : 'normal' }}
                    >
                        DH
                    </button>
                    <button 
                        onClick={() => setCurrency('EUR')}
                        style={{ padding: '5px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', background: currency === 'EUR' ? '#fff' : 'transparent', boxShadow: currency === 'EUR' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', fontWeight: currency === 'EUR' ? 'bold' : 'normal' }}
                    >
                        EUR
                    </button>
                </div>
            </header>

            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                <div className="stat-card" style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>NET PROFIT</h3>
                        <Activity size={18} color="#10b981" />
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '38px', fontWeight: '900', color: '#0f172a', letterSpacing: '-1px' }}>
                        {formatCurrency(financials.netProfit)}
                    </p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>+12.1%</span> from last cycle
                    </p>
                </div>
                
                <div className="stat-card" style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>GROSS REVENUE</h3>
                        <Activity size={18} color="#3b82f6" />
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '38px', fontWeight: '900', color: '#0f172a', letterSpacing: '-1px' }}>
                        {formatCurrency(financials.totalRevenue)}
                    </p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                        <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>+8.4%</span> from last cycle
                    </p>
                </div>

                <div className="stat-card" style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TOTAL EXPENSES</h3>
                        <Activity size={18} color="#f97316" />
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '38px', fontWeight: '900', color: '#0f172a', letterSpacing: '-1px' }}>
                        {formatCurrency(financials.totalExpenses)}
                    </p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                        <span style={{ color: '#f97316', fontWeight: 'bold' }}>+4.2%</span> from last cycle
                    </p>
                </div>

                <div className="stat-card" style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>UNPAID INVOICES</h3>
                        <Activity size={18} color="#ef4444" />
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '38px', fontWeight: '900', color: '#0f172a', letterSpacing: '-1px' }}>
                        {formatCurrency(financials.totalUnpaid)}
                    </p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>-2.1%</span> from last cycle
                    </p>
                </div>
            </div>

            <div className="charts-grid">
                <div className="chart-card large">
                    <h3>Operations Trend</h3>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorOps" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="operations" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOps)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-card">
                    <h3>Status Distribution</h3>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-card">
                    <h3>Import vs Export Volume</h3>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={volumeData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {volumeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#3282b8' : '#0f3460'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
