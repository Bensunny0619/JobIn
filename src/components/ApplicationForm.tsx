import { useState } from "react"
import { supabase } from "../lib/supabaseClient"
import toast from "react-hot-toast"

type Props = {
  onAdded: () => void
}

const STATUS_OPTIONS = [
  { label: "Applied", value: "applied" },
  { label: "Interview", value: "interview" },
  { label: "Offer", value: "offer" },
  { label: "Rejected", value: "rejected" },
]

export default function ApplicationForm({ onAdded }: Props) {
  const [company, setCompany] = useState("")
  const [position, setPosition] = useState("")
  const [status, setStatus] = useState("applied")
  const [dateApplied, setDateApplied] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setError("Unable to get user info.")
      toast.error("Unable to get user info")
      setLoading(false)
      return
    }

    const { error } = await supabase.from("applications").insert([
      {
        company,
        position,
        status,
        date_applied: dateApplied || new Date().toISOString().split("T")[0],
        user_id: user.id,
      },
    ])

    if (error) {
      setError(error.message)
      toast.error(`Failed to add: ${error.message}`)
    } else {
      setCompany("")
      setPosition("")
      setStatus("applied")
      setDateApplied("")
      onAdded()
      toast.success("Application added successfully 🎉")
    }

    setLoading(false)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-md p-6 space-y-6 border border-gray-200"
    >
      <h2 className="text-xl font-semibold text-gray-800">Add Job Application</h2>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Company */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
            placeholder="e.g. Google"
            className="w-full h-10 border border-gray-300 rounded-md text-gray-300 px-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Position */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
          <input
            type="text"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            required
            placeholder="e.g. Frontend Developer"
            className="w-full h-10 border border-gray-300 rounded-md text-gray-300 px-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Applied */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date Applied</label>
          <input
            type="date"
            value={dateApplied}
            onChange={(e) => setDateApplied(e.target.value)}
            className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-700 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Adding..." : "Add Application"}
        </button>
      </div>
    </form>
  )
}
