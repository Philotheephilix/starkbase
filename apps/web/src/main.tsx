import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StarkbaseProvider } from '@starkbase/sdk';
import App from './App';
import LandingPage from './LandingPage';
import LoginPage from './LoginPage';
import './landing.css';

const DEFAULT_PLATFORM_ID = 'dad7834d-3eed-4e62-bdad-43888662d73c';
const DEFAULT_API_KEY     = 'sb_245ac7d43b1a3b9052521d5f11ab514be9ef95bae7bd6854';

const storedPlatformId = localStorage.getItem('sb_platform_id') || DEFAULT_PLATFORM_ID;
const storedApiKey     = localStorage.getItem('sb_api_key')     || DEFAULT_API_KEY;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StarkbaseProvider
      apiUrl={import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}
      platformId={storedPlatformId ?? import.meta.env.VITE_PLATFORM_ID}
      apiKey={storedApiKey ?? import.meta.env.VITE_PLATFORM_API_KEY}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/console" element={<App />} />
        </Routes>
      </BrowserRouter>
    </StarkbaseProvider>
  </React.StrictMode>
);
