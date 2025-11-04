import { useEffect, useState, useMemo } from "react"
import { supabase } from "../lib/supabaseClient"
import ApplicationForm from "../components/ApplicationForm"
import EditJobModal from "../components/EditJobModal"
import toast, { Toaster } from "react-hot-toast"
import Notes from "../components/Notes"
import AnalyticsDashboard from "../components/AnalyticsDashboard"
import JobSearchModal from "../components/JobSearchModal" // Import the new modal

import { DndContext, useSensor, useSensors, PointerSensor, closestCenter } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"

import DraggableCard from "../components/DraggableCard"
import DroppableColumn from "../components/DroppableColumn"
import MatchAnalysisModal from "../components/MatchAnalysisModal";

type Job = {
  id: string
  company: string
  position: string
  status: string
  date_applied: string
  job_url?: string | null;
  match_analysis: any;
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
  const [isJobSearchOpen, setIsJobSearchOpen] = useState(false); 
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [selectedJobForAnalysis, setSelectedJobForAnalysis] = useState<Job | null>(null);
  const [isAnalyzingMatch, setIsAnalyzingMatch] = useState(false);

  // All other functions (fetchJobs, handleDelete, etc.) remain unchanged
  // ... (copy all your existing functions here)
    function toggleNotes(jobId: string) {
    setExpandedJobId((prev) => (prev === jobId ? null : jobId))
  }

  const statuses = ["saved", "applied", "interview", "offer", "rejected"]

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
    if (!searchTerm) return jobs;
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


  // Inside the Dashboard component, after the handleDelete function

async function handleApplyNow(job: Job) {
  if (!job.job_url) {
    toast.error("No job URL found for this application.");
    return;
  }

  // 1. Open the job URL in a new tab immediately for the user.
  window.open(job.job_url, "_blank", "noopener,noreferrer");

  // 2. Perform an optimistic UI update.
  setJobs((prevJobs) =>
    prevJobs.map((j) =>
      j.id === job.id ? { ...j, status: "applied" } : j
    )
  );
  
  // 3. Update the database in the background.
  const { error } = await supabase
    .from("applications")
    .update({ status: "applied" })
    .eq("id", job.id);

  if (error) {
    toast.error("Failed to update status. Please move the card manually.");
    console.error("❌ Apply Now update error:", error);
    // If the update fails, revert the change by refetching the true state.
    fetchJobs();
  } else {
    toast.success(`Moved "${job.position}" to Applied!`);
  }
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

   async function handleApplyNow(job: Job) {
    if (!job.job_url) {
      toast.error("No job URL found for this application.");
      return;
    }

    window.open(job.job_url, "_blank", "noopener,noreferrer");

    setJobs((prevJobs) =>
      prevJobs.map((j) =>
        j.id === job.id ? { ...j, status: "applied" } : j
      )
    );
    
    const { error } = await supabase
      .from("applications")
      .update({ status: "applied" })
      .eq("id", job.id);

    if (error) {
      toast.error("Failed to update status. Please move the card manually.");
      fetchJobs(); // Revert on error
    } else {
      toast.success(`Moved "${job.position}" to Applied!`);
    }
  }

  const groupedJobs = useMemo(() => {
     const map: Record<"saved" | "applied" | "interview" | "offer" | "rejected", Job[]> = {
      saved: [], 
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
    // ... same handleDragEnd function
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
    } else if (over.data.current?.type === "card") {
      const overJob = jobs.find((j) => j.id === overId)
      if (!overJob) return
      newStatus = overJob.status
    }
    if (newStatus && movedJob.status !== newStatus) {
      setJobs((prev) => prev.map((j) => j.id === movedJob!.id ? { ...j, status: newStatus! } : j))
      const { error } = await supabase.from("applications").update({ status: newStatus }).eq("id", movedJob.id)
      if (error) {
        toast.error("Failed to update status")
        fetchJobs();
      } else {
        toast.success(`Moved to ${newStatus}`)
      }
    }
  }


   async function handleAnalyzeMatch(job: Job) {
    setSelectedJobForAnalysis(job);
    setIsMatchModalOpen(true);

    // If analysis already exists, don't re-run
    if (job.match_analysis) return;

    setIsAnalyzingMatch(true);
    try {
      const { data, error } = await supabase.functions.invoke('job-matcher', {
        body: { applicationId: job.id },
      });

      if (error) throw new Error(error.message);

      // Refetch jobs to get the new analysis data
      await fetchJobs();
      toast.success("Match analysis complete!");
    } catch (err: any) {
      toast.error(`Analysis failed: ${err.message}`);
      setIsMatchModalOpen(false); // Close modal on error
    } finally {
      setIsAnalyzingMatch(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* <Navbar searchTerm={searchTerm} onSearchChange={setSearchTerm} /> */}
      <Toaster position="top-right" />
      <div className="flex justify-between p-6 max-w-7xl mx-auto items-center">
        <div className="flex gap-2">
          <button onClick={() => setViewMode("grid")} className={`px-4 py-2 rounded transition ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}>Grid View</button>
          <button onClick={() => setViewMode("kanban")} className={`px-4 py-2 rounded transition ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}>Kanban View</button>
          <button onClick={() => setViewMode("analytics")} className={`px-4 py-2 rounded transition ${viewMode === 'analytics' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}>Analytics</button>
        </div>
      </div>
      <main className="p-6 space-y-6 max-w-7xl mx-auto">
        {viewMode !== 'analytics' && (
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Add Job Application</h2>
              <button 
                onClick={() => setIsJobSearchOpen(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-md font-medium hover:bg-green-700 transition"
              >
                Find Jobs Online
              </button>
            </div>
            <ApplicationForm onAdded={fetchJobs} />
          </div>
        )}
        {/* All the conditional view rendering logic remains the same */}
        {loading ? (
          <p className="text-center">Loading applications...</p>
        ) : jobs.length === 0 ? (
          <p className="text-center text-gray-500">No applications yet. Add one above to get started!</p>
        ) : filteredJobs.length === 0 ? (
          <p className="text-center text-gray-500">No applications match your search.</p>
        ) : (
          <>
            {viewMode === 'grid' && ( <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"> {filteredJobs.map((job) => (<div key={job.id} className="bg-white rounded-xl shadow p-4 space-y-2 border border-gray-100 w-full"> <h2 className="font-semibold text-lg text-gray-800">{job.position}</h2> <p className="text-sm text-gray-600">{job.company}</p> <span className={`inline-block px-3 py-1 text-sm rounded-full font-medium ${ job.status === "saved" ? "bg-yellow-100 text-yellow-700" :job.status === "applied" ? "bg-blue-100 text-blue-600" : job.status === "interview" ? "bg-green-100 text-green-600" : job.status === "offer" ? "bg-purple-100 text-purple-600" : "bg-red-100 text-red-600"}`}> {job.status.charAt(0).toUpperCase() + job.status.slice(1)} </span> <p className="text-xs text-gray-400">Applied on: {job.date_applied}</p> <div className="pt-2">
                      {job.status === 'saved' ? (
                        <button onClick={() => handleApplyNow(job)} className="w-full bg-green-600 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-green-700 transition">
                          Apply Now
                        </button>
                      ) : (
                        <div className="flex justify-between items-center">
                          <button onClick={() => openEdit(job)} className="text-sm text-blue-600 hover:underline">Edit</button>
                          <button onClick={() => handleDelete(job.id)} disabled={deletingId === job.id} className="text-sm text-red-600 hover:underline disabled:opacity-50">
                            {deletingId === job.id ? "Deleting..." : "Delete"}
                          </button>
                          <button onClick={() => toggleNotes(job.id)} className="text-xs text-gray-600 hover:text-gray-800">
                            {expandedJobId === job.id ? "Hide Notes" : "Show Notes"}
                          </button>
                        </div>
                      )}
                    </div>
                    {expandedJobId === job.id && <Notes applicationId={job.id} />}
                  </div>
                ))}
              </div>
            )}
            
            {viewMode === "kanban" && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="flex gap-4 overflow-x-auto pb-4 items-start">
                  {statuses.map((status) => (
                    <DroppableColumn key={status} id={status} data={{ type: "column", columnId: status }}>
                      <div className="flex flex-col gap-3 w-64">
                        <h3 className="font-bold text-lg mb-4 capitalize">{status}</h3>
                        <SortableContext items={groupedJobs[status as keyof typeof groupedJobs].map((job) => job.id.toString())} strategy={verticalListSortingStrategy}>
                          {groupedJobs[status as keyof typeof groupedJobs].map((job) => (
                            // UPDATED: Pass the new onApplyNow prop
                            <DraggableCard key={job.id} job={job} onEdit={openEdit} onDelete={handleDelete} onApplyNow={handleApplyNow} />
                          ))}
                        </SortableContext>
                      </div>
                    </DroppableColumn>
                  ))}
                </div>
              </DndContext>
            )}          {viewMode === 'analytics' && <AnalyticsDashboard jobs={filteredJobs} />}
          </>
        )}
        {isJobSearchOpen && ( <JobSearchModal isOpen={isJobSearchOpen} onClose={() => setIsJobSearchOpen(false)} onJobSaved={() => { fetchJobs(); setIsJobSearchOpen(false); }} /> )}
        {isEditOpen && selectedJob && ( <EditJobModal job={selectedJob} onClose={() => setIsEditOpen(false)} onUpdated={fetchJobs} /> )}


           {isMatchModalOpen && selectedJobForAnalysis && (
        <MatchAnalysisModal
          isOpen={isMatchModalOpen}
          onClose={() => setIsMatchModalOpen(false)}
          analysis={isAnalyzingMatch ? null : selectedJobForAnalysis.match_analysis}
          jobPosition={selectedJobForAnalysis.position}
        />
      )}
      </main>
    </div>
  )
}