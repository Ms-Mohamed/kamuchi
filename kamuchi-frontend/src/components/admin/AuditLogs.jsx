import React, { useState, useEffect } from 'react';
import { History, User, Activity, Clock, ShieldCheck } from 'lucide-react';
import './AuditLogs.css';
import { API_BASE_URL } from '../../api';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                // We'll need a backend endpoint for this. I'll add it in server.js next.
                const res = await fetch(`${API_BASE_URL}/audit-logs`);
                if (res.ok) {
                    const data = await res.json();
                    setLogs(data);
                }
                setLoading(false);
            } catch (error) {
                console.error('Failed to fetch logs:', error);
            }
        };
        fetchLogs();
    }, []);

    if (loading) return <div className="logs-loading">Retrieving system security records...</div>;

    return (
        <div className="audit-logs-container">
            <header className="logs-header">
                <div className="header-title">
                    <ShieldCheck size={28} color="#0f3460" />
                    <div>
                        <h1>System Audit Trails</h1>
                        <p>Immutable record of all operational modifications</p>
                    </div>
                </div>
            </header>

            <div className="logs-table-wrapper card">
                <table className="audit-table">
                    <thead>
                        <tr>
                            <th><Clock size={14} /> Timestamp</th>
                            <th><User size={14} /> Actor</th>
                            <th><Activity size={14} /> Action</th>
                            <th>Entity</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length === 0 ? (
                            <tr><td colSpan="5" className="empty-logs">No activity recorded yet.</td></tr>
                        ) : (
                            logs.map(log => (
                                <tr key={log.id}>
                                    <td className="timestamp">{new Date(log.createdAt).toLocaleString()}</td>
                                    <td className="actor">
                                        <span className="actor-badge">{log.username || 'System'}</span>
                                    </td>
                                    <td>
                                        <span className={`action-badge ${log.action.toLowerCase()}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="entity">{log.entityType} #{log.entityId}</td>
                                    <td className="details">
                                        <div className="details-json">
                                            {log.details}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AuditLogs;
