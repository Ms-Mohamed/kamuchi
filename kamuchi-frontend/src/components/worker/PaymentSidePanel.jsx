import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api';
import './TrackingTable.css';

const STATUS_COLORS = {
    'Unpaid': '#ef4444',
    'Paid': '#10b981',
};

const PaymentSidePanel = ({ operation, operationType, onClose }) => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const response = await apiFetch('/invoices');
            const allInvoices = await response.json();
            
            // Filter invoices by this specific operation
            const filtered = allInvoices.filter(inv => 
                inv.operationId === operation.id.toString() && 
                inv.operationType === operationType
            );
            
            setInvoices(filtered);
        } catch (error) {
            console.error("Failed to fetch invoices:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (operation) {
            fetchInvoices();
        }
    }, [operation, operationType]);

    const handleUpdateInvoice = async (id, field, value) => {
        try {
            const invoice = invoices.find(inv => inv.id === id);
            const payload = {
                status: invoice.status,
                paymentDetail: invoice.paymentDetail,
                paymentDate: invoice.paymentDate,
                paymentType: invoice.paymentType,
                [field]: value
            };
            
            await apiFetch(`/invoices/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            
            // Optimistic update
            setInvoices(invoices.map(inv => inv.id === id ? { ...inv, ...payload } : inv));
        } catch (error) {
            console.error("Failed to update invoice:", error);
        }
    };

    if (!operation) return null;

    return (
        <div className="side-panel">
            <div className="side-panel-header">
                <h3>💰 Détails de paiement</h3>
                <button className="close-panel-btn" onClick={onClose}>×</button>
            </div>
            
            <div className="side-panel-content">
                <div style={{ marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Opération</p>
                    <p style={{ fontWeight: '700', fontSize: '1.1rem' }}>{operation.reference}</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{operation.clientName}</p>
                </div>

                {loading ? (
                    <p>Chargement...</p>
                ) : invoices.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '8px' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Aucune facture trouvée pour cette opération.</p>
                    </div>
                ) : (
                    <div className="payment-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {invoices.map(invoice => (
                            <div key={invoice.id} className="card" style={{ padding: '1rem', border: '1px solid var(--border-light)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Facture No</p>
                                        <p style={{ fontWeight: '600' }}>{invoice.invoiceNumber}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Montant</p>
                                        <p style={{ fontWeight: '700', color: 'var(--primary-blue)' }}>{invoice.montant.toLocaleString()} €</p>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Date Facture</label>
                                        <p style={{ fontSize: '0.85rem' }}>{invoice.dateFacture}</p>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Status</label>
                                        <select 
                                            className="status-select"
                                            value={invoice.status}
                                            onChange={(e) => handleUpdateInvoice(invoice.id, 'status', e.target.value)}
                                            style={{
                                                backgroundColor: STATUS_COLORS[invoice.status] || 'gray',
                                                padding: '4px 20px 4px 10px',
                                                fontSize: '0.75rem',
                                                minWidth: '100px'
                                            }}
                                        >
                                            <option value="Unpaid">Unpaid</option>
                                            <option value="Paid">Paid</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '0.75rem' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Mode de paiement</label>
                                    <select
                                        className="inline-edit-input"
                                        value={invoice.paymentType || ''}
                                        onChange={(e) => handleUpdateInvoice(invoice.id, 'paymentType', e.target.value)}
                                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                                    >
                                        <option value="">— Sélectionner —</option>
                                        <option value="Cheque">Chèque</option>
                                        <option value="Espece">Espèces</option>
                                        <option value="Virement">Virement</option>
                                    </select>
                                </div>

                                <div style={{ marginBottom: '0.5rem' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Détail de paiement</label>
                                    <input
                                        type="text"
                                        className="inline-edit-input"
                                        value={invoice.paymentDetail || ''}
                                        placeholder="Note de paiement..."
                                        onBlur={(e) => handleUpdateInvoice(invoice.id, 'paymentDetail', e.target.value)}
                                        onChange={(e) => setInvoices(invoices.map(inv => inv.id === invoice.id ? { ...inv, paymentDetail: e.target.value } : inv))}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Date Paiement</label>
                                    <input 
                                        type="date"
                                        className="inline-edit-input"
                                        value={invoice.paymentDate || ''}
                                        onBlur={(e) => handleUpdateInvoice(invoice.id, 'paymentDate', e.target.value)}
                                        onChange={(e) => setInvoices(invoices.map(inv => inv.id === invoice.id ? { ...inv, paymentDate: e.target.value } : inv))}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentSidePanel;
