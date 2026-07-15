import React, { useState, useEffect } from 'react';
import { useModal } from '../common/ModalContext';
import { apiFetch, apiFetchJson } from '../../api';

const SystemUserManager = () => {
    const [users, setUsers] = useState([]);
    const [newUsername, setNewUsername] = useState('');
    const [newRole, setNewRole] = useState('WORKER');
    const [loading, setLoading] = useState(false);
    const { showAlert, showConfirm } = useModal();

    const fetchUsers = async () => {
        const data = await apiFetchJson('/users', {}, []);
        setUsers(data);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!newUsername.trim()) return;

        setLoading(true);
        try {
            const res = await apiFetch('/users', {
                method: 'POST',
                body: JSON.stringify({ username: newUsername, role: newRole })
            });

            if (res.ok) {
                setNewUsername('');
                fetchUsers();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRole = async (userId, currentRole) => {
        const nextRole = currentRole === 'ADMIN' ? 'WORKER' : 'ADMIN';
        const confirmed = await showConfirm(
            'Change Permission', 
            `Are you sure you want to change this user's role to ${nextRole}?`,
            { confirmText: 'Change Role' }
        );
        
        if (!confirmed) return;

        try {
            const res = await apiFetch(`/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify({ role: nextRole })
            });
            if (res.ok) fetchUsers();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteUser = async (userId) => {
        const confirmed = await showConfirm(
            'Terminate Access', 
            'This will permanently delete this user and all associated permissions. Proceed?',
            { confirmText: 'Terminate User', cancelText: 'Keep User' }
        );

        if (!confirmed) return;

        try {
            const res = await apiFetch(`/users/${userId}`, { method: 'DELETE' });
            if (res.ok) fetchUsers();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="system-user-manager fade-in">
            <div className="workspace-card" style={{marginBottom: '2rem'}}>
                <div className="admin-card-header">
                    <h3>Add System Operator</h3>
                    <p style={{fontSize: '0.85rem', color: 'var(--admin-text-muted)'}}>Grant administrative or worker access</p>
                </div>
                <form onSubmit={handleCreateUser} className="inline-form" style={{display: 'flex', gap: '1.25rem', marginTop: '0.5rem', alignItems: 'flex-end'}}>
                    <div className="form-group" style={{flex: 1}}>
                        <label style={{marginBottom: '0.5rem', display: 'block', fontWeight: 600, fontSize: '0.85rem'}}>Username</label>
                        <input 
                            type="text" 
                            value={newUsername} 
                            onChange={(e) => setNewUsername(e.target.value)}
                            placeholder="e.g. jdoe_worker"
                            style={{width: '100%'}}
                        />
                    </div>
                    <div className="form-group" style={{width: '240px'}}>
                        <label style={{marginBottom: '0.5rem', display: 'block', fontWeight: 600, fontSize: '0.85rem'}}>Permission Level</label>
                        <select value={newRole} onChange={(e) => setNewRole(e.target.value)} style={{width: '100%'}}>
                            <option value="WORKER">Worker Node</option>
                            <option value="ADMIN">System Administrator</option>
                        </select>
                    </div>
                    <button type="submit" className="btn-primary" disabled={loading} style={{height: '46px', padding: '0 2rem'}}>
                        {loading ? 'Processing...' : 'Deploy User'}
                    </button>
                </form>
            </div>

            <div className="workspace-card">
                <div className="admin-card-header">
                    <h3>Registered Operators</h3>
                    <span style={{fontSize: '0.8rem', padding: '0.25rem 0.75rem', background: '#f1f5f9', borderRadius: '6px', fontWeight: 600}}>{users.length} Total</span>
                </div>
                <div className="table-wrapper" style={{marginTop: '1.5rem'}}>
                    <table className="tracking-table">
                        <thead>
                            <tr>
                                <th>Identity</th>
                                <th>Privilege</th>
                                <th>Registration Date</th>
                                <th style={{textAlign: 'right'}}>Control</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                                            <div style={{width: '32px', height: '32px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', border: '1px solid #e2e8f0'}}>
                                                {u.username.charAt(0).toUpperCase()}
                                            </div>
                                            <strong>{u.username}</strong>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-pill ${u.role === 'ADMIN' ? 'status-delivered' : 'status-in-transit'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td style={{color: 'var(--admin-text-muted)'}}>{new Date(u.createdAt).toLocaleDateString()}</td>
                                    <td style={{textAlign: 'right'}}>
                                        <button 
                                            className="btn-secondary" 
                                            style={{marginRight: '0.75rem', fontSize: '0.75rem', fontWeight: 700, padding: '0.5rem 1rem', borderColor: 'var(--primary-blue)', color: 'var(--primary-blue)'}}
                                            onClick={async () => {
                                                const res = await apiFetch(`/users/${u.id}/generate-recovery`, { method: 'POST' });
                                                if (res.ok) {
                                                    const data = await res.json();
                                                    showAlert(
                                                        'Security Access Code', 
                                                        data.recoveryCode,
                                                        'success'
                                                    );
                                                }
                                            }}
                                        >
                                            🔒 Get Code
                                        </button>
                                        <button 
                                            className="btn-secondary" 
                                            style={{marginRight: '0.75rem', fontSize: '0.75rem', fontWeight: 700, padding: '0.5rem 1rem'}}
                                            onClick={() => handleUpdateRole(u.id, u.role)}
                                        >
                                            Switch Role
                                        </button>
                                        <button 
                                            className="btn-secondary" 
                                            style={{color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, padding: '0.5rem 1rem'}}
                                            onClick={() => handleDeleteUser(u.id)}
                                        >
                                            Terminate
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SystemUserManager;
