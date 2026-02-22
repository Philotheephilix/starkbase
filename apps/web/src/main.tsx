import React from 'react';
import ReactDOM from 'react-dom/client';
import { StarkbaseProvider } from '@starkbase/sdk';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StarkbaseProvider apiUrl="http://localhost:8080">
      <App />
    </StarkbaseProvider>
  </React.StrictMode>
);
