import React, { useState } from 'react';
import './LoginScreen.css';

const LoginScreen = ({ onLogin }) => {
    const [role, setRole] = useState('worker');
    const [reference, setReference] = useState('');
    const [secretCode, setSecretCode] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        if (role === 'worker') {
            onLogin('worker');
        } else if (role === 'guest') {
            if (!secretCode.trim()) {
                alert('Please enter a secret code');
                return;
            }
            // Prefix so App.jsx can distinguish guest from client
            onLogin(`guest:${secretCode.trim()}`);
        } else {
            if (!reference.trim()) {
                alert('Please enter a Client Reference or Access Code');
                return;
            }
            onLogin(reference.trim());
        }
    };

    return (
        <div className="login-container">
            <div className="login-card card">
                <div className="login-header">
                    <h2>Kamuchi Trans</h2>
                    <p>Login to Dashboard</p>
                </div>
                <form onSubmit={handleLogin} className="login-form">
                    <div className="form-group">
                        <label>Select Role</label>
                        <div className="role-selector">
                            <button
                                type="button"
                                className={`role-btn ${role === 'worker' ? 'active' : ''}`}
                                onClick={() => setRole('worker')}
                            >
                                Worker
                            </button>
                            <button
                                type="button"
                                className={`role-btn ${role === 'client' ? 'active' : ''}`}
                                onClick={() => setRole('client')}
                            >
                                Client
                            </button>
                            <button
                                type="button"
                                className={`role-btn ${role === 'guest' ? 'active' : ''}`}
                                onClick={() => setRole('guest')}
                            >
                                💬 Chat
                            </button>
                        </div>
                    </div>

                    {role === 'client' && (
                        <div className="form-group">
                            <label>Client Reference / Access Code</label>
                            <input
                                type="text"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                placeholder="e.g. CLI-1234"
                            />
                        </div>
                    )}

                    {role === 'guest' && (
                        <div className="form-group">
                            <label>🔑 Secret Chat Code</label>
                            <input
                                type="text"
                                value={secretCode}
                                onChange={(e) => setSecretCode(e.target.value)}
                                placeholder="Enter the secret code you received"
                                autoFocus
                            />
                            <small style={{ color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                                Enter the code shared with you to join the group chat.
                            </small>
                        </div>
                    )}

                    <button type="submit" className="btn-primary login-submit">
                        {role === 'guest' ? '🚀 Join Chat' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginScreen;
