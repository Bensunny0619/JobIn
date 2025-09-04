// components/ProtectedRoute.tsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAuthed(!!data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
    });

    return () => {
      sub.subscription.unsubscribe();
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="h-screen grid place-items-center">Loading...</div>;
  }

  if (!authed) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
