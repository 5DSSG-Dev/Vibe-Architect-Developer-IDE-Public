import { useEffect, useState, type ReactNode } from 'react';

export interface AdminSession {
  authenticated: true;
  subject: string;
  name?: string;
  username?: string;
  roles: string[];
  csrfToken: string;
}

export function AdminAuthGate({ children }: { children: (session: AdminSession) => ReactNode }) {
  const [state, setState] = useState<{ status: 'loading' | 'denied' | 'ready' | 'unavailable'; session?: AdminSession }>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/session', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (response.ok) return setState({ status: 'ready', session: await response.json() as AdminSession });
        setState({ status: response.status === 503 ? 'unavailable' : 'denied' });
      })
      .catch(error => {
        if (error?.name !== 'AbortError') setState({ status: 'unavailable' });
      });
    return () => controller.abort();
  }, []);

  if (state.status === 'loading') return <main aria-busy="true">Verifying Service Operations access…</main>;
  if (state.status === 'unavailable') return <main><h1>Service Admin unavailable</h1><p>Authentication or the gateway is not available.</p></main>;
  if (state.status === 'denied') return <main><h1>Access required</h1><p>This view requires the service.operations.read role.</p><a href="/auth/entra/login">Sign in with Microsoft Entra</a></main>;
  return <>{children(state.session!)}</>;
}
