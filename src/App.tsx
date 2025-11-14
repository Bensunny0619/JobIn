// App.tsx
import { useEffect, useState } from "react"
import { Routes, Route, Outlet, Navigate } from "react-router-dom" // Import Navigate
import { supabase } from "./lib/supabaseClient"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Profile from "./pages/Profile"
import ProtectedRoute from "./components/ProtectedRoute"
import Navbar from "./components/Navbar"
import { Toaster } from "react-hot-toast"

// This MainLayout component is correct and does not need to change.
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
  // Your Supabase connection check is good and can remain.
  const [supabaseStatus, setSupabaseStatus] = useState<"checking" | "ok" | "error">("checking")
  useEffect(() => {
    const checkConnection = async () => {
      const { error } = await supabase.from("applications").select("*").limit(1)
      if (error) setSupabaseStatus("error")
      else setSupabaseStatus("ok")
    }
    checkConnection()
  }, [])
  if (supabaseStatus === "checking") return <div className="grid place-items-center h-screen">Loading...</div>
  if (supabaseStatus === "error") return <div className="grid place-items-center h-screen text-center">...</div>

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
        <Route path="/login" element={<Login />} />
        
        {/* This is the main protected route section */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* --- THIS IS THE ONLY FIX YOU NEED --- */}
          {/* This line tells the router to redirect to "/dashboard" by default
              when the user is at the root "/" path. */}
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Your existing nested routes remain the same */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        
        {/* Your fallback route remains the same */}
        <Route path="*" element={<Login />} />
      </Routes>
    </>
  )
}