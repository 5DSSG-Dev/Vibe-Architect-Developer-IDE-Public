import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AdminAuthGate } from './admin/auth/AdminAuthGate';
// @ts-ignore: CSS module declarations are not present in this project configuration
import './index.css';

const AdminOperationsApp = lazy(() => import('./admin/AdminOperationsApp'));

function RootRoute() {
  if (window.location.pathname === '/') return <App />;
  if (window.location.pathname === '/admin/operations') {
    return (
      <AdminAuthGate>
        {session => (
          <Suspense fallback={<main aria-busy="true">Loading Operations View…</main>}>
            <AdminOperationsApp session={session} />
          </Suspense>
        )}
      </AdminAuthGate>
    );
  }
  return <main><h1>Not found</h1><p>The requested application route does not exist.</p></main>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootRoute />
  </React.StrictMode>
);
