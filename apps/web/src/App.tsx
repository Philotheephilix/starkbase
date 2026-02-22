import React from 'react';
import { useAuth } from '@starkbase/sdk';

function App() {
  const { user, isAuthenticated, isLoading, initiateAuth } = useAuth();

  const handleLogin = async () => {
    const { authUrl } = await initiateAuth('google', `${window.location.origin}/callback`);
    window.location.href = authUrl;
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 600, margin: '80px auto', padding: 24 }}>
      <h1>Starkbase</h1>
      <p>BaaS for Starknet — SDK demo</p>

      {isAuthenticated ? (
        <div>
          <p>✅ Connected: <code>{user?.accountAddress}</code></p>
        </div>
      ) : (
        <button onClick={handleLogin} disabled={isLoading}>
          {isLoading ? 'Connecting...' : 'Login with Google'}
        </button>
      )}
    </div>
  );
}

export default App;
