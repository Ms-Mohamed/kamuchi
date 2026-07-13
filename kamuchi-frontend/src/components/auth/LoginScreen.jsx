import React, { useState } from 'react';
import './LoginScreen.css';
import { API_BASE_URL } from '../../api';

const LoginScreen = ({ onLogin }) => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Store token and user info
            localStorage.setItem('kamuchiToken', data.token);
            localStorage.setItem('kamuchiUser', JSON.stringify(data.user));
            localStorage.setItem('kamuchiUserRole', data.user.role.toLowerCase());

            onLogin(data.user);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card card">
                <div className="login-header">
                    <div className="logo-icon">🏢</div>
                    <h2>Kamuchi Trans</h2>
                    <p>Enter your credentials to access your dashboard</p>
                </div>
                <form onSubmit={handleLogin} className="login-form">
                    
                    {error && <div className="error-message" style={{ color: 'var(--status-not-started)', fontSize: '0.85rem', textAlign: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}

                    <div className="form-group">
                        <label>Username or Reference</label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="e.g. Admin or CLI-A001"
                            required
                            autoFocus
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Password or Access Code</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your security code"
                            required
                        />
                    </div>

                    <button type="submit" className="btn-primary login-submit" disabled={loading} style={{ width: '100%', marginTop: '1rem', height: '48px', fontSize: '1rem' }}>
                        {loading ? 'Authenticating...' : 'Sign In'}
                    </button>
                </form>
                
                <div className="login-footer">
                    <p>© 2026 Kamuchi Trans Logistics. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
