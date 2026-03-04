import { useState, useEffect } from 'react'
import LoginScreen from './components/auth/LoginScreen'
import WorkerDashboard from './components/worker/WorkerDashboard'
import ClientDashboard from './components/client/ClientDashboard'
import GuestChatView from './components/chat/GuestChatView'
import './index.css'

function App() {
  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem('kamuchiUserRole') || null;
  });

  useEffect(() => {
    if (userRole) {
      localStorage.setItem('kamuchiUserRole', userRole);
    } else {
      localStorage.removeItem('kamuchiUserRole');
    }
  }, [userRole]);

  const isGuest = userRole && userRole.startsWith('guest:');

  return (
    <div className="app-container">
      {!userRole ? (
        <LoginScreen onLogin={setUserRole} />
      ) : userRole === 'worker' ? (
        <WorkerDashboard onLogout={() => setUserRole(null)} />
      ) : isGuest ? (
        <GuestChatView
          secretCode={userRole.replace('guest:', '')}
          onLogout={() => setUserRole(null)}
        />
      ) : (
        <ClientDashboard userRole={userRole} onLogout={() => setUserRole(null)} />
      )}
    </div>
  )
}

export default App

