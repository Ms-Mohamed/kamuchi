import React, { useState, useEffect } from 'react';
import './ClientManager.css';
import { useModal } from '../common/ModalContext';
import { apiFetch, apiFetchJson } from '../../api';
import { Trash2 } from 'lucide-react';

const ClientManager = ({ user }) => {
    const isOpsManager = user?.role === 'OPS_MANAGER' || user?.role === 'ADMIN';
    const [clients, setClients] = useState([]);
    const { showAlert, showConfirm } = useModal();

    const [formData, setFormData] = useState({ reference: '', companyReference: '', name: '', operationCounter: 0 });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        const data = await apiFetchJson('/clients', {}, []);
        setClients(data);
        
        // Auto-update removed because references are now static bases (e.g. KAMU-KIM)
        // and operations will auto-increment from operationCounter.
    };

    const handleCreateClient = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                const res = await apiFetch(`/clients/${editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
                if (res.ok) {
                    const updatedClient = await res.json();
                    setClients(clients.map(c => c.id === editingId ? updatedClient : c));
                    setFormData({ reference: '', companyReference: '', name: '', operationCounter: 0 });
                    setEditingId(null);
                    showAlert('Success', 'Client updated successfully!', 'success');
                } else {
                    showAlert('Error', 'Error updating client.', 'warning');
                }
            } else {
                const res = await apiFetch('/clients', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                if (res.ok) {
                    const newClient = await res.json();
                    setClients([...clients, newClient]);
                    setFormData({ reference: '', companyReference: '', name: '', operationCounter: 0 });
                    showAlert('Success', 'Client created successfully!', 'success');
                } else {
                    showAlert('Error', 'Error creating client. Make sure the reference is unique.', 'warning');
                }
            }
        } catch (err) {
            console.error('Failed to save client', err);
        }
    };
    
    const handleEditClick = (client) => {
        setEditingId(client.id);
        setFormData({
            reference: client.reference || '',
            companyReference: client.companyReference || '',
            name: client.name || '',
            paymentTerms: client.paymentTerms || 30,
            operationCounter: client.operationCounter || 0
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteClient = async (id) => {
        const confirmed = await showConfirm(
            'Delete Client',
            'Are you sure you want to delete this client? This cannot be undone.',
            { confirmText: 'Delete', cancelText: 'Cancel' }
        );

        if (!confirmed) return;

        try {
            const res = await apiFetch(`/clients/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setClients(clients.filter(c => c.id !== id));
                showAlert('Success', 'Client deleted successfully.', 'success');
            } else {
                showAlert('Error', 'Failed to delete client.', 'error');
            }
        } catch (err) {
            console.error('Failed to delete client', err);
        }
    };

    return (
        <div className="client-manager-container">
            <div className="card client-form-card">
                <h2>{editingId ? 'Edit Existing Client' : 'Add New Client'}</h2>
                <form onSubmit={handleCreateClient} className="client-form">

                    <div className="form-group">
                        <label>Client Name:</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Acme Corp"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Static Client Code (e.g. KAMU-KIM):</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. KAMU-KIM"
                            value={formData.reference}
                            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Client's Own Unique Reference (Optional):</label>
                        <input
                            type="text"
                            placeholder="e.g. Tax ID or Custom Code"
                            value={formData.companyReference}
                            onChange={(e) => setFormData({ ...formData, companyReference: e.target.value })}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Last Used Number (e.g. 316):</label>
                        <input
                            type="number"
                            required
                            placeholder="e.g. 316"
                            value={formData.operationCounter}
                            onChange={(e) => setFormData({ ...formData, operationCounter: parseInt(e.target.value) || 0 })}
                        />
                        <small style={{display: 'block', marginTop: '4px', color: '#666'}}>
                            Next operation will be: {formData.reference || 'KAMU-XXXX'}{String((formData.operationCounter || 0) + 1).padStart(5, '0')}
                        </small>
                    </div>

                    {isOpsManager && (
                        <div className="form-group">
                            <label>Payment Terms (Days):</label>
                            <input
                                type="number"
                                required
                                placeholder="e.g. 45"
                                value={formData.paymentTerms || 30}
                                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                            />
                        </div>
                    )}

                    <div className="form-actions" style={{ display: 'flex', gap: '1rem' }}>
                        <button type="submit" className="btn-primary">{editingId ? 'Update Client' : 'Create Client'}</button>
                        {editingId && (
                            <button type="button" className="btn-secondary" onClick={() => {
                                setEditingId(null);
                                setFormData({ reference: '', companyReference: '', name: '', operationCounter: 0 });
                            }}>Cancel</button>
                        )}
                    </div>
                </form>
            </div>

            <div className="card client-list-card">
                <h2>Registered Clients</h2>
                <table className="tracking-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Company Ref</th>
                            <th>Static Code</th>
                            <th>Last Operation Ref</th>
                            <th>Payment Terms</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clients.length > 0 ? clients.map(client => (
                            <tr key={client.id}>
                                <td>{client.name}</td>
                                <td>{client.companyReference || '-'}</td>
                                <td><code>{client.reference}</code></td>
                                <td><strong>{client.reference}{String(client.operationCounter || 0).padStart(5, '0')}</strong></td>
                                <td>{client.paymentTerms} Days</td>
                                <td style={{ width: '120px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                    <button 
                                        className="btn-icon edit" 
                                        onClick={() => handleEditClick(client)}
                                        title="Edit Client"
                                        style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer' }}
                                    >
                                        ✏️
                                    </button>
                                    <button 
                                        className="btn-icon delete" 
                                        onClick={() => handleDeleteClient(client.id)}
                                        title="Delete Client"
                                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="1">No clients found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ClientManager;
