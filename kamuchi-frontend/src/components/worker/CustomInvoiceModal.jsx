import React, { useState, useEffect } from 'react';
import { apiFetch, apiFetchJson } from '../../api';
import './LogisticsModal.css';

const CustomInvoiceModal = ({ isOpen, onClose, onSuccess }) => {
    const [clients, setClients] = useState([]);
    const [formData, setFormData] = useState({
        clientName: '',
        dateFacture: new Date().toISOString().split('T')[0],
        extras: [{ label: '', value: '', ref: '' }]
    });
    const [currencyModes, setCurrencyModes] = useState({
        extras: ['MAD']
    });

    useEffect(() => {
        if (isOpen) {
            fetchClients();
            setFormData({
                clientName: '',
                dateFacture: new Date().toISOString().split('T')[0],
                extras: [{ label: '', value: '', ref: '' }]
            });
            setCurrencyModes({ extras: ['MAD'] });
        }
    }, [isOpen]);

    const fetchClients = async () => {
        try {
            const data = await apiFetchJson('/clients', {}, []);
            setClients(data);
        } catch (error) {
            console.error('Failed to fetch clients:', error);
        }
    };

    const handleExtraChange = (index, field, value) => {
        const newExtras = [...formData.extras];
        newExtras[index][field] = value;
        setFormData({ ...formData, extras: newExtras });
    };

    const addExtraRow = () => {
        setFormData({
            ...formData,
            extras: [...formData.extras, { label: '', value: '', ref: '' }]
        });
        setCurrencyModes({
            ...currencyModes,
            extras: [...currencyModes.extras, 'MAD']
        });
    };

    const removeExtraRow = (index) => {
        const newExtras = formData.extras.filter((_, i) => i !== index);
        const newCurrencyExtras = currencyModes.extras.filter((_, i) => i !== index);
        setFormData({ ...formData, extras: newExtras });
        setCurrencyModes({ ...currencyModes, extras: newCurrencyExtras });
    };

    const toggleCurrency = (index, targetCurrency) => {
        const rate = 10.6;
        const currentCurrency = currencyModes.extras[index];
        if (currentCurrency === targetCurrency) return;

        const newExtras = [...formData.extras];
        const currentValue = parseFloat(newExtras[index].value);

        if (!isNaN(currentValue)) {
            if (targetCurrency === 'EUR') {
                newExtras[index].value = (currentValue / rate).toFixed(2);
            } else {
                newExtras[index].value = (currentValue * rate).toFixed(2);
            }
        }

        const newCurrencyExtras = [...currencyModes.extras];
        newCurrencyExtras[index] = targetCurrency;

        setFormData({ ...formData, extras: newExtras });
        setCurrencyModes({ ...currencyModes, extras: newCurrencyExtras });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const RATE = 10.6;
        let totalMontant = 0; // We will track the total in MAD to save in DB? Wait, LogisticsInvoice recalculates from extras, but DB also stores a total `montant` for listing.

        const processedExtras = formData.extras.map((extra, idx) => {
            const val = parseFloat(extra.value) || 0;
            const currency = currencyModes.extras[idx];
            
            const storedValue = currency === 'EUR' ? val * RATE : val;
            totalMontant += storedValue; // Track total in MAD

            return {
                label: extra.label,
                ref: extra.ref,
                value: storedValue
            };
        });

        // The total montant for LogisticsInvoice calculation needs to be 0 for base price, but the database expects montant to be the total of the invoice.
        // Actually, if we set montant to `totalMontant`, LogisticsInvoice will add it as `Transport Internationale`!
        // To fix this, we can set `montant: 0` so the invoice renders perfectly.
        // However, `InvoiceListTable` displays `row.montant` directly in the listing. So if it's 0, the list will show 0 €.
        // Solution: In InvoiceListTable, we can check if it's CUSTOM, and display the calculated total, or we can save `montant` as the true total and just intercept it in `LogisticsInvoice.jsx`.
        // The safest way is to save `montant` as the real total (in EUR, since other invoices seem to store it in EUR... wait, LogisticsInvoice parses `data.montant` to EUR using `toEUR`).
        // Wait, if LogisticsInvoice converts `data.montant` to EUR, `data.montant` in DB is in MAD.
        // So we should save `montant: totalMontant` in MAD.
        
        const invoicePayload = {
            invoiceNumber: `FL${Math.floor(1000 + Math.random() * 9000)}-2026`,
            clientName: formData.clientName || 'Client Inconnu',
            reference: 'CUSTOM',
            dateFacture: formData.dateFacture,
            montant: totalMontant, // Total in MAD
            operationType: 'CUSTOM',
            operationId: JSON.stringify(processedExtras),
            status: 'Unpaid'
        };

        try {
            const res = await apiFetch('/invoices', {
                method: 'POST',
                body: JSON.stringify(invoicePayload)
            });
            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                console.error('Error creating custom invoice');
            }
        } catch (error) {
            console.error('Failed to create custom invoice', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="logistics-modal-overlay">
            <div className="logistics-modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="logistics-modal-header">
                    <h2>Nouvelle Facture</h2>
                    <button className="logistics-btn-close" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit} className="logistics-form-grid">
                        
                        <div className="logistics-form-group">
                            <label>Client</label>
                            <select 
                                required
                                value={formData.clientName} 
                                onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                            >
                                <option value="">Select a client...</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="logistics-form-group">
                            <label>Date de Facture</label>
                            <input 
                                type="date" 
                                required
                                value={formData.dateFacture} 
                                onChange={(e) => setFormData({...formData, dateFacture: e.target.value})}
                            />
                        </div>

                        <div className="logistics-form-group full-width" style={{ marginTop: '2rem' }}>
                            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                Détails de la facture
                                <button type="button" className="btn-add-extra" onClick={addExtraRow}>+ Add Fee</button>
                            </label>
                            
                            <div className="extras-list">
                                {formData.extras.map((extra, index) => (
                                    <div key={index} className="extra-row fade-in" style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                        <input 
                                            type="text" 
                                            required
                                            placeholder="Description" 
                                            value={extra.label} 
                                            onChange={(e) => handleExtraChange(index, 'label', e.target.value)}
                                            style={{ flex: 2 }}
                                        />
                                        <input 
                                            type="text" 
                                            placeholder="Ref #" 
                                            value={extra.ref} 
                                            onChange={(e) => handleExtraChange(index, 'ref', e.target.value)}
                                            style={{ flex: 1.5 }}
                                        />
                                        <div className="currency-input-wrapper" style={{ flex: 2, display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                            <input 
                                                type="number" 
                                                required
                                                placeholder={`Price (${currencyModes.extras[index]})`} 
                                                value={extra.value} 
                                                onChange={(e) => handleExtraChange(index, 'value', e.target.value)}
                                                style={{ width: '100%', border: 'none', background: 'transparent', padding: '8px' }}
                                            />
                                            <div className="currency-actions" style={{ display: 'flex' }}>
                                                <button type="button" className={`currency-btn ${currencyModes.extras[index] === 'MAD' ? 'active' : ''}`} onClick={() => toggleCurrency(index, 'MAD')} title="Switch to MAD" style={{ padding: '4px 8px', border: 'none', background: currencyModes.extras[index] === 'MAD' ? '#e2e8f0' : 'transparent', cursor: 'pointer' }}>🇲🇦</button>
                                                <button type="button" className={`currency-btn ${currencyModes.extras[index] === 'EUR' ? 'active' : ''}`} onClick={() => toggleCurrency(index, 'EUR')} title="Switch to EUR" style={{ padding: '4px 8px', border: 'none', background: currencyModes.extras[index] === 'EUR' ? '#e2e8f0' : 'transparent', cursor: 'pointer' }}>🇪🇺</button>
                                            </div>
                                        </div>
                                        <button type="button" className="btn-remove-extra" onClick={() => removeExtraRow(index)} style={{ padding: '0 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>×</button>
                                    </div>
                                ))}
                            </div>
                        </div>

                    <div className="logistics-form-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>Annuler</button>
                        <button type="submit" className="btn-primary">Générer Facture</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomInvoiceModal;
