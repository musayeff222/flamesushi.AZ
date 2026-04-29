import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { CatalogProvider } from './CatalogContext.tsx';
import App from './App.tsx';
import AdminLogin from './admin/AdminLogin.tsx';
import AdminPanel from './admin/AdminPanel.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CatalogProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/loginadminboss" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </CatalogProvider>
  </StrictMode>,
);
