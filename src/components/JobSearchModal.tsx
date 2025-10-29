import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { supabase } from "../lib/supabaseClient";
import toast from "react-hot-toast";

// Define the shape of a job object from the RemoteOK API
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

export default function JobSearchModal({ isOpen, onClose, onJobSaved }: Props) {
  const [searchTerm, setSearchTerm] = useState("React Developer");
  const [results, setResults] = useState<RemoteJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://remoteok.com/api?tag=${searchTerm}`);
      if (!response.ok) throw new Error("Network response was not ok.");
      
      const data = await response.json();
      // The first element is a legal notice, so we slice it off.
      setResults(data.slice(1));

    } catch (err) {
      setError("Failed to fetch jobs. Please try another search term.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Run a default search when the component mounts
  useEffect(() => {
    handleSearch();
  }, []);

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
      status: 'applied', // Default status
      date_applied: new Date().toISOString().split("T")[0],
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${job.position} at ${job.company} saved!`);
      onJobSaved(); // This will refetch and close the modal
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
            <form onSubmit={handleSearch} className="flex gap-2 mt-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by tag (e.g., React, Python...)"
                className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm"
              />
              <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {loading && <p className="text-center">Loading...</p>}
            {error && <p className="text-center text-red-500">{error}</p>}
            {!loading && !error && (
              <ul className="space-y-4">
                {results.map((job) => (
                  <li key={job.id} className="p-4 border rounded-lg flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{job.position}</h3>
                      <p className="text-sm text-gray-600">{job.company} - <span className="text-gray-500">{job.location || 'Remote'}</span></p>
                      <div className="flex gap-1 mt-2">
                        {job.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handleSaveJob(job)}
                      disabled={savingId === job.id}
                      className="bg-green-600 text-white text-sm px-3 py-1.5 rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {savingId === job.id ? 'Saving...' : 'Save'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}