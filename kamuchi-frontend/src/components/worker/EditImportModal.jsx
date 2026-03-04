import React, { useState } from 'react';
import './NewImportModal.css'; // Re-use the existing CSS since the form layout is identical

const EditImportModal = ({ importData, onClose, onImportUpdated }) => {
    // Initialize form with the passed importData. Use empty string for nulls to avoid React warnings.
    const [formData, setFormData] = useState({
        matricule: importData.matricule || '',
        location: importData.location || '',
        dateEmbarque: importData.dateEmbarque || '',
        exportador: importData.exportador || '',
        destinateur: importData.destinateur || '',
        prixAchat: importData.prixAchat || '',
        prixVente: importData.prixVente || '',
        tmsa: importData.tmsa || '',
        parking: importData.parking || '',
        mafi: importData.mafi || '',
        montantFacture: importData.montantFacture || ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const res = await fetch(`http://localhost:5000/api/imports/${importData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                const updatedImport = await res.json();
                onImportUpdated(updatedImport);
                onClose();
            } else {
                alert('Error updating import.');
            }
        } catch (err) {
            console.error('Failed to update import', err);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content card" style={{ maxWidth: '600px' }}>
                <h2>Edit Import: {importData.reference}</h2>
                <form onSubmit={handleSubmit} className="modal-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                    {/* Column 1 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="form-group">
                            <label>Matricule:</label>
                            <input
                                type="text"
                                value={formData.matricule}
                                onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Location:</label>
                            <input
                                type="text"
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
                    </div>

                    {/* Column 2 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="form-group">
                            <label>Prix Achat (Buying Price):</label>
                            <input
                                type="number"
                                value={formData.prixAchat}
                                onChange={(e) => setFormData({ ...formData, prixAchat: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Prix Vente (Selling Price):</label>
                            <input
                                type="number"
                                value={formData.prixVente}
                                onChange={(e) => setFormData({ ...formData, prixVente: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>TMSA:</label>
                            <input
                                type="number"
                                value={formData.tmsa}
                                onChange={(e) => setFormData({ ...formData, tmsa: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Parking:</label>
                            <input
                                type="number"
                                value={formData.parking}
                                onChange={(e) => setFormData({ ...formData, parking: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>MAFI:</label>
                            <input
                                type="number"
                                value={formData.mafi}
                                onChange={(e) => setFormData({ ...formData, mafi: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Full width row for actions */}
                    <div className="modal-actions" style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditImportModal;
