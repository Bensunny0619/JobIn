import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import Notes from "../components/Notes"
import { format } from 'date-fns'
import toast from 'react-hot-toast' // <-- Import toast

type Job = {
  id: string
  company: string
  position: string
  status: string
  date_applied: string
  job_url?: string | null;
  interview_date?: string | null; // <-- ADD THIS FIELD
  match_analysis?: any | null;
}

type Props = {
  job: Job
  onEdit: (job: Job) => void
  onDelete: (id: string) => void
  onApplyNow: (job: Job) => void; 
  onAnalyze: (job: Job) => void; 
}

export default function DraggableCard({ job, onEdit, onDelete, onApplyNow, onAnalyze }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: job.id.toString(), data: { type: "card" } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const [showNotes, setShowNotes] = useState(false)

  // --- This function now lives INSIDE the component ---
  function handleSchedule() {
    if (!job.interview_date) {
        toast.error("Please set an interview date first by editing the job.");
        return;
    }

    const startTime = new Date(job.interview_date);
    // Assume the interview is 1 hour long
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    // Format dates for Google Calendar URL (YYYYMMDDTHHMMSSZ)
    // We need to be careful about timezones, so we format without the 'Z'
    const gCalStartTime = format(startTime, "yyyyMMdd'T'HHmmss");
    const gCalEndTime = format(endTime, "yyyyMMdd'T'HHmmss");

    const eventDetails = {
        text: `Interview: ${job.position} at ${job.company}`,
        dates: `${gCalStartTime}/${gCalEndTime}`,
        details: `Interview for the ${job.position} role. Good luck!`,
    };

    const gCalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventDetails.text)}&dates=${eventDetails.dates}&details=${encodeURIComponent(eventDetails.details)}`;

    window.open(gCalUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="bg-white rounded-lg shadow p-3 space-y-2 border border-gray-200 mb-3 w-full text-sm"
    >
      {/* Job info + drag handle */}
      <div className="cursor-grab active:cursor-grabbing" {...listeners}>
        <h2 className="font-semibold text-base text-gray-800 truncate">{job.position}</h2>
        <p className="text-xs text-gray-600 truncate">{job.company}</p>
        <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full font-medium ${
            job.status === "saved" ? "bg-yellow-100 text-yellow-700"
            : job.status === "applied" ? "bg-blue-100 text-blue-600"
            : job.status === "interview" ? "bg-green-100 text-green-600"
            : job.status === "offer" ? "bg-purple-100 text-purple-600"
            : "bg-red-100 text-red-600"
          }`}>
          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
        </span>
        <p className="text-[11px] text-gray-400">
          {job.status === 'saved' ? 'Saved on' : 'Applied on'}: {job.date_applied}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="pt-2">
        {job.status === 'saved' ? (
          <button
            onClick={() => onApplyNow(job)}
            className="w-full bg-green-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-green-700 transition"
          >
            Apply Now
          </button>
        ) : (
          <div className="flex justify-between items-center flex-wrap gap-2">
            <button onClick={() => onEdit(job)} className="text-xs text-blue-600 hover:underline">Edit</button>
            <button onClick={() => onAnalyze(job)} className="text-xs text-green-600 hover:underline">Analyze</button>
            
            {/* --- The "Schedule" button is now correctly placed here --- */}
            {job.status === 'interview' && (
              <button onClick={handleSchedule} className="text-xs text-purple-600 hover:underline">Schedule</button>
            )}

            <button onClick={() => onDelete(job.id)} className="text-xs text-red-600 hover:underline">Delete</button>
            <button onClick={() => setShowNotes((prev) => !prev)} className="text-xs text-gray-600 hover:text-gray-800">
              {showNotes ? "Hide Notes" : "Show Notes"}
            </button>
          </div>
        )}
      </div>

      {/* Collapsible Notes */}
      {showNotes && (
        <div className="mt-2 w-full">
          <div className="bg-gray-50 border border-gray-200 rounded-md p-2 max-h-32 overflow-y-auto text-xs w-full">
            <Notes applicationId={job.id} />
          </div>
        </div>
      )}
    </div>
  )
}