import { useState } from "react"
import { supabase } from "../lib/supabaseClient"
import toast from "react-hot-toast"

type Job = {
  id: number
  company: string
  position: string
  status: string
  date_applied: string
}

type Props = {
  job: Job
  onClose: () => void
  onUpdated: () => void
}

const STATUS_OPTIONS = [
  { label: "Applied", value: "applied" },
  { label: "Interview", value: "interview" },
  { label: "Offer", value: "offer" },
  { label: "Rejected", value: "rejected" },
]

export default function EditJobModal({ job, onClose, onUpdated }: Props) {
  const [company, setCompany] = useState(job.company)
  const [position, setPosition] = useState(job.position)
  const [status, setStatus] = useState(job.status)
  const [dateApplied, setDateApplied] = useState(job.date_applied)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [interviewDate, setInterviewDate] = useState('');

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase
      .from("applications")
      .update({
        company,
        position,
        status,
        date_applied: dateApplied,
        interview_date: interviewDate || null,
      })
      .eq("id", job.id)

    if (error) {
      setError(error.message)
      toast.error(`Update failed: ${error.message}`)
    } else {
      onUpdated()
      onClose()
      toast.success("Application updated ✅")
    }

    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Edit Application</h2>

        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full h-10 text-gray-300 border border-gray-300 rounded-md px-3 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full h-10 text-gray-300 border border-gray-300 rounded-md px-3 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 text-gray-300 border border-gray-300 rounded-md px-3 text-sm"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {status === 'interview' && (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Interview Date & Time</label>
        <input
          type="datetime-local"
          value={interviewDate}
          onChange={(e) => setInterviewDate(e.target.value)}
          className="w-full h-10 text-gray-800 border border-gray-300 rounded-md px-3 text-sm"
        />
    </div>
)}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Applied</label>
            <input
              type="date"
              value={dateApplied}
              onChange={(e) => setDateApplied(e.target.value)}
              className="w-full h-10 text-gray-300 border border-gray-300 rounded-md px-3 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 text-sm rounded hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
