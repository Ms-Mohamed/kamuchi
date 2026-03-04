import React, { useState, useEffect } from 'react';
import './ClientManager.css';

const ClientManager = () => {
    const [clients, setClients] = useState([]);

    // Helper function to generate a random client reference
    const generateClientRef = () => {
        return 'CLI-' + Math.floor(1000 + Math.random() * 9000);
    };

    const [formData, setFormData] = useState({ reference: generateClientRef(), name: '', accessCode: '' });

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/clients');
            const data = await res.json();
            setClients(data);
        } catch (err) {
            console.error('Failed to fetch clients', err);
        }
    };

    const handleCreateClient = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:5000/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                const newClient = await res.json();
                setClients([...clients, newClient]);
                setFormData({ reference: generateClientRef(), name: '', accessCode: '' });
                alert('Client created successfully!');
            } else {
                alert('Error creating client. Make sure the reference is unique.');
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
                        <label>Client Reference (Auto-generated):</label>
                        <input
                            type="text"
                            required
                            readOnly
                            style={{ backgroundColor: 'var(--bg-lighter)', color: 'var(--text-muted)' }}
                            value={formData.reference}
                            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                        />
                    </div>
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
                        <label>Access Code (For Group Chat):</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. secret123"
                            value={formData.accessCode}
                            onChange={(e) => setFormData({ ...formData, accessCode: e.target.value })}
                        />
                    </div>
                    <button type="submit" className="btn-primary">Create Client</button>
                </form>
            </div>

            <div className="card client-list-card">
                <h2>Registered Clients</h2>
                <table className="tracking-table">
                    <thead>
                        <tr>
                            <th>Reference</th>
                            <th>Name</th>
                            <th>Access Code</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clients.length > 0 ? clients.map(client => (
                            <tr key={client.id}>
                                <td><strong>{client.reference}</strong></td>
                                <td>{client.name}</td>
                                <td>{client.accessCode}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan="3">No clients found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ClientManager;
