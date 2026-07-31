import React, { useState, useEffect } from 'react';
import './ClientManager.css';
import { useModal } from '../common/ModalContext';
import { apiFetch, apiFetchJson } from '../../api';
import { Trash2 } from 'lucide-react';

const ClientManager = ({ user }) => {
    const isOpsManager = user?.role === 'OPS_MANAGER' || user?.role === 'ADMIN';
    const [clients, setClients] = useState([]);
    const { showAlert, showConfirm } = useModal();

    // Helper function to generate a random client reference
    const generateClientRef = () => {
        return 'CLI-' + Math.floor(1000 + Math.random() * 9000);
    };

    const [formData, setFormData] = useState({ reference: generateClientRef(), name: '' });

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        const data = await apiFetchJson('/clients', {}, []);
        setClients(data);
    };

    const handleCreateClient = async (e) => {
        e.preventDefault();
        try {
            const res = await apiFetch('/clients', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                const newClient = await res.json();
                setClients([...clients, newClient]);
                setFormData({ reference: generateClientRef(), name: '' });
                showAlert('Success', 'Client created successfully!', 'success');
            } else {
                showAlert('Error', 'Error creating client. Make sure the reference is unique.', 'warning');
            }
        } catch (err) {
            console.error('Failed to create client', err);
        }
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
                <h2>Add New Client</h2>
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

                    <button type="submit" className="btn-primary">Create Client</button>
                </form>
            </div>

            <div className="card client-list-card">
                <h2>Registered Clients</h2>
                <table className="tracking-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Reference</th>
                            <th>Payment Terms</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clients.length > 0 ? clients.map(client => (
                            <tr key={client.id}>
                                <td>{client.name}</td>
                                <td><code>{client.reference}</code></td>
                                <td>{client.paymentTerms} Days</td>
                                <td style={{ width: '80px', textAlign: 'center' }}>
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
