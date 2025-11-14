import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { LogOut, Bell, Search, User as UserIcon } from "lucide-react" // Renamed User to UserIcon to avoid conflicts
import { supabase } from "../lib/supabaseClient"
import Logo from "../assets/jobin2.png"
import Notifications from "./Notifications"

type NavbarProps = {
  minimal?: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export default function Navbar({ minimal = false, searchTerm, onSearchChange }: NavbarProps) {
  const [userId, setUserId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // --- NEW: State for the avatar image URL ---
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null); 
  // ---

  useEffect(() => {
    const getUserAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const currentUserId = session.user.id;
        setUserId(currentUserId);
        
        // --- NEW: Fetch user's avatar ---
        const { data: profileData, error } = await supabase
          .from('user_profiles')
          .select('avatar_url')
          .eq('id', currentUserId)
          .single();

        if (error) {
          console.error("Error fetching avatar:", error.message);
        } else if (profileData?.avatar_url) {
          // Get a temporary signed URL to display the private image
          const { data: signedUrlData } = await supabase.storage
            .from('avatars')
            .createSignedUrl(profileData.avatar_url, 3600); // Expires in 1 hour
          
          setAvatarUrl(signedUrlData?.signedUrl || null);
        }
        // ---
      }
    };
    getUserAndProfile();
  }, []);

  // ... (the rest of your useEffects and functions for notifications and logout remain exactly the same)
  async function fetchUnreadCount() {
    if (!userId) {
      setUnreadCount(0)
      return
    }
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false)

    if (!error) {
      setUnreadCount(count ?? 0)
    }
  }

  useEffect(() => {
    if (!userId) return
    fetchUnreadCount()

    const channel = supabase
      .channel(`notifications-count:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => fetchUnreadCount()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (open && wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = "/"
  }


  return (
    <header className="bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={Logo} alt="JobIn logo" className="h-8 rounded-3xl" />
            <span className="text-xl font-heading text-brand-blue">JobIn</span>
          </Link>

          {!minimal && (
            <>
              <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-1.5 w-80">
                <Search className="h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by company or position..."
                  className="bg-transparent outline-none text-sm ml-2 w-full"
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-4">
                {/* --- NEW: Conditionally render avatar or icon --- */}
                <Link to="/profile" className="rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" aria-label="Go to profile">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="User profile" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <UserIcon className="h-5 w-5 text-gray-600" />
                  )}
                </Link>
                {/* --- */}

                <div ref={wrapperRef} className="relative">
                  <button
                    onClick={() => setOpen((s) => !s)}
                    className="relative p-1 rounded focus:outline-none"
                    aria-label="Toggle notifications"
                  >
                    <Bell className="h-5 w-5 text-gray-600" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full px-1.5">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {open && (
                    <div className="absolute right-0 top-full mt-2 w-80 z-50">
                      <Notifications userId={userId} onClose={() => setOpen(false)} />
                    </div>
                  )}
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}