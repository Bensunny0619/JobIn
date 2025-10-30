import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { supabase } from "../lib/supabaseClient";
import toast from "react-hot-toast";

type RemoteJob = {
  id: string;
  company: string;
  position: string;
  tags: string[];
  location: string;
  url: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onJobSaved: () => void;
};

// --- NEW: Define search sources ---
const SEARCH_SOURCES = {
  REMOTE_OK: 'RemoteOK',
  GOOGLE_JOBS: 'Google Jobs (via SerpApi)',
};

export default function JobSearchModal({ isOpen, onClose, onJobSaved }: Props) {
  const [searchTerm, setSearchTerm] = useState("React Developer");
  const [results, setResults] = useState<RemoteJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  
  // --- NEW: State for the selected search source ---
  const [source, setSource] = useState(SEARCH_SOURCES.GOOGLE_JOBS);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      let data;
      if (source === SEARCH_SOURCES.REMOTE_OK) {
        const response = await fetch(`https://remoteok.com/api?tag=${searchTerm}`);
        if (!response.ok) throw new Error("Network response was not ok.");
        const rawData = await response.json();
        data = rawData.slice(1); // Remove legal notice
      } else {
        // --- NEW: Call the Supabase Edge Function ---
        const { data: functionData, error: functionError } = await supabase.functions.invoke(
          'job-search',
          { body: { searchTerm } }
        );

        if (functionError) throw new Error(functionError.message);
        data = functionData.jobs;
      }
      setResults(data);

    } catch (err: any) {
      setError(`Failed to fetch jobs: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleSearch();
    }
  }, [isOpen, source]); // Re-run search if source changes

  const handleSaveJob = async (job: RemoteJob) => {
    // ... (This function remains exactly the same)
    setSavingId(job.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to save a job.");
      setSavingId(null);
      return;
    }

    const { error } = await supabase.from("applications").insert({
      company: job.company,
      position: job.position,
      job_url: job.url,
      location: job.location,
      user_id: user.id,
      status: 'saved',
      date_applied: new Date().toISOString().split("T")[0],
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${job.position} at ${job.company} saved!`);
      onJobSaved();
    }
    setSavingId(null);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl h-[80vh] flex flex-col rounded-xl bg-white">
          <div className="p-6 border-b">
            <Dialog.Title className="text-xl font-semibold">Find Jobs Online</Dialog.Title>
            {/* --- NEW: Form includes a source selector --- */}
            <form onSubmit={handleSearch} className="flex gap-2 mt-4 items-center">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by tag (e.g., React, Python...)"
                className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm"
              />
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="h-10 border border-gray-300 rounded-md px-3 text-sm"
              >
                <option>{SEARCH_SOURCES.GOOGLE_JOBS}</option>
                <option>{SEARCH_SOURCES.REMOTE_OK}</option>
              </select>
              <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50">
                {loading ? '...' : 'Search'}
              </button>
            </form>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
             {/* ... (rest of the JSX remains the same) ... */}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}