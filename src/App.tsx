// App.tsx
import { useEffect, useState } from "react"
import { Routes, Route } from "react-router-dom"
import { supabase } from "./lib/supabaseClient"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import ProtectedRoute from "./components/ProtectedRoute"

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
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Login />} />
    </Routes>
  )
}
