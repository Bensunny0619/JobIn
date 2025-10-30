import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import toast from 'react-hot-toast'
import type { User } from '@supabase/supabase-js'
import Avatar from '../components/Avatar'

export default function Profile() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [resumeUrl, setResumeUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Fetch user profile data when the component mounts
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('full_name, avatar_url, resume_url')
          .eq('id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') { // Ignore "no rows found" error
          console.error('Error fetching profile:', error)
          toast.error('Failed to load profile.')
        }

        if (data) {
          setFullName(data.full_name || '')
          setAvatarUrl(data.avatar_url || null)
          setResumeUrl(data.resume_url || null)
        }
      }
      setLoading(false)
    }

    fetchProfile()
  }, [])

  // Handler to update the user's full name
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const updatePromise = supabase.from('user_profiles').upsert({
      id: user.id,
      full_name: fullName,
    });

    toast.promise(updatePromise, {
      loading: 'Saving profile...',
      success: 'Profile saved successfully! 🎉',
      error: 'Failed to save profile.',
    });
  };

  // Handler for uploading a new avatar image
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !user) return;

    setUploading(true);
    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${Math.random()}.${fileExt}`;

    const avatarPromise = async () => {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      const { error: updateError } = await supabase.from('user_profiles').upsert({
        id: user.id,
        avatar_url: filePath,
      });

      if (updateError) throw new Error(updateError.message);
      
      // We must invalidate the old signed URL and fetch a new one.
      // Re-fetching the profile is the easiest way to do this.
      const { data: signedUrlData } = await supabase.storage
        .from('avatars')
        .createSignedUrl(filePath, 3600);
      
      if (signedUrlData) {
        // This forces the Avatar component to re-render with the new image
        setAvatarUrl(signedUrlData.signedUrl); 
      }
    };

    toast.promise(avatarPromise(), {
      loading: 'Uploading avatar...',
      success: 'Avatar updated successfully!',
      error: (err) => `Upload failed: ${err.toString()}`,
    }).finally(() => setUploading(false));
  };

  // Handler for uploading a new resume file
  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !user) return;

    setUploading(true);
    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}.${fileExt}`;

    const resumePromise = async () => {
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      const { error: updateError } = await supabase.from('user_profiles').upsert({
        id: user.id,
        resume_url: filePath,
      });

      if (updateError) throw new Error(updateError.message);
      setResumeUrl(filePath); // Update state on success
    };

    toast.promise(resumePromise(), {
      loading: 'Uploading resume...',
      success: 'Resume uploaded successfully!',
      error: (err) => `Upload failed: ${err.toString()}`,
    }).finally(() => setUploading(false));
  };

  // Handler for downloading the current resume
  const handleDownloadResume = async () => {
    if (!resumeUrl || !user) return;

    const downloadPromise = supabase.storage.from('resumes').download(resumeUrl);

    toast.promise(downloadPromise, {
      loading: 'Downloading resume...',
      success: (data) => {
        const blob = new Blob([data]);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = resumeUrl.split('/').pop() || 'resume';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        return 'Download complete!';
      },
      error: 'Failed to download resume.',
    });
  };

  // Display a loading state while fetching initial data
  if (loading && !user) {
    return <p className="text-center p-6">Loading profile...</p>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Your Profile</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Avatar */}
        <div className="md:col-span-1 flex justify-center pt-6">
            <Avatar url={avatarUrl} onUpload={handleAvatarUpload} uploading={uploading} />
        </div>

        {/* Right Column: Forms */}
        <div className="md:col-span-2 space-y-8">
          {/* Personal Details Form */}
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Personal Details</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="text" value={user?.email || ''} disabled className="w-full h-10 border bg-gray-100 border-gray-300 rounded-md px-3 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button type="submit" disabled={uploading} className="bg-blue-700 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-600 transition disabled:opacity-50">
                Save Profile
              </button>
            </form>
          </div>

          {/* Resume Management Form */}
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Resume / Portfolio</h2>
            <div className="flex items-center gap-4">
              <label htmlFor="resume-upload" className={`bg-green-600 text-white px-4 py-2 rounded-md font-medium hover:bg-green-700 transition ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                {uploading ? 'Please wait...' : 'Upload New Resume'}
              </label>
              <input type="file" id="resume-upload" onChange={handleResumeUpload} disabled={uploading} className="hidden" accept=".pdf,.doc,.docx" />
              
              {resumeUrl && (
                <button onClick={handleDownloadResume} className="text-sm text-blue-600 hover:underline" disabled={uploading}>
                  Download Current Resume
                </button>
              )}
            </div>
            {!resumeUrl && <p className="text-sm text-gray-500 mt-4">No resume has been uploaded yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}