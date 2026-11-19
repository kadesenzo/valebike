import { useCallback, useEffect, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { PublicShowcase } from './components/PublicShowcase';

function normalizePath(pathname: string): string {
  return pathname.startsWith('/gestao') ? '/gestao' : '/';
}

export default function App() {
  const [route, setRoute] = useState<string>(() => normalizePath(window.location.pathname));

  useEffect(() => {
    const onPopState = () => {
      setRoute(normalizePath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    document.title =
      route === '/gestao'
        ? 'Gestão · Vale Bike'
        : 'Vale Bike — Oficina, Peças e Bicicletas em Registro, SP';
  }, [route]);

  const navigate = useCallback((target: string) => {
    const next = normalizePath(target);
    if (window.location.pathname !== next) {
      window.history.pushState({}, '', next);
    }
    setRoute(next);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  if (route === '/gestao') {
    return <AdminDashboard onNavigate={navigate} />;
  }

  return <PublicShowcase onNavigate={navigate} />;
}
