import { useState } from "react"
import { supabase } from "../lib/supabaseClient"

type Props = {
  onAdded: () => void // callback to refresh jobs after adding
}

export default function ApplicationForm({ onAdded }: Props) {
  const [company, setCompany] = useState("")
  const [position, setPosition] = useState("")
  const [status, setStatus] = useState("Applied")
  const [dateApplied, setDateApplied] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.from("applications").insert([
      {
        company,
        position,
        status,
        date_applied: dateApplied || new Date().toISOString().split("T")[0],
      },
    ])

    if (error) {
      setError(error.message)
    } else {
      setCompany("")
      setPosition("")
      setStatus("Applied")
      setDateApplied("")
      onAdded()
    }

    setLoading(false)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-md p-6 space-y-4"
    >
      <h2 className="text-xl font-heading font-semibold">Add Job Application</h2>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">Company</label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Position</label>
          <input
            type="text"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            required
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium mb-1">Status</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border rounded-lg p-2"
          >
            <option>Applied</option>
            <option>Interview</option>
            <option>Offer</option>
            <option>Rejected</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date Applied</label>
          <input
            type="date"
            value={dateApplied}
            onChange={(e) => setDateApplied(e.target.value)}
            className="w-full border rounded-lg p-2"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-brand text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? "Adding..." : "Add Application"}
      </button>
    </form>
  )
}
