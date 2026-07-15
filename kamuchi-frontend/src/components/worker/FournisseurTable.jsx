import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import './TrackingTable.css';
import './LogisticsModal.css';
import { useModal } from '../common/ModalContext';
import { apiFetch, apiFetchJson } from '../../api';

const STATUS_COLORS = {
    'Unpaid': 'var(--status-not-started)',
    'Paid': 'var(--status-completed)',
    'Partial': 'var(--status-started)'
};

const FournisseurTable = () => {
    const [data, setData] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isNameModalOpen, setIsNameModalOpen] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');
    const [editingId, setEditingId] = useState(null);
    const scrollWrapperRef = useRef(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const initialScrollLeft = useRef(0);
    const { showAlert, showConfirm } = useModal();

    const [formData, setFormData] = useState({
        name: '',
        nm_facture: '',
        dateFacture: '',
        montant: '',
        datePaiement: '',
        status: 'Unpaid'
    });

    const [currencyMode, setCurrencyMode] = useState('MAD');

    const fetchFournisseurs = async () => {
        const data = await apiFetchJson('/fournisseurs', {}, []);
        setData(data);
    };

    const fetchSuppliers = async () => {
        const data = await apiFetchJson('/suppliers', {}, []);
        setSuppliers(data);
    };

    useEffect(() => {
        fetchFournisseurs();
        fetchSuppliers();
    }, []);

    const handleAddSupplierName = async (e) => {
        e.preventDefault();
        if (!newSupplierName.trim()) return;
        try {
            const res = await apiFetch('/suppliers', {
                method: 'POST',
                body: JSON.stringify({ name: newSupplierName })
            });
            if (res.ok) {
                setNewSupplierName('');
                fetchSuppliers();
            } else {
                showAlert("Error", "Supplier name might already exist.", "warning");
            }
        } catch (error) {
            console.error("Failed to add supplier name:", error);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            await apiFetch(`/fournisseurs/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
            fetchFournisseurs();
        } catch (error) {
            console.error("Failed to update status:", error);
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await showConfirm(
            'Delete Record', 
            'Are you sure you want to delete this record?',
            { confirmText: 'Delete', cancelText: 'Cancel' }
        );

        if (confirmed) {
            try {
                await apiFetch(`/fournisseurs/${id}`, { method: 'DELETE' });
                fetchFournisseurs();
            } catch (error) {
                console.error("Delete failed", error);
            }
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const toggleCurrency = (targetCurrency) => {
        const rate = 10.6;
        if (currencyMode === targetCurrency) return;

        const currentVal = parseFloat(formData.montant) || 0;
        const newVal = targetCurrency === 'MAD' ? (currentVal * rate).toFixed(2) : (currentVal / rate).toFixed(2);
        
        setFormData({ ...formData, montant: newVal });
        setCurrencyMode(targetCurrency);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData };
            if (payload.montant) payload.montant = parseFloat(payload.montant);

            // Auto-generate nm_facture if creating new
            if (!editingId && !payload.nm_facture) {
                payload.nm_facture = `FACT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            }

            const method = editingId ? 'PUT' : 'POST';
            const endpoint = editingId ? `/fournisseurs/${editingId}` : '/fournisseurs';

            const res = await apiFetch(endpoint, {
                method: method,
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setIsModalOpen(false);
                setEditingId(null);
                setFormData({
                    name: '', nm_facture: '', dateFacture: '', montant: '', datePaiement: '', status: 'Unpaid'
                });
                fetchFournisseurs();
            }
        } catch (error) {
            console.error("Failed to save fournisseur:", error);
        }
    };

    const handleOpenNewModal = () => {
        setEditingId(null);
        setFormData({
            name: '', nm_facture: '', dateFacture: '', montant: '', datePaiement: '', status: 'Unpaid'
        });
        setCurrencyMode('MAD');
        setIsModalOpen(true);
    };

    const handleEditRow = (row) => {
        setFormData({
            name: row.name || '',
            nm_facture: row.nm_facture || '',
            dateFacture: row.dateFacture || '',
            montant: row.montant !== null ? row.montant : '',
            datePaiement: row.datePaiement || '',
            status: row.status || 'Unpaid'
        });
        setCurrencyMode('MAD');
        setEditingId(row.id);
        setIsModalOpen(true);
    };

    const handleExportExcel = () => {
        const exportData = data.map(row => ({
            'Supplier': row.name,
            'Invoice No': row.nm_facture,
            'Invoice Date': row.dateFacture,
            'Amount': row.montant,
            'Payment Date': row.datePaiement,
            'Status': row.status
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Fournisseurs");
        XLSX.writeFile(wb, `Fournisseurs_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Horizontal scroll handlers (same as other tables)
    const handleMouseDown = (e) => {
        if (e.button === 2) {
            isDragging.current = true;
            startX.current = e.pageX - scrollWrapperRef.current.offsetLeft;
            initialScrollLeft.current = scrollWrapperRef.current.scrollLeft;
            scrollWrapperRef.current.style.cursor = 'grabbing';
        }
    };
    const handleMouseMove = (e) => {
        if (!isDragging.current) return;
        e.preventDefault();
        const x = e.pageX - scrollWrapperRef.current.offsetLeft;
        const walk = (x - startX.current);
        scrollWrapperRef.current.scrollLeft = initialScrollLeft.current - walk;
    };
    const handleMouseUp = () => {
        isDragging.current = false;
        if (scrollWrapperRef.current) scrollWrapperRef.current.style.cursor = 'ew-resize';
    };

    return (
        <div className="table-container card">
            <div className="table-header">
                <h2>Gestion des Fournisseurs</h2>
                <div className="header-actions">
                    <button className="btn-secondary" onClick={() => setIsNameModalOpen(true)}>🏢 Gérer les Fournisseurs</button>
                    <button className="btn-secondary" onClick={handleExportExcel}>📥 Export Excel</button>
                    <button className="btn-primary" onClick={handleOpenNewModal}>+ Nouveau Facture</button>
                </div>
            </div>

            <div 
                className="table-scroll-wrapper" 
                ref={scrollWrapperRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onContextMenu={(e) => e.preventDefault()}
            >
                <table className="tracking-table">
                    <thead>
                        <tr>
                            <th style={{ width: '100px' }}>Actions</th>
                            <th>Fournisseur</th>
                            <th>NM Facture</th>
                            <th>Date de Facture</th>
                            <th>Montant</th>
                            <th>Date Paiement</th>
                            <th style={{ width: '150px' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row) => (
                            <tr key={row.id}>
                                <td className="actions-cell">
                                    <div className="actions-flex-wrapper">
                                        <button className="btn-icon" onClick={() => handleEditRow(row)} title="Edit">✏️</button>
                                        <button className="btn-icon delete" onClick={() => handleDelete(row.id)} title="Delete">🗑️</button>
                                    </div>
                                </td>
                                <td><strong>{row.name}</strong></td>
                                <td>{row.nm_facture || '-'}</td>
                                <td>{row.dateFacture || '-'}</td>
                                <td style={{ textAlign: 'right', fontWeight: '600' }}>{row.montant !== null ? `${row.montant.toLocaleString()} MAD` : '-'}</td>
                                <td>{row.datePaiement || '-'}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <select 
                                        className="status-select"
                                        value={row.status}
                                        onChange={(e) => handleStatusChange(row.id, e.target.value)}
                                        style={{
                                            backgroundColor: STATUS_COLORS[row.status] || 'gray'
                                        }}
                                    >
                                        {Object.keys(STATUS_COLORS).map(status => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    Aucun fournisseur enregistré.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal for Supplier Names Management */}
            {isNameModalOpen && (
                <div className="logistics-modal-overlay">
                    <div className="logistics-modal-content" style={{ maxWidth: '500px' }}>
                        <div className="logistics-modal-header">
                            <h2>🏢 Liste des Fournisseurs</h2>
                            <button className="logistics-btn-close" onClick={() => setIsNameModalOpen(false)}>×</button>
                        </div>
                        <div style={{ padding: '1.5rem' }}>
                            <form onSubmit={handleAddSupplierName} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                <input 
                                    type="text" 
                                    placeholder="Nouveau nom de fournisseur..." 
                                    value={newSupplierName}
                                    onChange={(e) => setNewSupplierName(e.target.value)}
                                    style={{ flex: 1, padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                                />
                                <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>+ Ajouter</button>
                            </form>
                            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                                {suppliers.length > 0 ? suppliers.map(s => (
                                    <div key={s.id} style={{ padding: '0.8rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>{s.name}</span>
                                    </div>
                                )) : (
                                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Aucun fournisseur enregistré.</div>
                                )}
                            </div>
                        </div>
                        <div className="logistics-modal-footer" style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', textAlign: 'right' }}>
                            <button className="btn-secondary" onClick={() => setIsNameModalOpen(false)}>Fermer</button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="logistics-modal-overlay">
                    <div className="logistics-modal-content">
                        <div className="logistics-modal-header">
                            <h2>{editingId ? 'Modifier Facture Fournisseur' : 'Nouveau Facture'}</h2>
                            <button className="logistics-btn-close" onClick={() => setIsModalOpen(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="logistics-form-grid">
                            <div className="logistics-form-group full-width">
                                <label>Choisir le Fournisseur</label>
                                <select name="name" value={formData.name} onChange={handleFormChange} required>
                                    <option value="">-- Sélectionner un fournisseur --</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.name}>{s.name}</option>
                                    ))}
                                </select>
                                <p style={{ fontSize: '0.75rem', marginTop: '0.4rem', color: 'var(--text-secondary)' }}>
                                    💡 Vous ne trouvez pas le fournisseur ? Cliquez sur "Gérer les Fournisseurs" dans le tableau.
                                </p>
                            </div>
                            {/* NM Facture removed from view as it is auto-generated */}
                            <div className="logistics-form-group">
                                <label>Date de Facture</label>
                                <input type="date" name="dateFacture" value={formData.dateFacture} onChange={handleFormChange} />
                            </div>
                            <div className="logistics-form-group">
                                <label>Montant (MAD)</label>
                                <div className="currency-input-wrapper">
                                    <input type="number" name="montant" value={formData.montant} onChange={handleFormChange} />
                                    <div className="currency-actions">
                                        <button type="button" className={`currency-btn ${currencyMode === 'MAD' ? 'active' : ''}`} onClick={() => toggleCurrency('MAD')} title="Switch to MAD">🇲🇦</button>
                                        <button type="button" className={`currency-btn ${currencyMode === 'EUR' ? 'active' : ''}`} onClick={() => toggleCurrency('EUR')} title="Switch to EUR">🇪🇺</button>
                                    </div>
                                </div>
                            </div>
                            <div className="logistics-form-group">
                                <label>Date Paiement</label>
                                <input type="date" name="datePaiement" value={formData.datePaiement} onChange={handleFormChange} />
                            </div>
                            <div className="logistics-form-group full-width">
                                <label>Status</label>
                                <select name="status" value={formData.status} onChange={handleFormChange}>
                                    <option value="Unpaid">Unpaid</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Partial">Partial</option>
                                </select>
                            </div>
                            <div className="logistics-form-actions">
                                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Annuler</button>
                                <button type="submit" className="btn-primary">Enregistrer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FournisseurTable;
