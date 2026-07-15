import { useState, useEffect } from 'react'
import LoginScreen from './components/auth/LoginScreen'
import WorkerDashboard from './components/worker/WorkerDashboard'
import AdminDashboard from './components/admin/AdminDashboard'
import ClientDashboard from './components/client/ClientDashboard'
import './index.css'

import { ModalProvider } from './components/common/ModalContext'
import { apiFetch } from './api'

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('kamuchiUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('kamuchiToken');
    localStorage.removeItem('kamuchiUser');
    localStorage.removeItem('kamuchiUserRole');
    setUser(null);
  };

  // Verify token on load if it exists
  useEffect(() => {
    const token = localStorage.getItem('kamuchiToken');
    if (token && !user) {
      // Attempt to fetch current user data if we have a token but no user object
      apiFetch('/auth/me')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Session expired');
      })
      .then(userData => {
        setUser(userData);
      })
      .catch(() => {
        handleLogout();
      });
    }
  }, []);

  const role = user?.role?.toUpperCase() || '';

  return (
    <ModalProvider>
      <div className="app-container">
        {!user ? (
          <LoginScreen onLogin={handleLogin} />
        ) : role === 'ADMIN' ? (
          <AdminDashboard onLogout={handleLogout} />
        ) : (role.includes('WORKER') || role.includes('OPS') || role.includes('MANAGER')) ? (
          <WorkerDashboard user={user} onLogout={handleLogout} />
        ) : (
          <ClientDashboard userRole={user.reference || user.username} onLogout={handleLogout} />
        )}
      </div>
    </ModalProvider>
  )
}

export default App

