import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api';
import './TrackingTable.css';

const STATUS_COLORS = {
    'Unpaid': '#ef4444',
    'Paid': '#10b981',
    'Partial': '#f59e0b'
};

const blankClient = () => ({
    clientName: '',
    reference: '',
    invoiceNumber: `FL${Math.floor(1000 + Math.random() * 9000)}-${new Date().getFullYear()}`,
    dateFacture: new Date().toISOString().split('T')[0],
    montant: '',
    dueDate: '',
    paymentDetail: '',
    paymentDate: '',
    status: 'Unpaid',
    operationType: 'IMPORT',
    operationId: `MANUAL-${Date.now()}`
});

const blankSupplier = () => ({
    name: '',
    nm_facture: '',
    dateFacture: new Date().toISOString().split('T')[0],
    montant: '',
    datePaiement: '',
    status: 'Unpaid'
});

const PaymentDashboard = () => {
    const [activeTab, setActiveTab] = useState('clients');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newRow, setNewRow] = useState(null);
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const endpoint = activeTab === 'clients' ? '/invoices' : '/fournisseurs';
            const response = await apiFetch(endpoint);
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error("Failed to fetch payment data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        setNewRow(null);
    }, [activeTab]);

    const handleUpdate = async (id, field, value) => {
        try {
            const item = data.find(i => i.id === id);
            const endpoint = activeTab === 'clients' ? `/invoices/${id}` : `/fournisseurs/${id}`;

            const payload = activeTab === 'clients' ? {
                status: item.status,
                paymentDetail: item.paymentDetail,
                paymentDate: item.paymentDate,
                [field]: value
            } : {
                [field]: value
            };

            await apiFetch(endpoint, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            setData(data.map(i => i.id === id ? { ...i, ...payload } : i));
        } catch (error) {
            console.error("Update failed:", error);
        }
    };

    const handleSaveNewRow = async () => {
        if (!newRow) return;
        const isClient = activeTab === 'clients';
        const required = isClient ? newRow.clientName && newRow.reference : newRow.name;
        if (!required) {
            alert(isClient ? 'Client et référence requis.' : 'Nom du fournisseur requis.');
            return;
        }
        setSaving(true);
        try {
            const endpoint = isClient ? '/invoices' : '/fournisseurs';
            const payload = isClient
                ? { ...newRow, montant: parseFloat(newRow.montant) || 0 }
                : { ...newRow, montant: parseFloat(newRow.montant) || 0 };
            const res = await apiFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                await fetchData();
                setNewRow(null);
            } else {
                const err = await res.json();
                alert('Erreur: ' + (err.error || 'Sauvegarde échouée'));
            }
        } catch (error) {
            console.error("Save new row failed:", error);
        } finally {
            setSaving(false);
        }
    };

    const getCountdown = (dueDate, status) => {
        if (!dueDate || status === 'Paid') return null;
        const due = new Date(dueDate);
        const today = new Date();
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const setField = (field, value) => setNewRow(prev => ({ ...prev, [field]: value }));

    const colSpan = activeTab === 'clients' ? 10 : 8;

    return (
        <div className="workspace-full">
            <div className="workspace-header">
                <h2>💰 Suivi des Paiements</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <div className="tabs" style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            className={`btn ${activeTab === 'clients' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveTab('clients')}
                        >
                            Paiements Clients
                        </button>
                        <button
                            className={`btn ${activeTab === 'suppliers' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveTab('suppliers')}
                        >
                            Paiements Fournisseurs
                        </button>
                    </div>
                    {!newRow && (
                        <button
                            className="btn btn-primary"
                            style={{ marginLeft: 'auto' }}
                            onClick={() => setNewRow(activeTab === 'clients' ? blankClient() : blankSupplier())}
                        >
                            + Ajouter
                        </button>
                    )}
                </div>
            </div>

            <div className="workspace-content" style={{ marginTop: '1.5rem' }}>
                <div className="table-container card">
                    <div className="table-scroll-wrapper">
                        <table className="tracking-table">
                            <thead>
                                <tr>
                                    <th>{activeTab === 'clients' ? 'Client / Réf' : 'Fournisseur'}</th>
                                    <th>Détail de paiement</th>
                                    <th>nm_facture</th>
                                    <th>Date de facture</th>
                                    <th>Montant</th>
                                    {activeTab === 'clients' && <th>Échéance</th>}
                                    {activeTab === 'clients' && <th>Délai</th>}
                                    <th>Date paiement</th>
                                    <th style={{ width: '130px' }}>Status</th>
                                    <th style={{ width: '80px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* ── New row inline form ── */}
                                {newRow && (
                                    <tr style={{ background: '#f0f9ff', outline: '2px solid #3b82f6' }}>
                                        <td>
                                            {activeTab === 'clients' ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <input
                                                        type="text"
                                                        className="inline-edit-input"
                                                        placeholder="Nom client *"
                                                        value={newRow.clientName}
                                                        onChange={(e) => setField('clientName', e.target.value)}
                                                        autoFocus
                                                    />
                                                    <input
                                                        type="text"
                                                        className="inline-edit-input"
                                                        placeholder="Référence *"
                                                        value={newRow.reference}
                                                        onChange={(e) => setField('reference', e.target.value)}
                                                    />
                                                </div>
                                            ) : (
                                                <input
                                                    type="text"
                                                    className="inline-edit-input"
                                                    placeholder="Nom fournisseur *"
                                                    value={newRow.name}
                                                    onChange={(e) => setField('name', e.target.value)}
                                                    autoFocus
                                                />
                                            )}
                                        </td>
                                        <td>
                                            {activeTab === 'clients' && (
                                                <input
                                                    type="text"
                                                    className="inline-edit-input"
                                                    placeholder="Note..."
                                                    value={newRow.paymentDetail}
                                                    onChange={(e) => setField('paymentDetail', e.target.value)}
                                                />
                                            )}
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                className="inline-edit-input"
                                                placeholder="N° facture"
                                                value={activeTab === 'clients' ? newRow.invoiceNumber : newRow.nm_facture}
                                                onChange={(e) => setField(activeTab === 'clients' ? 'invoiceNumber' : 'nm_facture', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="date"
                                                className="inline-edit-input"
                                                value={newRow.dateFacture}
                                                onChange={(e) => setField('dateFacture', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                className="inline-edit-input"
                                                placeholder="0.00"
                                                value={newRow.montant}
                                                onChange={(e) => setField('montant', e.target.value)}
                                                style={{ textAlign: 'right' }}
                                            />
                                        </td>
                                        {activeTab === 'clients' && (
                                            <td>
                                                <input
                                                    type="date"
                                                    className="inline-edit-input"
                                                    value={newRow.dueDate}
                                                    onChange={(e) => setField('dueDate', e.target.value)}
                                                />
                                            </td>
                                        )}
                                        {activeTab === 'clients' && <td>—</td>}
                                        <td>
                                            <input
                                                type="date"
                                                className="inline-edit-input"
                                                value={activeTab === 'clients' ? newRow.paymentDate : newRow.datePaiement}
                                                onChange={(e) => setField(activeTab === 'clients' ? 'paymentDate' : 'datePaiement', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <select
                                                className="status-select"
                                                value={newRow.status}
                                                onChange={(e) => setField('status', e.target.value)}
                                                style={{ backgroundColor: STATUS_COLORS[newRow.status] || 'gray' }}
                                            >
                                                <option value="Unpaid">Unpaid</option>
                                                <option value="Paid">Paid</option>
                                                {activeTab === 'suppliers' && <option value="Partial">Partial</option>}
                                            </select>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <button
                                                onClick={handleSaveNewRow}
                                                disabled={saving}
                                                style={{
                                                    background: '#10b981', color: 'white',
                                                    border: 'none', borderRadius: '4px',
                                                    padding: '4px 8px', cursor: 'pointer',
                                                    fontWeight: '700', marginRight: '4px'
                                                }}
                                                title="Sauvegarder"
                                            >✓</button>
                                            <button
                                                onClick={() => setNewRow(null)}
                                                style={{
                                                    background: '#ef4444', color: 'white',
                                                    border: 'none', borderRadius: '4px',
                                                    padding: '4px 8px', cursor: 'pointer',
                                                    fontWeight: '700'
                                                }}
                                                title="Annuler"
                                            >×</button>
                                        </td>
                                    </tr>
                                )}

                                {loading ? (
                                    <tr><td colSpan={colSpan} style={{ textAlign: 'center', padding: '2rem' }}>Chargement...</td></tr>
                                ) : data.length === 0 && !newRow ? (
                                    <tr><td colSpan={colSpan} style={{ textAlign: 'center', padding: '2rem' }}>Aucun enregistrement trouvé.</td></tr>
                                ) : (
                                    data.map((row) => {
                                        const countdown = getCountdown(row.dueDate, row.status);
                                        return (
                                            <tr key={row.id}>
                                                <td>
                                                    <strong>{activeTab === 'clients' ? row.clientName : row.name}</strong>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                        {activeTab === 'clients' ? row.reference : ''}
                                                    </div>
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        className="inline-edit-input"
                                                        value={(row.paymentDetail) || ''}
                                                        placeholder="Note..."
                                                        onChange={(e) => setData(data.map(item => item.id === row.id ? { ...item, paymentDetail: e.target.value } : item))}
                                                        onBlur={(e) => handleUpdate(row.id, 'paymentDetail', e.target.value)}
                                                    />
                                                </td>
                                                <td>{activeTab === 'clients' ? row.invoiceNumber : row.nm_facture}</td>
                                                <td>{activeTab === 'clients' ? row.dateFacture : row.dateFacture}</td>
                                                <td style={{ textAlign: 'right', fontWeight: '600' }}>
                                                    {row.montant?.toLocaleString()} {activeTab === 'clients' ? '€' : 'MAD'}
                                                </td>
                                                {activeTab === 'clients' && (
                                                    <td style={{ fontWeight: '500' }}>{row.dueDate || '-'}</td>
                                                )}
                                                {activeTab === 'clients' && (
                                                    <td>
                                                        {countdown !== null ? (
                                                            <span style={{
                                                                color: countdown < 0 ? '#ef4444' : countdown <= 7 ? '#f59e0b' : '#10b981',
                                                                fontWeight: '700'
                                                            }}>
                                                                {countdown < 0 ? `Retard ${Math.abs(countdown)}j` : `${countdown} jours`}
                                                            </span>
                                                        ) : row.status === 'Paid' ? (
                                                            <span style={{ color: '#10b981', fontSize: '0.75rem' }}>Terminé</span>
                                                        ) : '-'}
                                                    </td>
                                                )}
                                                <td>
                                                    <input
                                                        type="date"
                                                        className="inline-edit-input"
                                                        value={(activeTab === 'clients' ? row.paymentDate : row.datePaiement) || ''}
                                                        onChange={(e) => setData(data.map(item => item.id === row.id ? { ...item, [activeTab === 'clients' ? 'paymentDate' : 'datePaiement']: e.target.value } : item))}
                                                        onBlur={(e) => handleUpdate(row.id, activeTab === 'clients' ? 'paymentDate' : 'datePaiement', e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <select
                                                        className="status-select"
                                                        value={row.status}
                                                        onChange={(e) => handleUpdate(row.id, 'status', e.target.value)}
                                                        style={{ backgroundColor: STATUS_COLORS[row.status] || 'gray' }}
                                                    >
                                                        <option value="Unpaid">Unpaid</option>
                                                        <option value="Paid">Paid</option>
                                                        {activeTab === 'suppliers' && <option value="Partial">Partial</option>}
                                                    </select>
                                                </td>
                                                <td></td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentDashboard;
