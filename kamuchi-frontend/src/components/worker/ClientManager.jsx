import React, { useState, useEffect } from 'react';
import './ClientManager.css';
import { useModal } from '../common/ModalContext';
import { API_BASE_URL } from '../../api';

const ClientManager = ({ user }) => {
    const isOpsManager = user?.role === 'OPS_MANAGER' || user?.role === 'ADMIN';
    const [clients, setClients] = useState([]);
    const { showAlert } = useModal();

    // Helper function to generate a random client reference
    const generateClientRef = () => {
        return 'CLI-' + Math.floor(1000 + Math.random() * 9000);
    };

    const [formData, setFormData] = useState({ reference: generateClientRef(), name: '' });

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/clients`);
            const data = await res.json();
            setClients(data);
        } catch (err) {
            console.error('Failed to fetch clients', err);
        }
    };

    const handleCreateClient = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE_URL}/clients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
                        </tr>
                    </thead>
                    <tbody>
                        {clients.length > 0 ? clients.map(client => (
                            <tr key={client.id}>
                                <td>{client.name}</td>
                                <td><code>{client.reference}</code></td>
                                <td>{client.paymentTerms} Days</td>
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
