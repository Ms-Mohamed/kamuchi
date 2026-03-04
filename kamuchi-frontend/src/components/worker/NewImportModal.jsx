import React, { useState, useEffect } from 'react';
import './NewImportModal.css';

const NewImportModal = ({ onClose, onImportCreated }) => {
    const [clients, setClients] = useState([]);
    const [formData, setFormData] = useState({
        clientId: '',
        matricule: '',
        location: '',
        dateEmbarque: '',
        exportador: '',
        destinateur: ''
    });

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/clients');
                const data = await res.json();
                setClients(data);
            } catch (err) {
                console.error('Failed to fetch clients for modal', err);
            }
        };
        fetchClients();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.clientId) {
            alert("Please select a client.");
            return;
        }

        const selectedClient = clients.find(c => c.id === Number(formData.clientId));
        if (!selectedClient) return;

        const importData = {
            ...formData,
            clientId: Number(formData.clientId),
            reference: selectedClient.reference,
            status: 'Not Started'
        };

        try {
            const res = await fetch('http://localhost:5000/api/imports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(importData)
            });

            if (res.ok) {
                const newImport = await res.json();
                onImportCreated(newImport);
                onClose();
            } else {
                alert('Error creating import.');
            }
        } catch (err) {
            console.error('Failed to create import', err);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content card">
                <h2>Create New Import</h2>
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label>Select Client:</label>
                        <select
                            required
                            value={formData.clientId}
                            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                        >
                            <option value="">-- Choose a Client --</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.reference} - {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Matricule:</label>
                        <input
                            type="text"
                            placeholder="e.g. 1234-A-50"
                            value={formData.matricule}
                            onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Location:</label>
                        <input
                            type="text"
                            placeholder="e.g. Zone Franche"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Date d'embarque:</label>
                        <input
                            type="date"
                            value={formData.dateEmbarque}
                            onChange={(e) => setFormData({ ...formData, dateEmbarque: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Exportador:</label>
                        <input
                            type="text"
                            placeholder="e.g. Acme Corp"
                            value={formData.exportador}
                            onChange={(e) => setFormData({ ...formData, exportador: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Destinateur:</label>
                        <input
                            type="text"
                            value={formData.destinateur}
                            onChange={(e) => setFormData({ ...formData, destinateur: e.target.value })}
                        />
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary">Create Import</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewImportModal;
