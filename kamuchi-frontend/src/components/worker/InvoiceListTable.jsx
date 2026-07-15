import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import './TrackingTable.css';
import LogisticsInvoice from './LogisticsInvoice';
import { apiFetch } from '../../api';
import { useModal } from '../common/ModalContext';

const STATUS_COLORS = {
    'Unpaid': '#ef4444', // red
    'Paid': '#10b981',   // green
};

const InvoiceListTable = () => {
    const [data, setData] = useState([]);
    const [selectedInvoiceData, setSelectedInvoiceData] = useState(null);
    const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
    const scrollWrapperRef = useRef(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const initialScrollLeft = useRef(0);
    const { showAlert, showConfirm } = useModal();

    const fetchInvoices = async () => {
        try {
            const response = await apiFetch('/invoices');
            setData(await response.json());
        } catch (error) {
            console.error("Failed to fetch invoices:", error);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const handleUpdateInvoice = async (id, field, value) => {
        try {
            const invoice = data.find(inv => inv.id === id);
            const payload = { 
                status: invoice.status,
                paymentDetail: invoice.paymentDetail,
                paymentDate: invoice.paymentDate,
                [field]: value 
            };
            
            await apiFetch(`/invoices/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            fetchInvoices();
        } catch (error) {
            console.error("Failed to update invoice:", error);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        handleUpdateInvoice(id, 'status', newStatus);
    };

    const handleViewInvoice = async (invoice) => {
        try {
            const endpoint = invoice.operationType === 'IMPORT' ? `/logistics-imports/${invoice.operationId}` : `/logistics-exports/${invoice.operationId}`;
            const response = await apiFetch(endpoint);
            if (response.ok) {
                const opData = await response.json();
                // Merge invoice specific data (like invoice number and date) with operational data
                setSelectedInvoiceData({
                    ...opData,
                    invoiceNumber: invoice.invoiceNumber,
                    dateFacture: invoice.dateFacture,
                    // We don't override montant here so LogisticsInvoice can calculate the items correctly
                    savedTotal: invoice.montant 
                });
                setIsInvoiceOpen(true);
            } else {
                // Fallback to just invoice data if operation not found
                setSelectedInvoiceData(invoice);
                setIsInvoiceOpen(true);
            }
        } catch (error) {
            console.error("Failed to fetch operation data:", error);
            setSelectedInvoiceData(invoice);
            setIsInvoiceOpen(true);
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await showConfirm(
            'Delete Invoice', 
            'Are you sure you want to delete this invoice record?',
            { confirmText: 'Delete', cancelText: 'Cancel' }
        );

        if (confirmed) {
            try {
                await apiFetch(`/invoices/${id}`, {
                    method: 'DELETE'
                });
                fetchInvoices();
            } catch (error) {
                console.error("Delete failed", error);
            }
        }
    };

    const handleExportExcel = () => {
        const exportData = data.map(row => ({
            'Invoice No': row.invoiceNumber,
            'Client': row.clientName,
            'Reference': row.reference,
            'Date': row.dateFacture,
            'Amount': row.montant,
            'Type': row.operationType,
            'Status': row.status
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Invoices");
        XLSX.writeFile(wb, `Invoices_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Horizontal scroll handlers
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
                <h2>Liste des Factures Clients</h2>
                <div className="header-actions">
                    <button className="btn-secondary" onClick={handleExportExcel}>📥 Export Excel</button>
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
                            <th style={{ width: '80px' }}>Actions</th>
                            <th>Détail de paiement</th>
                            <th>nm_facture</th>
                            <th>Date de facture</th>
                            <th>Montant</th>
                            <th>Date paiement</th>
                            <th style={{ width: '130px' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row) => (
                            <tr key={row.id}>
                                <td className="actions-cell">
                                    <div className="actions-flex-wrapper">
                                        <button className="btn-icon" onClick={() => handleViewInvoice(row)} title="View Invoice">👁️</button>
                                        <button className="btn-icon delete" onClick={() => handleDelete(row.id)} title="Delete">🗑️</button>
                                    </div>
                                </td>
                                <td>
                                    <input 
                                        type="text" 
                                        className="inline-edit-input"
                                        value={row.paymentDetail || ''} 
                                        placeholder="Note..."
                                        onChange={(e) => setData(data.map(inv => inv.id === row.id ? { ...inv, paymentDetail: e.target.value } : inv))}
                                        onBlur={(e) => handleUpdateInvoice(row.id, 'paymentDetail', e.target.value)}
                                    />
                                </td>
                                <td><strong>{row.invoiceNumber}</strong></td>
                                <td>{row.dateFacture}</td>
                                <td style={{ textAlign: 'right', fontWeight: '600' }}>
                                    {row.montant.toLocaleString()} €
                                </td>
                                <td>
                                    <input 
                                        type="date" 
                                        className="inline-edit-input"
                                        value={row.paymentDate || ''} 
                                        onChange={(e) => setData(data.map(inv => inv.id === row.id ? { ...inv, paymentDate: e.target.value } : inv))}
                                        onBlur={(e) => handleUpdateInvoice(row.id, 'paymentDate', e.target.value)}
                                    />
                                </td>
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
                                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    Aucune facture trouvée.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isInvoiceOpen && (
                <LogisticsInvoice 
                    data={selectedInvoiceData} 
                    onClose={() => setIsInvoiceOpen(false)} 
                />
            )}
        </div>
    );
};

export default InvoiceListTable;
