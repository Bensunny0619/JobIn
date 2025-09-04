// pages/Dashboard.tsx
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import ApplicationForm from "../components/ApplicationForm"
import Navbar from "../components/Navbar"


type Job = {
  id: number
  company: string
  position: string
  status: string
  date_applied: string
}

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchJobs() {
    setLoading(true)
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .order("date_applied", { ascending: false })

    if (!error && data) {
      setJobs(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  return (
    <div className="min-h-screen bg-brand.gray">
      <Navbar />

      <div className="flex justify-end p-6 max-w-7xl mx-auto">
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>

      <main className="p-6 space-y-6 max-w-7xl mx-auto">
        <ApplicationForm onAdded={fetchJobs} />

        {loading ? (
          <p>Loading...</p>
        ) : jobs.length === 0 ? (
          <p className="text-gray-500">No applications yet. Add one above.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-xl shadow p-4 space-y-2"
              >
                <h2 className="font-semibold text-lg">{job.position}</h2>
                <p className="text-sm text-gray-600">{job.company}</p>
                <span
                  className={`inline-block px-3 py-1 text-sm rounded-full ${
                    job.status === "Applied"
                      ? "bg-blue-100 text-blue-600"
                      : job.status === "Interview"
                      ? "bg-green-100 text-green-600"
                      : job.status === "Offer"
                      ? "bg-purple-100 text-purple-600"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {job.status}
                </span>
                <p className="text-xs text-gray-400">
                  Applied on: {job.date_applied}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
