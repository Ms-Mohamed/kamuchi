import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Info, AlertCircle, Trash2 } from 'lucide-react';
import './NotificationCenter.css';
import { API_BASE_URL } from '../../api';

const NotificationCenter = ({ role, userId }) => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/notifications?role=${role || ''}&userId=${userId || ''}`);
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.isRead).length);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Polling every 30s
        return () => clearInterval(interval);
    }, [role, userId]);

    const markAsRead = async (id) => {
        try {
            const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, { method: 'PUT' });
            if (res.ok) fetchNotifications();
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const clearAll = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/notifications/clear?role=${role || ''}&userId=${userId || ''}`, { method: 'DELETE' });
            if (res.ok) fetchNotifications();
        } catch (error) {
            console.error('Error clearing notifications:', error);
        }
    };

    return (
        <div className="notification-wrapper">
            <button className="notification-bell" onClick={() => setIsOpen(!isOpen)}>
                <Bell size={20} />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h3>Notifications</h3>
                        <div className="header-actions">
                            <button onClick={clearAll} title="Clear all"><Trash2 size={16} /></button>
                            <button onClick={() => setIsOpen(false)}><X size={16} /></button>
                        </div>
                    </div>
                    
                    <div className="notification-list">
                        {notifications.length === 0 ? (
                            <div className="no-notifications">
                                <p>You're all caught up!</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div key={n.id} className={`notification-item ${n.type.toLowerCase()} ${n.isRead ? 'read' : ''}`}>
                                    <div className="item-icon">
                                        {n.type === 'SUCCESS' && <Check size={16} />}
                                        {n.type === 'WARNING' && <AlertCircle size={16} />}
                                        {n.type === 'INFO' && <Info size={16} />}
                                    </div>
                                    <div className="item-body">
                                        <h4>{n.title}</h4>
                                        <p>{n.message}</p>
                                        <span className="item-time">{new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    {!n.isRead && (
                                        <button className="item-read-btn" onClick={() => markAsRead(n.id)}>
                                            Mark read
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
