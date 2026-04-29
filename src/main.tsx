import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CatalogProvider } from './CatalogContext.tsx';
import App from './App.tsx';
import AdminLogin from './admin/AdminLogin.tsx';
import AdminPanel from './admin/AdminPanel.tsx';
import { ADMIN_ROUTES } from './admin/paths.ts';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CatalogProvider>
      <BrowserRouter>
        <Routes>
          <Route path={ADMIN_ROUTES.login} element={<AdminLogin />} />
          <Route
            path={ADMIN_ROUTES.legacyLogin}
            element={<Navigate to={ADMIN_ROUTES.login} replace />}
          />
          <Route path={ADMIN_ROUTES.panel} element={<AdminPanel />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </CatalogProvider>
  </StrictMode>,
);
