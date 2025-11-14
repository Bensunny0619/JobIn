// App.tsx
import { useEffect, useState } from "react"
import { Routes, Route, Outlet, Navigate } from "react-router-dom"
import { supabase } from "./lib/supabaseClient"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Profile from "./pages/Profile"
import ProtectedRoute from "./components/ProtectedRoute"
import Navbar from "./components/Navbar"
import { Toaster } from "react-hot-toast"
import { Session } from '@supabase/supabase-js'

// This MainLayout component remains the same
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

  // This useEffect is now the single source of truth for the auth state.
  // It correctly handles the initial session and any changes (login/logout).
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Show a global loading indicator while the initial session is being checked.
  if (loading) {
    return <div className="h-screen grid place-items-center">Loading...</div>;
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
        {/* The Login route is accessible to everyone */}
        <Route path="/login" element={<Login />} />
        
        {/* These routes are protected */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* If the user is logged in and goes to "/", redirect them to the dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        
        {/* This is a fallback route. If a user is logged in, send them to the dashboard.
            If they are not, send them to the login page. */}
        <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </>
  )
}