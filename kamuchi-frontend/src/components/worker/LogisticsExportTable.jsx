import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import './TrackingTable.css';
import './LogisticsModal.css';
import LogisticsFilesModal from './LogisticsFilesModal';
import LogisticsInvoice from './LogisticsInvoice';
import { apiFetch } from '../../api';
import { useModal } from '../common/ModalContext';

const STATUS_COLORS = {
    'Not Started': 'var(--status-not-started)',
    'Started': 'var(--status-started)',
    'Completed': 'var(--status-completed)'
};

const PORT_COLORS = {
    'Motril': { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
    'Algeciras': { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
    'default': { bg: '#f1f5f9', text: '#475569', border: 'transparent' }
};

const LogisticsExportTable = ({ isConfirmedView, user }) => {
    const isOpsManager = user?.role?.toUpperCase() === 'OPS_MANAGER' || user?.role?.toUpperCase() === 'ADMIN';
    const [data, setData] = useState([]);
    const [clients, setClients] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
    const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
    const [selectedRowForFiles, setSelectedRowForFiles] = useState(null);
    const [selectedRowForInvoice, setSelectedRowForInvoice] = useState(null);
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const { showAlert, showConfirm } = useModal();
    const scrollWrapperRef = useRef(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const initialScrollLeft = useRef(0);
    const [formData, setFormData] = useState({
        clientId: '',
        fallbackClientName: '',
        dateChargement: '',
        matriculeRemorque: '',
        chargement: '',
        dechargement: '',
        tracteur: '',
        embarquementAvec: '',
        portOfEntry: '',
        montant: '',
        redCode: '',
        redCodePrice: '',
        roroRopax: '',
        fraisSupp: [],
        clientReference: '',
        t6bisDays: '',
        t6bisPrix: '',
        commentaires: ''
    });

    const [currencyModes, setCurrencyModes] = useState({
        redCodePrice: 'MAD',
        t6bisPrix: 'EUR',
        fraisSupp: []
    });

    const fetchData = async () => {
        try {
            const [exportsRes, clientsRes] = await Promise.all([
                apiFetch('/logistics-exports'),
                apiFetch('/clients')
            ]);
            const exportsData = await exportsRes.json();
            const clientsData = await clientsRes.json();

            const processedExports = (Array.isArray(exportsData) ? exportsData : []).map(row => {
                let parsedFrais = [];
                try {
                    if (row.fraisSupp && row.fraisSupp.startsWith('[')) {
                        parsedFrais = JSON.parse(row.fraisSupp);
                    }
                } catch (e) {
                    console.error("Failed to parse fraisSupp", e);
                }
                return { ...row, fraisSuppArray: parsedFrais };
            });

            setData(processedExports);
            setClients(Array.isArray(clientsData) ? clientsData : []);
        } catch (error) {
            console.error("Failed to fetch data:", error);
        }
    };

    const fetchExports = async () => {
        try {
            const response = await apiFetch('/logistics-exports');
            const result = await response.json();
            const processed = (Array.isArray(result) ? result : []).map(row => {
                let parsedFrais = [];
                try {
                    if (row.fraisSupp && row.fraisSupp.startsWith('[')) {
                        parsedFrais = JSON.parse(row.fraisSupp);
                    }
                } catch (e) {
                    console.error("Failed to parse fraisSupp", e);
                }
                return { ...row, fraisSuppArray: parsedFrais };
            });
            setData(processed);
        } catch (error) {
            console.error("Failed to fetch logistics exports:", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleStatusChange = async (id, newStatus) => {
        setData(data.map(row => row.id === id ? { ...row, status: newStatus } : row));
        try {
            await apiFetch(`/logistics-exports/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
        } catch (error) {
            console.error("Failed to update status:", error);
        }
    };

    const handlePortChange = async (id, newPort) => {
        setData(data.map(row => row.id === id ? { ...row, portOfEntry: newPort } : row));
        try {
            await apiFetch(`/logistics-exports/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ portOfEntry: newPort })
            });
        } catch (error) {
            console.error("Failed to update port:", error);
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await showConfirm(
            'Delete Export', 
            'Are you sure you want to delete this export operation?',
            { confirmText: 'Delete', cancelText: 'Cancel' }
        );

        if (confirmed) {
            try {
                await apiFetch(`/logistics-exports/${id}`, {
                    method: 'DELETE'
                });
                fetchExports();
            } catch (error) {
                console.error("Delete failed", error);
            }
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleExtraChange = (index, field, value) => {
        const newFrais = [...formData.fraisSupp];
        newFrais[index][field] = value;
        setFormData({ ...formData, fraisSupp: newFrais });
    };

    const addExtraRow = () => {
        setFormData({
            ...formData,
            fraisSupp: [...formData.fraisSupp, { label: '', value: '', ref: '' }]
        });
        setCurrencyModes({
            ...currencyModes,
            fraisSupp: [...currencyModes.fraisSupp, 'MAD']
        });
    };

    const removeExtraRow = (index) => {
        const newFrais = formData.fraisSupp.filter((_, i) => i !== index);
        const newCurrencyFrais = currencyModes.fraisSupp.filter((_, i) => i !== index);
        setFormData({ ...formData, fraisSupp: newFrais });
        setCurrencyModes({ ...currencyModes, fraisSupp: newCurrencyFrais });
    };

    const toggleCurrency = (name, targetCurrency, index = null) => {
        const rate = 10.6;
        if (index !== null) {
            const currentMode = currencyModes.fraisSupp[index] || 'MAD';
            if (currentMode === targetCurrency) return;

            const newFrais = [...formData.fraisSupp];
            const currentVal = parseFloat(newFrais[index].value) || 0;
            
            if (targetCurrency === 'MAD') {
                newFrais[index].value = (currentVal * rate).toFixed(2);
            } else {
                newFrais[index].value = (currentVal / rate).toFixed(2);
            }

            const newCurrencyFrais = [...currencyModes.fraisSupp];
            newCurrencyFrais[index] = targetCurrency;
            
            setFormData({ ...formData, fraisSupp: newFrais });
            setCurrencyModes({ ...currencyModes, fraisSupp: newCurrencyFrais });
        } else {
            const currentMode = currencyModes[name];
            if (currentMode === targetCurrency) return;

            const currentVal = parseFloat(formData[name]) || 0;
            const newVal = targetCurrency === 'MAD' ? (currentVal * rate).toFixed(2) : (currentVal / rate).toFixed(2);
            
            setFormData({ ...formData, [name]: newVal });
            setCurrencyModes({ ...currencyModes, [name]: targetCurrency });
        }
    };

    const calculateGrandTotal = (row) => {
        const RATE = 10.6;
        const toEUR = (mad) => (parseFloat(mad) || 0) / RATE;
        
        let total = parseFloat(row.montant) || 0; // Base price (already in EUR if entered so, but we assume MAD here for simplicity or handle mode)
        // Wait, if entered as EUR, it should be treated as EUR.
        // For now, let's follow the calculation logic in LogisticsInvoice.jsx
        
        const rcPriceEUR = toEUR(row.redCodePrice);
        const visitePriceEUR = row.visite ? toEUR(40) : 0;
        
        let extrasTotalEUR = 0;
        let extras = [];
        try {
            if (typeof row.fraisSupp === 'string' && row.fraisSupp.startsWith('[')) extras = JSON.parse(row.fraisSupp);
            else if (Array.isArray(row.fraisSupp)) extras = row.fraisSupp;
        } catch (e) {}

        extras.forEach(item => {
            extrasTotalEUR += toEUR(item.value);
        });

        const t6bisEUR = parseFloat(row.t6bisPrix) || 0;

        return total + rcPriceEUR + visitePriceEUR + extrasTotalEUR + t6bisEUR;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.clientId) {
            showAlert('Input Required', "Please select a client.", 'warning');
            return;
        }

        let payloadReference;
        let payloadClientName;

        if (formData.clientId === 'fallback') {
            const existingRow = data.find(r => r.id === editingId);
            if (!existingRow) return;
            payloadReference = existingRow.reference;
            payloadClientName = existingRow.clientName;
        } else {
            const selectedClient = clients.find(c => c.id === Number(formData.clientId));
            if (!selectedClient) return;
            payloadReference = selectedClient.reference;
            payloadClientName = selectedClient.name || selectedClient.reference;
        }

        try {
            const payload = { 
                ...formData,
                reference: payloadReference,
                clientName: payloadClientName,
                fraisSupp: JSON.stringify(formData.fraisSupp),
                montant: formData.montant ? parseFloat(formData.montant) : null,
                redCodePrice: formData.redCodePrice ? parseFloat(formData.redCodePrice) : null,
                t6bisPrix: formData.t6bisPrix ? parseFloat(formData.t6bisPrix) : null
            };
            delete payload.clientId;
            delete payload.fallbackClientName;

            const method = editingId ? 'PUT' : 'POST';
            const res = await apiFetch(editingId ? `/logistics-exports/${editingId}` : '/logistics-exports', {
                method: method,
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setIsModalOpen(false);
                setEditingId(null);
                setClientSearchTerm('');
                setFormData({
                    clientId: '', fallbackClientName: '', dateChargement: '', matriculeRemorque: '',
                    chargement: '', dechargement: '', tracteur: '', embarquementAvec: '', 
                    portOfEntry: '', redCode: '', redCodePrice: '', roroRopax: '', 
                    t6bisDays: '', t6bisPrix: '', fraisSupp: [], commentaires: ''
                });
                fetchExports();
            }
        } catch (error) {
            console.error("Failed to save export:", error);
        }
    };

    const handleOpenNewModal = () => {
        setEditingId(null);
        setFormData({
            clientId: '', fallbackClientName: '', dateChargement: '', matriculeRemorque: '',
            chargement: '', dechargement: '', tracteur: '', embarquementAvec: '', 
            portOfEntry: '', redCode: '', redCodePrice: '', roroRopax: '', 
            t6bisDays: '', t6bisPrix: '', fraisSupp: [], commentaires: ''
        });
        setCurrencyModes({
            montant: 'MAD',
            redCodePrice: 'MAD',
            t6bisPrix: 'EUR',
            fraisSupp: []
        });
        setIsModalOpen(true);
    };

    const handleEditRow = (row) => {
        const client = clients.find(c => c.reference === row.reference) || 
                       clients.find(c => c.name === row.clientName);
        
        let initialFrais = [];
        try {
            if (row.fraisSupp && row.fraisSupp.startsWith('[')) {
                initialFrais = JSON.parse(row.fraisSupp);
            } else if (row.fraisSupp) {
                initialFrais = [{ label: 'Legacy Extra', value: row.fraisSupp }];
            }
        } catch (e) {
            initialFrais = [];
        }

        setFormData({
            clientId: client ? client.id.toString() : 'fallback',
            fallbackClientName: client ? '' : row.clientName,
            dateChargement: row.dateChargement || '',
            matriculeRemorque: row.matriculeRemorque || '',
            chargement: row.chargement || '',
            dechargement: row.dechargement || '',
            tracteur: row.tracteur || '',
            embarquementAvec: row.embarquementAvec || '',
            portOfEntry: row.portOfEntry || '',
            montant: row.montant !== null ? row.montant : '',
            redCode: row.redCode || '',
            redCodePrice: row.redCodePrice || '',
            roroRopax: row.roroRopax || '',
            t6bisDays: row.t6bisDays || '',
            t6bisPrix: row.t6bisPrix || '',
            fraisSupp: initialFrais,
            clientReference: row.clientReference || '',
            commentaires: row.commentaires || ''
        });
        setCurrencyModes({
            montant: 'MAD',
            redCodePrice: 'MAD',
            fraisSupp: initialFrais.map(() => 'MAD')
        });
        setClientSearchTerm(client ? (client.name || client.reference) : row.clientName);
        setEditingId(row.id);
        setIsModalOpen(true);
    };

    const handleLinkToImport = async (row) => {
        if (!window.confirm(`Are you sure you want to link this operation to Import? This will create a new Import entry for ${row.clientName}.`)) return;
        
        try {
            const response = await apiFetch(`/logistics-exports/${row.id}/link-import`, { method: 'POST' });

            if (!response.ok) throw new Error('Failed to link operation');
            
            alert('Operation linked successfully! A new entry has been created in the Import section.');
            fetchData();
        } catch (error) {
            console.error('Error linking operation:', error);
            alert('Error linking operation: ' + error.message);
        }
    };

    const handleCreateInvoice = async (row) => {
        const today = new Date().toISOString().split('T')[0];
        const invoiceNumber = `FL${Math.floor(1000 + Math.random() * 9000)}-2026`;

        try {
            const res = await apiFetch('/invoices', {
                method: 'POST',
                body: JSON.stringify({
                    invoiceNumber,
                    clientName: row.clientName,
                    reference: row.reference,
                    dateFacture: today,
                    montant: calculateGrandTotal(row),
                    status: 'Unpaid',
                    operationType: 'EXPORT',
                    operationId: row.id.toString()
                })
            });
            const invoiceData = await res.json();
            setSelectedRowForInvoice({ ...row, ...invoiceData });
            setIsInvoiceOpen(true);
        } catch (error) {
            console.error("Failed to create invoice record:", error);
            setSelectedRowForInvoice(row);
            setIsInvoiceOpen(true);
        }
    };

    const handleMouseDown = (e) => {
        if (e.button === 2) { // Right click
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
        if (scrollWrapperRef.current) {
            scrollWrapperRef.current.style.cursor = 'ew-resize';
        }
    };

    const handleContextMenu = (e) => {
        e.preventDefault(); // Prevent context menu on right click
    };

    const handleExportExcel = () => {
        const exportData = filteredData.map(row => ({
            'Reference': row.reference,
            'Client': row.clientName,
            'Date Chargement': row.dateChargement,
            'Remorque': row.matriculeRemorque,
            'Chargement': row.chargement,
            'Dechargement': row.dechargement,
            'Client Ref': row.clientReference,
            'Tractionnaire': row.tracteur,
            'Embarquement': row.embarquementAvec,
            'RORO/ROPAX': row.roroRopax,
            'Red Code': row.redCode ? `${row.redCode} (${row.redCodePrice || 0} MAD)` : '',
            ...(isOpsManager ? { 'Montant': row.montant } : {}),
            'Port Of Entry': row.portOfEntry,
            'Frais Supp': row.fraisSupp,
            'Status': row.status
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Exports");
        XLSX.writeFile(wb, `Logistics_Exports_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const filteredData = isConfirmedView ? data.filter(row => row.status === 'Completed') : data;

    const filteredClients = clients.filter(c => {
        const search = clientSearchTerm.toLowerCase();
        return (c.name && c.name.toLowerCase().includes(search)) || 
               (c.reference && c.reference.toLowerCase().includes(search));
    });

    return (
        <div className="table-container card">
            <div className="table-header">
                <h2>{isConfirmedView ? 'Confirmed Exports' : 'Export Logistics Tracking'}</h2>
                <div className="header-actions">
                    <button className="btn-secondary" onClick={handleExportExcel}>📥 Export Excel</button>
                    {!isConfirmedView && <button className="btn-primary" onClick={handleOpenNewModal}>+ New Export</button>}
                </div>
            </div>

            <div 
                className="table-scroll-wrapper" 
                ref={scrollWrapperRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onContextMenu={handleContextMenu}
            >
                <table className="tracking-table">
                    <thead>
                        <tr>
                            <th style={{ width: '100px' }}>Actions</th>
                            <th>Ref</th>
                            <th>Client Ref</th>
                            <th>Client</th>
                            <th>Date Chargement</th>
                            <th>Matricule Remorque</th>
                            <th>Chargement</th>
                            <th>Déchargement</th>
                            <th>Tractionnaire</th>
                            <th>Embarquement Avec</th>
                            <th>RORO/ROPAX</th>
                            <th>Port (Motril / Algeciras)</th>
                            <th>Red Code</th>
                            <th>T6BIS</th>
                            {isOpsManager && <th>Montant (MAD)</th>}
                            <th>Frais Supplémentaires</th>
                            <th>Commentaires</th>
                            <th style={{ width: '150px' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((row) => (
                            <tr key={row.id}>
                                <td className="actions-cell">
                                    <div className="actions-flex-wrapper">
                                        <button 
                                            className={`btn-action-trigger ${openDropdownId === row.id ? 'active' : ''}`} 
                                            onClick={() => setOpenDropdownId(openDropdownId === row.id ? null : row.id)}
                                            title="Actions"
                                        >
                                            Actions ▾
                                        </button>
                                        {openDropdownId === row.id && (
                                            <div className="action-dropdown-menu">
                                                <button className="action-dropdown-item" onClick={() => {
                                                    setOpenDropdownId(null);
                                                    handleEditRow(row);
                                                }}>✏️ Update</button>
                                                <button className="action-dropdown-item" onClick={() => {
                                                    setOpenDropdownId(null);
                                                    setSelectedRowForFiles(row);
                                                    setIsFilesModalOpen(true);
                                                }}>📁 Files</button>
                                                <button className="action-dropdown-item" onClick={() => {
                                                    setOpenDropdownId(null);
                                                    handleLinkToImport(row);
                                                }}>🔗 Link to Import</button>
                                                {isConfirmedView && (
                                                    <button className="action-dropdown-item" onClick={() => {
                                                        setOpenDropdownId(null);
                                                        handleCreateInvoice(row);
                                                    }}>📄 Create Invoice</button>
                                                )}
                                                <button className="action-dropdown-item delete" onClick={() => {
                                                    setOpenDropdownId(null);
                                                    handleDelete(row.id);
                                                }}>🗑️ Delete</button>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                 <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <strong>{row.reference}</strong>
                                        {row.groupId && (
                                            <span style={{ 
                                                fontSize: '0.6rem', 
                                                backgroundColor: '#e3f2fd', 
                                                color: '#1976d2', 
                                                padding: '2px 6px', 
                                                borderRadius: '10px',
                                                border: '1px solid #bbdefb',
                                                fontWeight: 'bold'
                                            }}>LINKED</span>
                                        )}
                                    </div>
                                </td>
                                <td>{row.clientReference || '-'}</td>
                                <td>{row.clientName || '-'}</td>
                                <td>{row.dateChargement || '-'}</td>
                                <td>{row.matriculeRemorque || '-'}</td>
                                <td>{row.chargement || '-'}</td>
                                <td>{row.dechargement || '-'}</td>
                                <td>{row.tracteur || '-'}</td>
                                <td>{row.embarquementAvec || '-'}</td>
                                <td>{row.roroRopax || '-'}</td>
                                <td>
                                    <span style={{
                                        backgroundColor: (PORT_COLORS[row.portOfEntry] || PORT_COLORS.default).bg,
                                        color: (PORT_COLORS[row.portOfEntry] || PORT_COLORS.default).text,
                                        border: `1px solid ${(PORT_COLORS[row.portOfEntry] || PORT_COLORS.default).border}`,
                                        fontWeight: '700',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        display: 'inline-block',
                                        minWidth: '80px',
                                        textAlign: 'center'
                                    }}>
                                        {row.portOfEntry || '-'}
                                    </span>
                                </td>
                                <td>
                                    {row.redCode ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontWeight: '600' }}>{row.redCode}</span>
                                            {isOpsManager && row.redCodePrice !== null && (
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                                    {row.redCodePrice} MAD
                                                </span>
                                            )}
                                        </div>
                                    ) : '-'}
                                </td>
                                <td>
                                    {row.t6bisDays ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontWeight: '600' }}>{row.t6bisDays} days</span>
                                            {isOpsManager && row.t6bisPrix !== null && (
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                                    {row.t6bisPrix} EUR
                                                </span>
                                            )}
                                        </div>
                                    ) : '-'}
                                </td>
                                {isOpsManager && <td style={{ textAlign: 'right' }}>{row.montant !== null ? `${row.montant} MAD` : '-'}</td>}
                                <td>
                                    {row.fraisSuppArray && row.fraisSuppArray.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            {row.fraisSuppArray.map((ext, idx) => (
                                                <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{ext.label}{ext.ref ? ` (${ext.ref})` : ''}:</span> {ext.value} MAD
                                                </div>
                                            ))}
                                        </div>
                                    ) : (row.fraisSupp && !row.fraisSupp.startsWith('[') ? row.fraisSupp : '-')}
                                </td>
                                <td>{row.commentaires || '-'}</td>
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
                        {filteredData.length === 0 && (
                            <tr>
                                <td colSpan={isOpsManager ? "17" : "16"} style={{ textAlign: 'center', padding: '1rem' }}>No records found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="logistics-modal-overlay">
                    <div className="logistics-modal-content">
                        <div className="logistics-modal-header">
                            <h2>{editingId ? 'Update Export Logistics' : 'Add New Export Logistics'}</h2>
                            <button className="logistics-btn-close" onClick={() => setIsModalOpen(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="logistics-form-grid">
                            <div className="logistics-form-group full-width">
                                <label>Select Client</label>
                                <div className="custom-searchable-select">
                                    <input 
                                        type="text" 
                                        placeholder="Type to search client..." 
                                        value={clientSearchTerm}
                                        onFocus={() => setIsSearchFocused(true)}
                                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                        onChange={(e) => {
                                            setClientSearchTerm(e.target.value);
                                            setFormData({ ...formData, clientId: '' }); // Reset selection while typing
                                        }}
                                        required
                                        autoComplete="off"
                                    />
                                    {isSearchFocused && filteredClients.length > 0 && (
                                        <div className="search-results-dropdown">
                                            {filteredClients.map(c => (
                                                <div 
                                                    key={c.id} 
                                                    className={`search-result-item ${formData.clientId === c.id.toString() ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        setFormData({ ...formData, clientId: c.id.toString() });
                                                        setClientSearchTerm(c.name || c.reference);
                                                        setIsSearchFocused(false);
                                                    }}
                                                >
                                                    <strong>{c.reference}</strong> {c.name ? `- ${c.name}` : ''}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {isSearchFocused && filteredClients.length === 0 && clientSearchTerm && (
                                        <div className="search-results-dropdown">
                                            <div className="search-result-item" style={{color: 'var(--text-muted)', cursor: 'default'}}>
                                                No matches found
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                             <div className="logistics-form-group">
                                <label>Client Reference</label>
                                <input 
                                    type="text" 
                                    name="clientReference" 
                                    placeholder="Enter client's internal reference" 
                                    value={formData.clientReference} 
                                    onChange={handleFormChange} 
                                />
                            </div>
                            <div className="logistics-form-group">
                                <label>Date Chargement</label>
                                <input type="date" name="dateChargement" value={formData.dateChargement} onChange={handleFormChange} />
                            </div>
                            <div className="logistics-form-group">
                                <label>Matricule Remorque</label>
                                <input type="text" name="matriculeRemorque" value={formData.matriculeRemorque} onChange={handleFormChange} />
                            </div>
                            <div className="logistics-form-group">
                                <label>Chargement</label>
                                <input type="text" name="chargement" value={formData.chargement} onChange={handleFormChange} />
                            </div>
                            <div className="logistics-form-group">
                                <label>Déchargement</label>
                                <input type="text" name="dechargement" value={formData.dechargement} onChange={handleFormChange} />
                            </div>
                            <div className="logistics-form-group">
                                <label>Tractionnaire</label>
                                <input type="text" name="tracteur" value={formData.tracteur} onChange={handleFormChange} />
                            </div>
                            <div className="logistics-form-group">
                                <label>Embarquement Avec...</label>
                                <input type="text" name="embarquementAvec" value={formData.embarquementAvec} onChange={handleFormChange} />
                            </div>
                            <div className="logistics-form-group">
                                <label>RORO/ROPAX</label>
                                <select name="roroRopax" value={formData.roroRopax} onChange={handleFormChange}>
                                    <option value="">-- Select Type --</option>
                                    <option value="RORO">RORO</option>
                                    <option value="ROPAX">ROPAX</option>
                                </select>
                            </div>
                            <div className="logistics-form-group">
                                <label>Port (Route)</label>
                                <select name="portOfEntry" value={formData.portOfEntry} onChange={handleFormChange}>
                                    <option value="">-- Select Port --</option>
                                    <option value="Motril">Motril</option>
                                    <option value="Algeciras">Algeciras</option>
                                </select>
                            </div>
                            {isOpsManager && (
                                <div className="logistics-form-group">
                                    <label>Montant (MAD)</label>
                                    <div className="currency-input-wrapper">
                                        <input type="number" name="montant" value={formData.montant} onChange={handleFormChange} placeholder="Enter base price" />
                                        <div className="currency-actions">
                                            <button type="button" className={`currency-btn ${currencyModes.montant === 'MAD' ? 'active' : ''}`} onClick={() => toggleCurrency('montant', 'MAD')} title="Switch to MAD">🇲🇦</button>
                                            <button type="button" className={`currency-btn ${currencyModes.montant === 'EUR' ? 'active' : ''}`} onClick={() => toggleCurrency('montant', 'EUR')} title="Switch to EUR">🇪🇺</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="logistics-form-group">
                                <label>Red Code</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <select 
                                        name="redCode" 
                                        value={formData.redCode} 
                                        onChange={handleFormChange}
                                        style={{ flex: 2 }}
                                    >
                                        <option value="">-- No Red Code --</option>
                                        <option value="Pesage">Pesage</option>
                                        <option value="Imobilisation">Imobilisation</option>
                                        <option value="Scanner">Scanner</option>
                                    </select>
                                    {isOpsManager && formData.redCode && (
                                        <div className="currency-input-wrapper" style={{ flex: 1.5 }}>
                                            <input 
                                                type="number" 
                                                name="redCodePrice" 
                                                placeholder="Price" 
                                                value={formData.redCodePrice} 
                                                onChange={handleFormChange}
                                                style={{ width: '100%' }}
                                            />
                                            <div className="currency-actions">
                                                <button type="button" className={`currency-btn ${currencyModes.redCodePrice === 'MAD' ? 'active' : ''}`} onClick={() => toggleCurrency('redCodePrice', 'MAD')} title="Switch to MAD">🇲🇦</button>
                                                <button type="button" className={`currency-btn ${currencyModes.redCodePrice === 'EUR' ? 'active' : ''}`} onClick={() => toggleCurrency('redCodePrice', 'EUR')} title="Switch to EUR">🇪🇺</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="logistics-form-group">
                                <label>T6BIS</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input 
                                        type="number" 
                                        name="t6bisDays" 
                                        placeholder="Days" 
                                        value={formData.t6bisDays} 
                                        onChange={handleFormChange}
                                        style={{ flex: 1 }}
                                    />
                                    <div className="currency-input-wrapper" style={{ flex: 1 }}>
                                        <input 
                                            type="number" 
                                            name="t6bisPrix" 
                                            placeholder="Prix" 
                                            value={formData.t6bisPrix} 
                                            onChange={handleFormChange}
                                            style={{ width: '100%' }}
                                        />
                                        <div className="currency-actions">
                                            <button type="button" className={`currency-btn ${currencyModes.t6bisPrix === 'MAD' ? 'active' : ''}`} onClick={() => toggleCurrency('t6bisPrix', 'MAD')} title="Switch to MAD">🇲🇦</button>
                                            <button type="button" className={`currency-btn ${currencyModes.t6bisPrix === 'EUR' ? 'active' : ''}`} onClick={() => toggleCurrency('t6bisPrix', 'EUR')} title="Switch to EUR">🇪🇺</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="logistics-form-group full-width">
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    Extras / Frais supplémentaires
                                    <button type="button" className="btn-add-extra" onClick={addExtraRow}>+ Add Fee</button>
                                </label>
                                <div className="extras-list">
                                    {formData.fraisSupp.map((extra, index) => (
                                        <div key={index} className="extra-row fade-in">
                                            <input 
                                                type="text" 
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
                                            <div className="currency-input-wrapper" style={{ flex: 2 }}>
                                                <input 
                                                    type="number" 
                                                    placeholder="Price (MAD)" 
                                                    value={extra.value} 
                                                    onChange={(e) => handleExtraChange(index, 'value', e.target.value)}
                                                    style={{ width: '100%' }}
                                                />
                                                <div className="currency-actions">
                                                    <button type="button" className={`currency-btn ${currencyModes.fraisSupp[index] === 'MAD' ? 'active' : ''}`} onClick={() => toggleCurrency(null, 'MAD', index)} title="Switch to MAD">🇲🇦</button>
                                                    <button type="button" className={`currency-btn ${currencyModes.fraisSupp[index] === 'EUR' ? 'active' : ''}`} onClick={() => toggleCurrency(null, 'EUR', index)} title="Switch to EUR">🇪🇺</button>
                                                </div>
                                            </div>
                                            <button type="button" className="btn-remove-extra" onClick={() => removeExtraRow(index)}>×</button>
                                        </div>
                                    ))}
                                    {formData.fraisSupp.length === 0 && (
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem', background: '#f8fafc', borderRadius: '8px' }}>
                                            No extra fees added.
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="logistics-form-group full-width">
                                <label>Commentaires</label>
                                <textarea name="commentaires" value={formData.commentaires} onChange={handleFormChange} rows="3"></textarea>
                            </div>
                            <div className="logistics-form-actions">
                                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Save Export</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Render the new Files Modal */}
            <LogisticsFilesModal 
                isOpen={isFilesModalOpen} 
                onClose={() => setIsFilesModalOpen(false)} 
                rowData={selectedRowForFiles} 
                operationType="EXPORT"
            />
            {isInvoiceOpen && (
                <LogisticsInvoice 
                    data={selectedRowForInvoice} 
                    onClose={() => setIsInvoiceOpen(false)} 
                />
            )}
        </div>
    );
};

export default LogisticsExportTable;
