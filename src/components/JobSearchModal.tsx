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

const SEARCH_SOURCES = {
  GOOGLE_JOBS: 'Google Jobs (via SerpApi)',
  REMOTE_OK: 'RemoteOK',
};

export default function JobSearchModal({ isOpen, onClose, onJobSaved }: Props) {
  const [searchTerm, setSearchTerm] = useState("React Developer");
  const [results, setResults] = useState<RemoteJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [source, setSource] = useState(SEARCH_SOURCES.GOOGLE_JOBS);
  
  // --- NEW: State to track jobs saved during this modal session ---
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());

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
        data = rawData.slice(1);
      } else {
        const { data: functionData, error: functionError } = await supabase.functions.invoke(
          'job-search',
          { body: { searchTerm } }
        );
        if (functionError) {
          const errorMessage = functionError.context?.msg || functionError.message;
          throw new Error(errorMessage);
        }
        data = functionData.jobs;
      }
      setResults(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to fetch jobs: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  // Run initial search and clear saved IDs when the modal opens
  useEffect(() => {
    if (isOpen) {
      setSavedJobIds(new Set()); // Reset on open
      handleSearch();
    }
  }, [isOpen]);

  const handleSaveJob = async (job: RemoteJob) => {
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
      onJobSaved(); // This just refetches jobs in the background now
      // --- NEW: Add the job ID to our set of saved jobs ---
      setSavedJobIds(prev => new Set(prev).add(job.id));
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
            <form onSubmit={handleSearch} className="flex gap-2 mt-4 items-center">
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="e.g., React, Python..." className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm" />
              <select
                aria-label="Job search source"
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
            {loading && <p className="text-center">Loading...</p>}
            {error && <p className="text-center text-red-500">{error}</p>}
            {!loading && !error && (
              results.length === 0 ? (
                <p className="text-center text-gray-500">No jobs found for "{searchTerm}".</p>
              ) : (
                <ul className="space-y-4">
                  {results.map((job) => {
                    const isSaving = savingId === job.id;
                    const isSaved = savedJobIds.has(job.id);
                    return (
                      <li key={job.id} className="p-4 border rounded-lg flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold">{job.position}</h3>
                          <p className="text-sm text-gray-600">{job.company} - <span className="text-gray-500">{job.location || 'Remote'}</span></p>
                          <div className="flex gap-1 mt-2">
                            {job.tags?.slice(0, 3).map(tag => (
                              <span key={tag} className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{tag}</span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleSaveJob(job)}
                          disabled={isSaving || isSaved}
                          className={`text-sm px-3 py-1.5 rounded-md transition ${
                            isSaved 
                              ? 'bg-green-100 text-green-700 cursor-default'
                              : 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50'
                          }`}
                        >
                          {isSaving ? 'Saving...' : isSaved ? 'Saved ✓' : 'Save'}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}