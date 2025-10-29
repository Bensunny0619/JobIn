import { useEffect, useState, useMemo } from "react"
import { supabase } from "../lib/supabaseClient"
import ApplicationForm from "../components/ApplicationForm"
import Navbar from "../components/Navbar"
import EditJobModal from "../components/EditJobModal"
import toast, { Toaster } from "react-hot-toast"
import Notes from "../components/Notes"
import AnalyticsDashboard from "../components/AnalyticsDashboard"

import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"

import DraggableCard from "../components/DraggableCard"
import DroppableColumn from "../components/DroppableColumn"

type Job = {
  id: string
  company: string
  position: string
  status: string
  date_applied: string
}

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "kanban" | "analytics">("grid")
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  function toggleNotes(jobId: string) {
    setExpandedJobId((prev) => (prev === jobId ? null : jobId))
  }

  const statuses = ["applied", "interview", "offer", "rejected"]

  async function fetchJobs() {
    setLoading(true)
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .order("date_applied", { ascending: false })

    if (!error && data) {
      setJobs(data)
    } else if (error) {
      console.error("❌ Fetch error:", error)
      toast.error("Failed to fetch jobs")
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  const filteredJobs = useMemo(() => {
    if (!searchTerm) {
      return jobs
    }
    return jobs.filter(
      (job) =>
        job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.position.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [jobs, searchTerm])

  function openEdit(job: Job) {
    setSelectedJob(job)
    setIsEditOpen(true)
  }

  async function handleDelete(id: string) {
    const confirmDelete = window.confirm("Are you sure you want to delete this application?")
    if (!confirmDelete) return

    setDeletingId(id)
    const { error } = await supabase.from("applications").delete().eq("id", id)

    if (error) {
      console.error("Delete error:", error.message)
      toast.error("Failed to delete application")
    } else {
      fetchJobs()
      toast.success("Application deleted ✅")
    }

    setDeletingId(null)
  }

  const groupedJobs = useMemo(() => {
    const map: Record<"applied" | "interview" | "offer" | "rejected", Job[]> = {
      applied: [],
      interview: [],
      offer: [],
      rejected: [],
    }
    filteredJobs.forEach((job) => {
      const status = job.status as keyof typeof map
      if (map[status]) {
        map[status].push(job)
      }
    })
    return map
  }, [filteredJobs])

  const sensors = useSensors(useSensor(PointerSensor))

  async function handleDragEnd(event: any) {
    const { active, over } = event

    if (!over) return

    const activeId = active.id.toString()
    const overId = over.id.toString()

    if (activeId === overId) return

    let newStatus: string | null = null
    let movedJob: Job | null = jobs.find((j) => j.id === activeId) || null
    if (!movedJob) return

    if (over.data.current?.type === "column") {
      newStatus = overId
    } 
    else if (over.data.current?.type === "card") {
      const overJob = jobs.find((j) => j.id === overId)
      if (!overJob) return
      newStatus = overJob.status
    }

    if (newStatus && movedJob.status !== newStatus) {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === movedJob!.id ? { ...j, status: newStatus! } : j
        )
      )
      const { error } = await supabase
        .from("applications")
        .update({ status: newStatus })
        .eq("id", movedJob.id)
      if (error) {
        console.error("❌ Supabase update error:", error)
        toast.error("Failed to update status")
        fetchJobs();
      } else {
        toast.success(`Moved to ${newStatus}`)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      <Toaster position="top-right" />

      <div className="flex justify-between p-6 max-w-7xl mx-auto items-center">
        <div className="flex gap-2">
          <button onClick={() => setViewMode("grid")} className={`px-4 py-2 rounded transition ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}>Grid View</button>
          <button onClick={() => setViewMode("kanban")} className={`px-4 py-2 rounded transition ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}>Kanban View</button>
          <button onClick={() => setViewMode("analytics")} className={`px-4 py-2 rounded transition ${viewMode === 'analytics' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}>Analytics</button>
        </div>
      </div>

      <main className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* === THIS IS THE FIX === */}
        {/* Only show the form if the view is NOT analytics */}
        {viewMode !== 'analytics' && <ApplicationForm onAdded={fetchJobs} />}
        {/* ======================= */}

        {loading ? (
          <p className="text-center">Loading applications...</p>
        ) : jobs.length === 0 ? (
          <p className="text-center text-gray-500">No applications yet. Add one above to get started!</p>
        ) : filteredJobs.length === 0 ? (
          <p className="text-center text-gray-500">No applications match your search.</p>
        ) : (
          <>
            {viewMode === 'grid' && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredJobs.map((job) => (
                  <div key={job.id} className="bg-white rounded-xl shadow p-4 space-y-2 border border-gray-100 w-full">
                    <h2 className="font-semibold text-lg text-gray-800">{job.position}</h2>
                    <p className="text-sm text-gray-600">{job.company}</p>
                    <span className={`inline-block px-3 py-1 text-sm rounded-full font-medium ${job.status === "applied" ? "bg-blue-100 text-blue-600" : job.status === "interview" ? "bg-green-100 text-green-600" : job.status === "offer" ? "bg-purple-100 text-purple-600" : "bg-red-100 text-red-600"}`}>
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </span>
                    <p className="text-xs text-gray-400">Applied on: {job.date_applied}</p>
                    <div className="pt-2 flex justify-between items-center">
                      <button onClick={() => openEdit(job)} className="text-sm text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(job.id)} disabled={deletingId === job.id} className="text-sm text-red-600 hover:underline disabled:opacity-50">
                        {deletingId === job.id ? "Deleting..." : "Delete"}
                      </button>
                      <button onClick={() => toggleNotes(job.id)} className="text-xs text-gray-600 hover:text-gray-800">
                        {expandedJobId === job.id ? "Hide Notes" : "Show Notes"}
                      </button>
                    </div>
                    {expandedJobId === job.id && <Notes applicationId={job.id} />}
                  </div>
                ))}
              </div>
            )}
            
            {viewMode === 'kanban' && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                 <div className="flex gap-4 overflow-x-auto pb-4 items-start">
                    {statuses.map((status) => (
                      <DroppableColumn key={status} id={status} data={{ type: "column", columnId: status }}>
                        <div className="flex flex-col gap-3 w-64">
                          <h3 className="font-bold text-lg mb-4 capitalize">{status}</h3>
                          <SortableContext items={groupedJobs[status as keyof typeof groupedJobs].map((job) => job.id.toString())} strategy={verticalListSortingStrategy}>
                            {groupedJobs[status as keyof typeof groupedJobs].map((job) => (
                              <DraggableCard key={job.id} job={job} onEdit={openEdit} onDelete={handleDelete} />
                            ))}
                          </SortableContext>
                        </div>
                      </DroppableColumn>
                    ))}
                  </div>
              </DndContext>
            )}

            {viewMode === 'analytics' && <AnalyticsDashboard jobs={filteredJobs} />}
          </>
        )}

        {isEditOpen && selectedJob && (
          <EditJobModal
            job={selectedJob}
            onClose={() => setIsEditOpen(false)}
            onUpdated={fetchJobs}
          />
        )}
      </main>
    </div>
  )
}