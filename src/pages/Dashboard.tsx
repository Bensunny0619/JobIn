import { useEffect, useState, useMemo } from "react"
import { supabase } from "../lib/supabaseClient"
import ApplicationForm from "../components/ApplicationForm"
import EditJobModal from "../components/EditJobModal"
import toast, { Toaster } from "react-hot-toast"
import Notes from "../components/Notes"
import AnalyticsDashboard from "../components/AnalyticsDashboard"
import JobSearchModal from "../components/JobSearchModal"
import { useOutletContext } from "react-router-dom";
import Papa from 'papaparse';
import EmptyState from "../components/EmptyState"; // <-- You already have this

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
  interview_date?: string | null; 
  match_analysis?: any | null;
}

type AppContext = { searchTerm: string; };

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "kanban" | "analytics">("grid")
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null)
  const [isJobSearchOpen, setIsJobSearchOpen] = useState(false); 
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [selectedJobForAnalysis, setSelectedJobForAnalysis] = useState<Job | null>(null);
  const [isAnalyzingMatch, setIsAnalyzingMatch] = useState(false);
  const { searchTerm } = useOutletContext<AppContext>();

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
    if (!error && data) setJobs(data)
    else if (error) toast.error("Failed to fetch jobs")
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

  async function handleApplyNow(job: Job) {
    if (!job.job_url) {
      toast.error("No job URL found for this application.");
      return;
    }
    window.open(job.job_url, "_blank", "noopener,noreferrer");
    setJobs((prevJobs) => prevJobs.map((j) => j.id === job.id ? { ...j, status: "applied" } : j));
    const { error } = await supabase.from("applications").update({ status: "applied" }).eq("id", job.id);
    if (error) {
      toast.error("Failed to update status. Please move the card manually.");
      fetchJobs();
    } else {
      toast.success(`Moved "${job.position}" to Applied!`);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this application?")) return;
    setDeletingId(id)
    const { error } = await supabase.from("applications").delete().eq("id", id)
    if (error) {
      toast.error("Failed to delete application")
    } else {
      fetchJobs()
      toast.success("Application deleted ✅")
    }
    setDeletingId(null)
  }

  const groupedJobs = useMemo(() => {
     const map: Record<string, Job[]> = {
      saved: [], applied: [], interview: [], offer: [], rejected: [],
    }
    filteredJobs.forEach((job) => {
      if (map[job.status]) map[job.status].push(job)
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
    const movedJob = jobs.find((j) => j.id === activeId)
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
    if (job.match_analysis) return;
    setIsAnalyzingMatch(true);
    try {
      const { data, error } = await supabase.functions.invoke('job-matcher', {
        body: { applicationId: job.id },
      });
      if (error) throw new Error(error.message);
      await fetchJobs();
      toast.success("Match analysis complete!");
    } catch (err: any) {
      toast.error(`Analysis failed: ${err.message}`);
      setIsMatchModalOpen(false);
    } finally {
      setIsAnalyzingMatch(false);
    }
  }

  function handleExportCSV() {
    if (filteredJobs.length === 0) {
      toast.error("No data to export.");
      return;
    }
    const dataToExport = filteredJobs.map(job => ({
      Company: job.company,
      Position: job.position,
      Status: job.status,
      DateApplied: job.date_applied,
      InterviewDate: job.interview_date || 'N/A',
      URL: job.job_url || 'N/A',
    }));
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'job_applications.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Data exported successfully!");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <div className="flex justify-between p-6 max-w-7xl mx-auto items-center">
        <div className="flex gap-2">
          <button onClick={() => setViewMode("grid")} className={`px-4 py-2 rounded transition ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}>Grid View</button>
          <button onClick={() => setViewMode("kanban")} className={`px-4 py-2 rounded transition ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}>Kanban View</button>
          <button onClick={() => setViewMode("analytics")} className={`px-4 py-2 rounded transition ${viewMode === 'analytics' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}>Analytics</button>
        </div>
        <button 
          onClick={handleExportCSV} 
          className="bg-green-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-green-700 transition"
        >
          Export to CSV
        </button>
      </div>
      <main className="p-6 pt-0 space-y-6 max-w-7xl mx-auto">
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
        
        {loading ? (
          <p className="text-center">Loading applications...</p>
        ) : jobs.length === 0 ? (
          // --- FIX #1: USE THE EMPTYSTATE COMPONENT ---
          <EmptyState message="No applications yet" details="Add your first job application above to get started!" />
        ) : filteredJobs.length === 0 ? (
          // --- FIX #1: USE THE EMPTYSTATE COMPONENT ---
          <EmptyState message="No applications match your search" details="Try a different company or position." />
        ) : (
          <>
            {viewMode === 'grid' && ( 
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"> 
                {filteredJobs.map((job) => (
                  <div key={job.id} className="bg-white rounded-xl shadow p-4 space-y-2 border border-gray-100 w-full">
                     {/* ... your existing grid view card content ... */}
                     <h2 className="font-semibold text-lg text-gray-800">{job.position}</h2> 
                     <p className="text-sm text-gray-600">{job.company}</p> 
                     <span className={`inline-block px-3 py-1 text-sm rounded-full font-medium ${ job.status === "saved" ? "bg-yellow-100 text-yellow-700" :job.status === "applied" ? "bg-blue-100 text-blue-600" : job.status === "interview" ? "bg-green-100 text-green-600" : job.status === "offer" ? "bg-purple-100 text-purple-600" : "bg-red-100 text-red-600"}`}> {job.status.charAt(0).toUpperCase() + job.status.slice(1)} </span> 
                     <p className="text-xs text-gray-400">Applied on: {job.date_applied}</p> 
                     <div className="pt-2">
                      {job.status === 'saved' ? (
                        <button onClick={() => handleApplyNow(job)} className="w-full bg-green-600 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-green-700 transition">Apply Now</button>
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
                  {statuses.map((status) => {
                    // --- FIX #2: DEFINE jobsInStatus HERE ---
                    const jobsInStatus = groupedJobs[status] || [];
                    return (
                      <DroppableColumn key={status} id={status} data={{ type: "column", columnId: status }}>
                        <div className="flex flex-col gap-3 w-72">
                          <h3 className="font-bold text-lg mb-2 capitalize px-1">{status} ({jobsInStatus.length})</h3>
                          <SortableContext items={jobsInStatus.map(job => job.id.toString())} strategy={verticalListSortingStrategy}>
                            {jobsInStatus.length > 0 ? (
                              jobsInStatus.map((job) => (
                                <DraggableCard 
                                  key={job.id} 
                                  job={job} 
                                  onEdit={openEdit} 
                                  onDelete={handleDelete} 
                                  onApplyNow={handleApplyNow} 
                                  onAnalyze={handleAnalyzeMatch} 
                                />
                              ))
                            ) : (
                              // --- FIX #2: THE EMPTY STATE FOR KANBAN COLUMNS ---
                              <div className="p-4 text-center text-xs text-gray-400 border-2 border-dashed rounded-lg">
                                Drag jobs here
                              </div>
                            )}
                          </SortableContext>
                        </div>
                      </DroppableColumn>
                    );
                  })}
                </div>
              </DndContext>
            )}
            {viewMode === 'analytics' && <AnalyticsDashboard jobs={filteredJobs} />}
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