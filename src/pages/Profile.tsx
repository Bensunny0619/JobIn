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
  const [analysis, setAnalysis] = useState<any | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Fetch initial profile data on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('full_name, avatar_url, resume_url, resume_analysis')
          .eq('id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error)
        }
        if (data) {
          setFullName(data.full_name || '')
          setAvatarUrl(data.avatar_url || null)
          setResumeUrl(data.resume_url || null)
          setAnalysis(data.resume_analysis || null)
        }
      }
      setLoading(false)
    }
    fetchProfile()
  }, [])

  // Handler for the "Analyze Resume" button
  const handleAnalyzeResume = async () => {
    setIsAnalyzing(true)
    const analysisPromise = async () => {
      const { data, error } = await supabase.functions.invoke('analyze-resume-sync')
      if (error) {
        // Try to parse the error for a more specific message
        const errorMessage = error.context?.msg || error.message;
        throw new Error(errorMessage);
      }
      
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ resume_analysis: data.analysis })
        .eq('id', user!.id)
      if (updateError) throw new Error(updateError.message)
      
      setAnalysis(data.analysis)
    }
    toast.promise(analysisPromise(), {
      loading: 'Analyzing resume... This can take a minute.',
      success: 'Analysis complete!',
      error: (err) => `Analysis failed: ${err.message}`,
    }).finally(() => {
      setIsAnalyzing(false)
    })
  }

  // Handler for uploading a new resume file
  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !user) return

    setUploading(true)
    setAnalysis(null)

    const file = event.target.files[0]
    const filePath = `${user.id}.${file.name.split('.').pop()}`

    const resumePromise = async () => {
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, { upsert: true })
      if (uploadError) throw new Error(uploadError.message)

      const { error: updateError } = await supabase.from('user_profiles').upsert({
        id: user!.id,
        resume_url: filePath,
        resume_analysis: null,
      })
      if (updateError) throw new Error(updateError.message)
      
      setResumeUrl(filePath)
    }
    toast.promise(resumePromise(), {
      loading: 'Uploading resume...',
      success: 'Upload complete! You can now analyze your resume.',
      error: (err) => `Upload failed: ${err.toString()}`,
    }).finally(() => {
      setUploading(false)
    })
  }
  
  // Handler to update the user's full name
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    toast.promise(supabase.from('user_profiles').upsert({ id: user.id, full_name: fullName }), {
      loading: 'Saving profile...',
      success: 'Profile saved successfully! 🎉',
      error: 'Failed to save profile.',
    });
  };

  // Handler for uploading a new avatar image
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files.length === 0 || !user) return;
    setUploading(true);
    const file = event.target.files[0];
    const filePath = `${user.id}/${Math.random()}.${file.name.split('.').pop()}`;
    const avatarPromise = async () => {
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw new Error(uploadError.message);
      const { error: updateError } = await supabase.from('user_profiles').upsert({ id: user.id, avatar_url: filePath });
      if (updateError) throw new Error(updateError.message);
      const { data: signedUrlData } = await supabase.storage.from('avatars').createSignedUrl(filePath, 3600);
      if (signedUrlData) setAvatarUrl(signedUrlData.signedUrl);
    };
    toast.promise(avatarPromise(), {
      loading: 'Uploading avatar...',
      success: 'Avatar updated successfully!',
      error: (err) => `Upload failed: ${err.toString()}`,
    }).finally(() => setUploading(false));
  };

  // Handler for downloading the current resume
  const handleDownloadResume = async () => {
    if (!resumeUrl || !user) return;
    toast.promise(supabase.storage.from('resumes').download(resumeUrl), {
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

  if (loading && !user) return <p className="text-center p-6">Loading profile...</p>

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Your Profile</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 flex justify-center pt-6">
          <Avatar url={avatarUrl} onUpload={handleAvatarUpload} uploading={uploading || isAnalyzing} />
        </div>
        <div className="md:col-span-2 space-y-8">
          
          {/* --- THIS SECTION IS NOW RESTORED --- */}
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
              <button type="submit" disabled={uploading || isAnalyzing} className="bg-blue-700 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-600 transition disabled:opacity-50">
                Save Profile
              </button>
            </form>
          </div>
          
          {/* Resume Management */}
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Resume / Portfolio</h2>
            <div className="flex items-center gap-4 flex-wrap">
              <label htmlFor="resume-upload" className={`bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-medium hover:bg-gray-300 transition ${(uploading || isAnalyzing) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                {uploading ? 'Uploading...' : 'Upload New Resume'}
              </label>
              <input type="file" id="resume-upload" onChange={handleResumeUpload} disabled={uploading || isAnalyzing} className="hidden" accept=".pdf" />
              
              {resumeUrl && !analysis && (
                <button 
                  onClick={handleAnalyzeResume} 
                  disabled={isAnalyzing}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isAnalyzing ? 'Analyzing...' : '✨ Analyze with AI'}
                </button>
              )}
              {resumeUrl && (
                 <button onClick={handleDownloadResume} className="text-sm text-blue-600 hover:underline" disabled={uploading || isAnalyzing}>
                  Download Resume
                </button>
              )}
            </div>
            {!resumeUrl && <p className="text-sm text-gray-500 mt-4">Upload a resume to get started.</p>}
          </div>

          {/* AI Analysis Display */}
          {analysis && (
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">AI Resume Analysis</h2>
                <>
                  {analysis.summary && (
                    <div className="mb-4">
                      <h3 className="font-medium text-sm text-gray-600 mb-1">Professional Summary</h3>
                      <p className="text-sm text-gray-800">{analysis.summary}</p>
                    </div>
                  )}
                  {analysis.skills && analysis.skills.length > 0 && (
                    <div>
                      <h3 className="font-medium text-sm text-gray-600 mb-2">Key Skills Identified</h3>
                      <div className="flex flex-wrap gap-2">
                        {analysis.skills.map((skill: string) => (
                          <span key={skill} className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}