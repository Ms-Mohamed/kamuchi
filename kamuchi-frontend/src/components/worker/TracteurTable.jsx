import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api';
import './TrackingTable.css';
import './LogisticsModal.css';

const TracteurTable = ({ user }) => {
    const isOpsManager = user?.role?.toUpperCase() === 'OPS_MANAGER' || user?.role?.toUpperCase() === 'ADMIN';
    const [data, setData] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        date: '',
        client: '',
        matricule: '',
        facture: '',
        trajetImport: '',
        trajetExport: '',
        autres: '',
        autoroute: '',
        gasoil: '',
        deplacement: '',
        salaire: '',
        lavage: '',
        huil: '',
        reparation: '',
        traite: '',
        amende: '',
        prix: '',
        customFields: []
    });

    const fetchTracteurs = async () => {
        try {
            const response = await apiFetch('/tracteurs');
            const result = await response.json();
            setData(Array.isArray(result) ? result : []);
        } catch (error) {
            console.error("Failed to fetch tracteurs:", error);
        }
    };

    useEffect(() => {
        if (!isOpsManager) return;
        fetchTracteurs();
    }, [isOpsManager]);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const method = editingId ? 'PUT' : 'POST';
            const payload = { ...formData, customFields: JSON.stringify(formData.customFields) };
            const res = await apiFetch(editingId ? `/tracteurs/${editingId}` : '/tracteurs', {
                method: method,
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setIsModalOpen(false);
                setEditingId(null);
                setFormData({
                    date: '', client: '', matricule: '', facture: '', trajetImport: '', trajetExport: '',
                    autres: '', autoroute: '', gasoil: '', deplacement: '', salaire: '',
                    lavage: '', huil: '', reparation: '', traite: '', amende: '', prix: '', customFields: []
                });
                fetchTracteurs();
            }
        } catch (error) {
            console.error("Failed to save tracteur:", error);
        }
    };

    const handleEditRow = (row) => {
        let parsedCustomFields = [];
        if (row.customFields) {
            try { parsedCustomFields = JSON.parse(row.customFields); } catch(e){}
        }
        setFormData({
            date: row.date || '',
            client: row.client || '',
            matricule: row.matricule || '',
            facture: row.facture || '',
            trajetImport: row.trajetImport || '',
            trajetExport: row.trajetExport || '',
            autres: row.autres !== null ? row.autres : '',
            autoroute: row.autoroute !== null ? row.autoroute : '',
            gasoil: row.gasoil !== null ? row.gasoil : '',
            deplacement: row.deplacement !== null ? row.deplacement : '',
            salaire: row.salaire !== null ? row.salaire : '',
            lavage: row.lavage !== null ? row.lavage : '',
            huil: row.huil !== null ? row.huil : '',
            reparation: row.reparation !== null ? row.reparation : '',
            traite: row.traite !== null ? row.traite : '',
            amende: row.amende !== null ? row.amende : '',
            prix: row.prix !== null ? row.prix : '',
            customFields: parsedCustomFields
        });
        setEditingId(row.id);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this record?")) return;
        try {
            await apiFetch(`/tracteurs/${id}`, { method: 'DELETE' });
            fetchTracteurs();
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    const handleOpenNewModal = () => {
        setEditingId(null);
        setFormData({
            date: '', client: '', matricule: '', facture: '', trajetImport: '', trajetExport: '',
            autres: '', autoroute: '', gasoil: '', deplacement: '', salaire: '',
            lavage: '', huil: '', reparation: '', traite: '', amende: '', prix: '', customFields: []
        });
        setIsModalOpen(true);
    };

    if (!isOpsManager) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}><h2>Access Denied. Ops Manager only.</h2></div>;
    }

    // Calculations
    const sumField = (field) => data.reduce((acc, row) => acc + (parseFloat(row[field]) || 0), 0);

    const totalEncaissement = sumField('prix');
    
    const chargeFields = ['autres', 'autoroute', 'gasoil', 'deplacement', 'salaire', 'lavage', 'huil', 'reparation', 'traite', 'amende'];
    let totalCharges = 0;
    chargeFields.forEach(f => {
        totalCharges += sumField(f);
    });

    const difference = totalEncaissement - totalCharges;

    return (
        <div className="table-container card">
            <div className="table-header">
                <h2>Tracteur Operations</h2>
                <div className="header-actions">
                    <button className="btn-primary" onClick={handleOpenNewModal}>+ New Record</button>
                </div>
            </div>

            <div className="table-scroll-wrapper" style={{ overflowX: 'auto' }}>
                <table className="tracking-table" style={{ minWidth: '1500px', fontSize: '0.85rem' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '80px' }}>Actions</th>
                            <th>Date</th>
                            <th>Client</th>
                            <th>Matricule</th>
                            <th>Facture</th>
                            <th>Trajet Import</th>
                            <th>Trajet Export</th>
                            <th>Autres</th>
                            <th>Autoroute</th>
                            <th>Gasoil</th>
                            <th>Deplacement</th>
                            <th>Salaire</th>
                            <th>Lavage</th>
                            <th>Huil</th>
                            <th>Réparation</th>
                            <th>Traite</th>
                            <th>Amende</th>
                            <th>PRIX</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row) => (
                            <tr key={row.id}>
                                <td className="actions-cell">
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => handleEditRow(row)}>✏️</button>
                                        <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => handleDelete(row.id)}>🗑️</button>
                                    </div>
                                </td>
                                <td>{row.date || '-'}</td>
                                <td>{row.client || '-'}</td>
                                <td>{row.matricule || '-'}</td>
                                <td>{row.facture || '-'}</td>
                                <td>{row.trajetImport || '-'}</td>
                                <td>{row.trajetExport || '-'}</td>
                                <td>{row.autres !== null ? row.autres : '-'}</td>
                                <td>{row.autoroute !== null ? row.autoroute : '-'}</td>
                                <td>{row.gasoil !== null ? row.gasoil : '-'}</td>
                                <td>{row.deplacement !== null ? row.deplacement : '-'}</td>
                                <td>{row.salaire !== null ? row.salaire : '-'}</td>
                                <td>{row.lavage !== null ? row.lavage : '-'}</td>
                                <td>{row.huil !== null ? row.huil : '-'}</td>
                                <td>{row.reparation !== null ? row.reparation : '-'}</td>
                                <td>{row.traite !== null ? row.traite : '-'}</td>
                                <td>{row.amende !== null ? row.amende : '-'}</td>
                                <td style={{ fontWeight: 'bold' }}>{row.prix !== null ? row.prix : '-'}</td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan="18" style={{ textAlign: 'center', padding: '1rem' }}>No records found.</td>
                            </tr>
                        )}
                        {/* Summary Row */}
                        <tr style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                            <td colSpan="7" style={{ textAlign: 'center' }}>TOTAL</td>
                            <td>{sumField('autres').toFixed(2)}</td>
                            <td>{sumField('autoroute').toFixed(2)}</td>
                            <td>{sumField('gasoil').toFixed(2)}</td>
                            <td>{sumField('deplacement').toFixed(2)}</td>
                            <td>{sumField('salaire').toFixed(2)}</td>
                            <td>{sumField('lavage').toFixed(2)}</td>
                            <td>{sumField('huil').toFixed(2)}</td>
                            <td>{sumField('reparation').toFixed(2)}</td>
                            <td>{sumField('traite').toFixed(2)}</td>
                            <td>{sumField('amende').toFixed(2)}</td>
                            <td>{totalEncaissement.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', gap: '2rem', justifyContent: 'flex-start' }}>
                <div style={{ backgroundColor: '#c8e6c9', padding: '1rem', borderRadius: '8px', minWidth: '250px', border: '1px solid #81c784' }}>
                    <div style={{ fontSize: '0.85rem', color: '#2e7d32', fontWeight: 'bold', marginBottom: '0.5rem' }}>TOTAL DES ENCAISSEMENT</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{totalEncaissement.toFixed(3)}</div>
                </div>
                <div style={{ backgroundColor: '#c8e6c9', padding: '1rem', borderRadius: '8px', minWidth: '250px', border: '1px solid #81c784' }}>
                    <div style={{ fontSize: '0.85rem', color: '#2e7d32', fontWeight: 'bold', marginBottom: '0.5rem' }}>TOTAL DES CHARGE</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{totalCharges.toFixed(3)}</div>
                </div>
                <div style={{ backgroundColor: '#c8e6c9', padding: '1rem', borderRadius: '8px', minWidth: '250px', border: '1px solid #81c784' }}>
                    <div style={{ fontSize: '0.85rem', color: '#2e7d32', fontWeight: 'bold', marginBottom: '0.5rem' }}>DIFFERENCE</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{difference.toFixed(3)}</div>
                </div>
            </div>

            {isModalOpen && (
                <div className="logistics-modal-overlay">
                    <div className="logistics-modal-content" style={{ maxWidth: '800px' }}>
                        <div className="logistics-modal-header">
                            <h2>{editingId ? 'Update Tracteur Record' : 'Add Tracteur Record'}</h2>
                            <button className="logistics-btn-close" onClick={() => setIsModalOpen(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="logistics-form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                            <div className="logistics-form-group">
                                <label>Date</label>
                                <input type="text" name="date" value={formData.date} onChange={handleFormChange} placeholder="e.g. 4-Apr" />
                            </div>
                            <div className="logistics-form-group">
                                <label>Client</label>
                                <input type="text" name="client" value={formData.client} onChange={handleFormChange} />
                            </div>
                            <div className="logistics-form-group">
                                <label>Matricule</label>
                                <input type="text" name="matricule" value={formData.matricule} onChange={handleFormChange} />
                            </div>
                            <div className="logistics-form-group">
                                <label>Facture</label>
                                <input type="text" name="facture" value={formData.facture} onChange={handleFormChange} />
                            </div>
                            <div className="logistics-form-group">
                                <label>Trajet Import</label>
                                <input type="text" name="trajetImport" value={formData.trajetImport} onChange={handleFormChange} />
                            </div>
                            <div className="logistics-form-group">
                                <label>Trajet Export</label>
                                <input type="text" name="trajetExport" value={formData.trajetExport} onChange={handleFormChange} />
                            </div>
                            
                            {/* Expenses */}
                            <div className="logistics-form-group">
                                <label>Autres</label>
                                <input type="number" step="any" name="autres" value={formData.autres} onChange={handleFormChange} />
                            </div>
                            <div className="logistics-form-group">
                                <label>Autoroute</label>
                                <input type="number" step="any" name="autoroute" value={formData.autoroute} onChange={handleFormChange} />
                            </div>
                            <div className="logistics-form-group">
                                <label>Gasoil</label>
                                <input type="number" step="any" name="gasoil" value={formData.gasoil} onChange={handleFormChange} />
                            </div>
                            <div className="logistics-form-group">
                                <label>Deplacement</label>
                                <input type="number" step="any" name="deplacement" value={formData.deplacement} onChange={handleFormChange} />
                            </div>
                            <div className="logistics-form-group">
                                <label>Salaire</label>
                                <input type="number" step="any" name="salaire" value={formData.salaire} onChange={handleFormChange} />
                            </div>
                            <div className="logistics-form-group">
                                <label>Lavage</label>
                                <input type="number" step="any" name="lavage" value={formData.lavage} onChange={handleFormChange} />
                            </div>
                            <div className="logistics-form-group">
                                <label>Huil</label>
                                <input type="number" step="any" name="huil" value={formData.huil} onChange={handleFormChange} />
                            </div>
                            <div className="logistics-form-group">
                                <label>Réparation</label>
                                <input type="number" step="any" name="reparation" value={formData.reparation} onChange={handleFormChange} />
                            </div>
                            <div className="logistics-form-group">
                                <label>Traite</label>
                                <input type="number" step="any" name="traite" value={formData.traite} onChange={handleFormChange} />
                            </div>
                            <div className="logistics-form-group">
                                <label>Amende</label>
                                <input type="number" step="any" name="amende" value={formData.amende} onChange={handleFormChange} />
                            </div>
                            
                            {/* Income */}
                            <div className="logistics-form-group" style={{ borderLeft: '3px solid #10b981', paddingLeft: '1rem' }}>
                                <label>PRIX (Encaissement)</label>
                                <input type="number" step="any" name="prix" value={formData.prix} onChange={handleFormChange} style={{ fontWeight: 'bold' }} />
                            </div>

                            <div style={{ gridColumn: '1 / -1', marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4 style={{ margin: 0, color: '#475569' }}>Custom Fields</h4>
                                    <button type="button" className="btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }} onClick={() => setFormData({ ...formData, customFields: [...formData.customFields, { name: '', value: '' }] })}>
                                        + Add Custom Field
                                    </button>
                                </div>
                                {formData.customFields.map((cf, index) => (
                                    <div key={index} style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', alignItems: 'center' }}>
                                        <input type="text" placeholder="Field Name (e.g. Driver Bonus)" style={{ flex: 1 }} value={cf.name} onChange={(e) => {
                                            const newFields = [...formData.customFields];
                                            newFields[index].name = e.target.value;
                                            setFormData({ ...formData, customFields: newFields });
                                        }} />
                                        <input type="text" placeholder="Value" style={{ flex: 1 }} value={cf.value} onChange={(e) => {
                                            const newFields = [...formData.customFields];
                                            newFields[index].value = e.target.value;
                                            setFormData({ ...formData, customFields: newFields });
                                        }} />
                                        <button type="button" className="btn-secondary" style={{ padding: '0.5rem', background: '#fee2e2', color: '#dc2626', border: 'none' }} onClick={() => {
                                            const newFields = formData.customFields.filter((_, i) => i !== index);
                                            setFormData({ ...formData, customFields: newFields });
                                        }}>🗑️</button>
                                    </div>
                                ))}
                            </div>

                            <div className="logistics-form-actions" style={{ gridColumn: '1 / -1', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TracteurTable;
