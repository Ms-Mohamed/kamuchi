import React, { createContext, useContext, useState } from 'react';
import Modal from './Modal';

const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null,
        onCancel: null,
        confirmText: 'OK',
        cancelText: 'Cancel'
    });

    const showAlert = (title, message, type = 'info') => {
        return new Promise((resolve) => {
            setModalConfig({
                isOpen: true,
                title,
                message,
                type,
                confirmText: 'OK',
                onConfirm: () => {
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                    resolve();
                },
                onCancel: null
            });
        });
    };

    const showConfirm = (title, message, options = {}) => {
        return new Promise((resolve) => {
            setModalConfig({
                isOpen: true,
                title,
                message,
                type: 'confirm',
                confirmText: options.confirmText || 'Confirm',
                cancelText: options.cancelText || 'Cancel',
                onConfirm: () => {
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                    resolve(true);
                },
                onCancel: () => {
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                    resolve(false);
                }
            });
        });
    };

    return (
        <ModalContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            <Modal {...modalConfig} />
        </ModalContext.Provider>
    );
};

export const useModal = () => useContext(ModalContext);
