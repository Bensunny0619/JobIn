// App.tsx
import { useEffect, useState } from "react"
import { Routes, Route, Outlet } from "react-router-dom" // Import Outlet
import { supabase } from "./lib/supabaseClient"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Profile from "./pages/Profile" // Import Profile
import ProtectedRoute from "./components/ProtectedRoute"
import Navbar from "./components/Navbar" // Import Navbar
import { Toaster } from "react-hot-toast"

// A layout component that includes the Navbar
const MainLayout = () => {
  // You might need to pass search state down if you keep it at the Dashboard level
  // For now, let's simplify.
  const [searchTerm, setSearchTerm] = useState("");
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      {/* The Outlet component will render the matched child route element */}
      <Outlet context={{ searchTerm, setSearchTerm }} /> 
    </div>
  );
};


export default function App() {
  const [supabaseStatus, setSupabaseStatus] = useState<
    "checking" | "ok" | "error"
  >("checking")

  useEffect(() => {
    const checkConnection = async () => {
      const { error } = await supabase.from("applications").select("*").limit(1)
      if (error) {
        console.error("❌ Supabase connection error:", error.message)
        setSupabaseStatus("error")
      } else {
        setSupabaseStatus("ok")
      }
    }
    checkConnection()
  }, [])

  if (supabaseStatus === "checking") {
    return <div className="grid place-items-center h-screen">Loading...</div>
  }

  if (supabaseStatus === "error") {
    return (
      <div className="grid place-items-center h-screen text-center">
        <Toaster position="top-right" reverseOrder={false} />
        <h1 className="text-xl font-bold text-red-600">
          Supabase connection failed 🚨
        </h1>
        <p className="mt-2">
          Check your <code>SUPABASE_URL</code> and{" "}
          <code>SUPABASE_ANON_KEY</code> in <code>lib/supabase.ts</code>.
        </p>
      </div>
    )
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
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* Nested routes will render inside MainLayout's Outlet */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Login />} />
      </Routes>
    </>
  )
}