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

  useEffect(() => {
    if (isOpen) {
      setSavedJobIds(new Set());
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
      onJobSaved();
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
            {/* --- RESPONSIVE FORM CHANGES START HERE --- */}
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 mt-4 items-stretch sm:items-center">
              <input 
                type="text" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                placeholder="e.g., React, Python..." 
                className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm flex-grow" 
              />
              <div className="flex gap-2">
                <select
                  aria-label="Job search source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full sm:w-auto h-10 border border-gray-300 rounded-md px-3 text-sm"
                >
                  <option>{SEARCH_SOURCES.GOOGLE_JOBS}</option>
                  <option>{SEARCH_SOURCES.REMOTE_OK}</option>
                </select>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 h-10"
                >
                  {loading ? '...' : 'Search'}
                </button>
              </div>
            </form>
            {/* --- RESPONSIVE FORM CHANGES END HERE --- */}
          </div>
          <div className="flex-1 p-6 overflow-y-auto">
            {/* ... rest of your component ... */}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}