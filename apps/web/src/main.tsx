import React from 'react';
import ReactDOM from 'react-dom/client';
import { StarkbaseProvider } from '@starkbase/sdk';
import App from './App';
import './index.css';

const storedPlatformId = localStorage.getItem('sb_platform_id') || undefined;
const storedApiKey     = localStorage.getItem('sb_api_key')     || undefined;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StarkbaseProvider
      apiUrl={import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}
      platformId={storedPlatformId ?? import.meta.env.VITE_PLATFORM_ID}
      apiKey={storedApiKey ?? import.meta.env.VITE_PLATFORM_API_KEY}
    >
      <App />
    </StarkbaseProvider>
  </React.StrictMode>
);
