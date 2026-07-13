import React from 'react';
import './Modal.css';

const Modal = ({ 
    isOpen, 
    title, 
    message, 
    type = 'info', // 'info', 'confirm', 'warning', 'success'
    onConfirm, 
    onCancel,
    confirmText = 'OK',
    cancelText = 'Cancel'
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return '✅';
            case 'warning': return '⚠️';
            case 'confirm': return '❓';
            default: return 'ℹ️';
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container fade-in-up">
                <div className="modal-header">
                    <span className="modal-icon">{getIcon()}</span>
                    <h3>{title}</h3>
                </div>
                <div className="modal-body">
                    {/^\d{6}$/.test(message) ? (
                        <div className="modal-code-display">
                            {message}
                        </div>
                    ) : (
                        <p>{message}</p>
                    )}
                </div>
                <div className="modal-footer">
                    {onCancel && (
                        <button className="btn-secondary" onClick={onCancel}>
                            {cancelText}
                        </button>
                    )}
                    <button className="btn-primary" onClick={onConfirm}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal;
