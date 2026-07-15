import React, { useState, useEffect } from 'react';
import { apiFetch, UPLOAD_BASE_URL } from '../../api';
import './LogisticsInvoice.css';

const FILE_TYPES = ['CMR', 'TO'];

const LogisticsInvoice = ({ data, onClose }) => {
    const [documents, setDocuments] = useState([]);
    const [selectedTypes, setSelectedTypes] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(false);

    useEffect(() => {
        if (!data) return;
        const opType = data.operationType || 'IMPORT';
        const opId = data.operationId || data.id;
        if (!opId) return;

        const fetchDocs = async () => {
            setLoadingDocs(true);
            try {
                const res = await apiFetch(`/logistics-documents/${opType}/${opId}`);
                if (res.ok) {
                    const all = await res.json();
                    setDocuments(all.filter(d => FILE_TYPES.includes(d.documentType)));
                }
            } catch (e) {
                console.error('Failed to fetch documents for invoice', e);
            } finally {
                setLoadingDocs(false);
            }
        };

        fetchDocs();
    }, [data?.operationType, data?.operationId, data?.id]);

    if (!data) return null;

    const today = data.dateFacture || new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

    const invoiceNumber = data.invoiceNumber || `FL${Math.floor(1000 + Math.random() * 9000)}-2026`;

    // ── Calculation Logic ──
    const RATE = 10.6;
    const toEUR = (mad) => (parseFloat(mad) || 0) / RATE;

    const lineItems = [];
    let grandTotalEUR = 0;

    // 1. Base Transport
    const basePriceEUR = toEUR(data.montant);
    lineItems.push({
        label: `Transport Internationale : ${data.chargement || data.trajet || '...'} - ${data.dechargement || '...'}`,
        price: basePriceEUR
    });
    grandTotalEUR += basePriceEUR;

    // 2. Red Code
    if (data.redCode && data.redCodePrice) {
        const rcPriceEUR = toEUR(data.redCodePrice);
        lineItems.push({ label: `Service : ${data.redCode}`, price: rcPriceEUR });
        grandTotalEUR += rcPriceEUR;
    }

    // 3. Visite
    if (data.visite) {
        const visitePriceEUR = toEUR(40);
        lineItems.push({ label: `Visite : ${data.visite}`, price: visitePriceEUR });
        grandTotalEUR += visitePriceEUR;
    }

    // T6BIS
    if (data.t6bisPrix) {
        const t6bisPriceEUR = parseFloat(data.t6bisPrix) || 0;
        lineItems.push({ label: `T6BIS (${data.t6bisDays || 0} days)`, price: t6bisPriceEUR });
        grandTotalEUR += t6bisPriceEUR;
    }

    // 4. Extras / Frais Supp
    let extras = [];
    try {
        if (typeof data.extras === 'string' && data.extras.startsWith('[')) extras = JSON.parse(data.extras);
        else if (Array.isArray(data.extras)) extras = data.extras;
        else if (typeof data.fraisSupp === 'string' && data.fraisSupp.startsWith('[')) extras = JSON.parse(data.fraisSupp);
        else if (Array.isArray(data.fraisSupp)) extras = data.fraisSupp;
    } catch (e) {
        console.error('Extras parse error', e);
    }

    extras.forEach(item => {
        const itemPriceEUR = toEUR(item.value);
        lineItems.push({ label: item.label || 'Frais Supplémentaires', price: itemPriceEUR });
        grandTotalEUR += itemPriceEUR;
    });

    const handlePrint = () => window.print();

    const countByType = (type) => documents.filter(d => d.documentType === type).length;

    const toggleType = (type) => {
        setSelectedTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const docsToShow = documents.filter(d => selectedTypes.includes(d.documentType));

    return (
        <div className="invoice-overlay">
            {/* ── Controls bar (no-print) ── */}
            <div className="invoice-actions no-print">
                <div className="invoice-file-selector">
                    <span className="file-selector-label">Joindre fichiers :</span>
                    {FILE_TYPES.map(type => {
                        const count = countByType(type);
                        const checked = selectedTypes.includes(type);
                        return (
                            <label
                                key={type}
                                className={`file-type-checkbox ${checked ? 'checked' : ''} ${count === 0 ? 'disabled' : ''}`}
                                title={count === 0 ? `Aucun fichier ${type} disponible` : `${count} fichier(s) ${type}`}
                            >
                                <input
                                    type="checkbox"
                                    disabled={count === 0 || loadingDocs}
                                    checked={checked}
                                    onChange={() => toggleType(type)}
                                />
                                {type}
                                {count > 0 && <span className="file-count-badge">{count}</span>}
                            </label>
                        );
                    })}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn-primary" onClick={handlePrint}>Print</button>
                    <button className="btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>

            {/* ── Invoice paper ── */}
            <div className="invoice-paper">
                <header className="invoice-header">
                    <div className="logo-section">
                        <h1>KAMUCHI TRANS</h1>
                        <p>Transport & Logistique</p>
                    </div>
                    <div className="company-contact">
                        <p>Rue Dr Faraj Imm. Jinane Etage 09 N°51</p>
                        <p>Tanger, Maroc</p>
                        <p>contact@kamuchitrans.com</p>
                    </div>
                </header>

                <section className="invoice-info-grid">
                    <div className="client-block">
                        <h3>Client</h3>
                        <p className="client-name">{data.clientName || 'Client'}</p>
                        <p className="client-details">
                            {data.reference ? `Ref: ${data.reference}` : ''}
                        </p>
                    </div>
                    <div className="meta-block">
                        <div className="meta-row">
                            <span className="meta-label">Invoice</span>
                            <span className="meta-value">{invoiceNumber}</span>
                        </div>
                        <div className="meta-row">
                            <span className="meta-label">Date</span>
                            <span className="meta-value">{today}</span>
                        </div>
                    </div>
                </section>

                <table className="items-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th style={{ textAlign: 'right' }}>Amount (EUR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lineItems.map((item, idx) => (
                            <tr key={idx}>
                                <td>{item.label}</td>
                                <td className="col-amount">
                                    {item.price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="summary-container">
                    <div className="summary-row">
                        <span>Subtotal</span>
                        <span>{grandTotalEUR.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                    </div>
                    <div className="summary-row">
                        <span>Tax (0%)</span>
                        <span>0,00 €</span>
                    </div>
                    <div className="summary-row total">
                        <span>Total</span>
                        <span>{grandTotalEUR.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                    </div>
                </div>

                <p className="arrest-text">
                    Arrêté la présente Facture à la somme de {grandTotalEUR.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUROS.
                </p>

                <footer className="invoice-footer">
                    <div className="payment-info">
                        <strong>Bank Details</strong>
                        <p>AttijariWafaba Bank</p>
                        <p>RIB: 0076400014333000002371 93</p>
                    </div>
                    <div className="legal-ids">
                        <p>KAMUCHI TRANS SARL</p>
                        <p>ICE: 002698421000012</p>
                        <p>RC: 112785 / IF: 48557676</p>
                    </div>
                </footer>
            </div>

            {/* ── Attached file pages ── */}
            {docsToShow.map((doc) => {
                const fileUrl = `${UPLOAD_BASE_URL}/${doc.fileName}`;
                const isImage = /\.(jpg|jpeg|png|gif)$/i.test(doc.fileName);
                return (
                    <div key={doc.id} className="invoice-attachment-page">
                        <div className="attachment-page-label no-print">
                            <span className="attachment-type-tag">{doc.documentType}</span>
                            <span className="attachment-filename">{doc.originalName}</span>
                        </div>
                        <div className="attachment-paper">
                            <div className="attachment-header">
                                <span className="attachment-badge">{doc.documentType}</span>
                                <span className="attachment-ref">{data.reference || ''}</span>
                            </div>
                            {isImage ? (
                                <img
                                    src={fileUrl}
                                    alt={doc.originalName}
                                    className="attachment-image"
                                />
                            ) : (
                                <iframe
                                    src={fileUrl}
                                    title={doc.originalName}
                                    className="attachment-iframe"
                                />
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default LogisticsInvoice;
