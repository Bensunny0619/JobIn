// App.tsx
import { useEffect, useState } from "react"
import { Routes, Route, Outlet, Navigate } from "react-router-dom"
import { supabase } from "./lib/supabaseClient"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Profile from "./pages/Profile"
import Navbar from "./components/Navbar"
import { Toaster } from "react-hot-toast"
import type { Session } from '@supabase/supabase-js'

const MainLayout = () => {
  const [searchTerm, setSearchTerm] = useState("");
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      <Outlet context={{ searchTerm, setSearchTerm }} /> 
    </div>
  );
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This listener is the key. It fires once on initial load (INITIAL_SESSION)
    // and again whenever the auth state changes (SIGNED_IN, SIGNED_OUT).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false); // We are no longer loading once we have this initial information.
    });

    // Cleanup the subscription when the component unmounts
    return () => subscription.unsubscribe();
  }, []);

  // While waiting for the initial auth state, show a loading screen.
  // This prevents the "race condition".
  if (loading) {
    return <div className="h-screen grid place-items-center">Authenticating...</div>;
  }
  
  return (
    <>
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
            className: "bg-blue-600 text-white rounded-lg shadow-lg px-4 py-2",
            duration: 3000,
            style: { background: "none" },
            success: { className: "bg-green-600 text-white rounded-lg shadow-lg px-4 py-2" },
            error: { className: "bg-red-600 text-white rounded-lg shadow-lg px-4 py-2" },
        }}
      />
      <Routes>
        {/* If there is NO session, only the /login route is available.
            All other paths will redirect to /login. */}
        {!session ? (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          /* If there IS a session, the protected routes are available. */
          <>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            {/* If a logged-in user tries to go to /login, send them to the dashboard instead. */}
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>
        )}
      </Routes>
    </>
  )
}