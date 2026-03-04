import React, { useState, useEffect } from 'react';
import './TrackingTable.css';
import NewImportModal from './NewImportModal';

const STATUS_COLORS = {
    'Not Started': 'var(--status-not-started)',
    'Started': 'var(--status-started)',
    'Completed': 'var(--status-completed)'
};

const TrackingTable = ({ onActionClick, selectedRowId, refreshTrigger }) => {
    const [data, setData] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchImports = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/imports');
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error("Failed to fetch imports:", error);
        }
    };

    useEffect(() => {
        fetchImports();
    }, [refreshTrigger]);

    const handleStatusChange = async (id, newStatus) => {
        // Optimistically update UI
        setData(data.map(row => row.id === id ? { ...row, status: newStatus } : row));

        try {
            await fetch(`http://localhost:5000/api/imports/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
        } catch (error) {
            console.error("Failed to update status:", error);
        }
    };

    const handleImportCreated = (newImport) => {
        fetchImports(); // Refresh table to get complete joined data
    };

    return (
        <div className="table-container card">
            <div className="table-header">
                <h2>Active Imports Tracking</h2>
                <button className="btn-primary" onClick={() => setIsModalOpen(true)}>New Import</button>
            </div>

            {isModalOpen && (
                <NewImportModal
                    onClose={() => setIsModalOpen(false)}
                    onImportCreated={handleImportCreated}
                />
            )}

            <div className="table-scroll-wrapper">
                <table className="tracking-table">
                    <thead>
                        <tr>
                            <th colSpan="11" className="th-group">Core Information</th>
                            <th colSpan="6" className="th-group alt">Financials</th>
                            <th colSpan="6" className="th-group">Additional Costs</th>
                            <th colSpan="1" className="th-group alt">Workflow</th>
                        </tr>
                        <tr>
                            {/* Core Information */}
                            <th>Actions</th>
                            <th>Reference</th>
                            <th>Matricule</th>
                            <th>Date d'embarque</th>
                            <th>Exportador</th>
                            <th>Destinateur</th>
                            <th>Location</th>
                            <th>Date</th>
                            <th>Sortie</th>
                            <th>Tracteur d'import</th>
                            <th>Date livraison</th>

                            {/* Financials */}
                            <th>Prix achat import</th>
                            <th>Prix vente import</th>
                            <th>Dechargement</th>
                            <th>TMSA</th>
                            <th>Parking</th>
                            <th>MAFI</th>

                            {/* Additional Costs */}
                            <th>Pesage</th>
                            <th>Visite</th>
                            <th>Intervention</th>
                            <th>Frais BAD</th>
                            <th>Avis d'arrive</th>
                            <th>Montant facture</th>

                            {/* Workflow */}
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row) => (
                            <tr
                                key={row.id}
                                className={selectedRowId === row.id ? 'selected-row' : ''}
                            >
                                <td className="actions-cell">
                                    <button
                                        className="btn-action btn-chat"
                                        onClick={() => onActionClick && onActionClick('chat', row)}
                                        title="Open Chat"
                                    >
                                        💬
                                    </button>
                                    <button
                                        className="btn-action btn-edit"
                                        onClick={() => onActionClick && onActionClick('edit', row)}
                                        title="Modifier"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className="btn-action btn-delete"
                                        onClick={() => onActionClick && onActionClick('delete', row)}
                                        title="Supprimer"
                                    >
                                        🗑️
                                    </button>
                                </td>
                                <td><strong>{row.reference}</strong></td>
                                <td>{row.matricule || '-'}</td>
                                <td>{row.dateEmbarque || '-'}</td>
                                <td>{row.exportador || '-'}</td>
                                <td>{row.destinateur || '-'}</td>
                                <td>{row.location || '-'}</td>
                                <td>{row.date || '-'}</td>
                                <td>{row.sortie || '-'}</td>
                                <td>{row.tracteur || '-'}</td>
                                <td>{row.dateLivraison || '-'}</td>

                                <td>{row.prixAchat || '-'}</td>
                                <td>{row.prixVente || '-'}</td>
                                <td>{row.dechargement || '-'}</td>
                                <td>{row.tmsa || '-'}</td>
                                <td>{row.parking || '-'}</td>
                                <td>{row.mafi || '-'}</td>

                                <td>{row.pesage || '-'}</td>
                                <td>{row.visite || '-'}</td>
                                <td>{row.intervention || '-'}</td>
                                <td>{row.fraisBad || '-'}</td>
                                <td>{row.avisArrive || '-'}</td>
                                <td>{row.montantFacture || '-'}</td>

                                <td>
                                    <select
                                        value={row.status}
                                        onChange={(e) => handleStatusChange(row.id, e.target.value)}
                                        style={{
                                            backgroundColor: STATUS_COLORS[row.status],
                                            color: 'white',
                                            fontWeight: 'bold',
                                            border: 'none',
                                            padding: '4px 8px',
                                            borderRadius: '4px'
                                        }}
                                    >
                                        <option value="Not Started">Not Started</option>
                                        <option value="Started">Started</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TrackingTable;


