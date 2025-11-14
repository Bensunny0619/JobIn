import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { LogOut, Bell, Search, User as UserIcon, X } from "lucide-react"
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  useEffect(() => {
    const getUserAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const currentUserId = session.user.id;
        setUserId(currentUserId);
        const { data: profileData, error } = await supabase.from('user_profiles').select('avatar_url').eq('id', currentUserId).single();
        if (error && error.code !== 'PGRST116') console.error("Error fetching avatar:", error.message);
        else if (profileData?.avatar_url) {
          const { data: signedUrlData } = await supabase.storage.from('avatars').createSignedUrl(profileData.avatar_url, 3600);
          setAvatarUrl(signedUrlData?.signedUrl || null);
        }
      }
    };
    getUserAndProfile();
  }, []);

  useEffect(() => {
    // FIX: The fetchUnreadCount function is now defined and used within this useEffect,
    // and the setUnreadCount function is also used, resolving the "declared but never read" errors.
    async function fetchUnreadCount() {
      if (!userId) return;
      try {
        const { count, error } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', userId)
          .eq('is_read', false);

        if (error) {
          console.error("Error fetching unread count:", error.message);
          return;
        }

        setUnreadCount(count ?? 0);
      } catch (err) {
        console.error("Error fetching unread count:", err);
      }
    }

    if (userId) {
      fetchUnreadCount();
    } else {
      setUnreadCount(0);
    }
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (open && wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error.message);
      return;
    }
    window.location.href = "/";
  }

  return (
    <header className="bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {!isMobileSearchOpen && (
            <>
              <Link to="/dashboard" className="flex items-center gap-2">
                <img src={Logo} alt="JobIn logo" className="h-8 rounded-3xl" />
                <span className="text-xl font-heading text-brand-blue">JobIn</span>
              </Link>

              {!minimal && (
                <>
                  <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-1.5 w-80">
                    <Search className="h-4 w-4 text-gray-500" />
                    <input type="text" placeholder="Search..." className="bg-transparent outline-none text-sm ml-2 w-full" value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} />
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => setIsMobileSearchOpen(true)} className="md:hidden p-1" aria-label="Open search" title="Open search"><Search className="h-5 w-5 text-gray-600" /></button>
                    <Link to="/profile" className="rounded-full" aria-label="Go to profile">
                      {avatarUrl ? <img src={avatarUrl} alt="User profile" className="h-8 w-8 rounded-full object-cover" /> : <UserIcon className="h-5 w-5 text-gray-600" />}
                    </Link>
                    
                    <div ref={wrapperRef} className="static sm:relative">
                      <button onClick={() => setOpen((s) => !s)} className="relative p-1 rounded-full focus:outline-none" aria-label="Toggle notifications">
                        <Bell className="h-5 w-5 text-gray-600" />
                        {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full px-1.5">{unreadCount}</span>}
                      </button>

                      {open && (
                        <div className="fixed top-16 left-4 right-4 sm:absolute sm:top-full sm:left-auto sm:right-0 sm:w-80 mt-2 z-50">
                          <Notifications userId={userId} onClose={() => setOpen(false)} />
                        </div>
                      )}
                    </div>

                    <button onClick={handleLogout} className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700">
                      <LogOut className="h-4 w-4" />
                      <span className="hidden sm:inline">Logout</span>
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {isMobileSearchOpen && (
            <div className="flex items-center bg-gray-100 rounded-lg px-3 py-1.5 w-full">
              <Search className="h-4 w-4 text-gray-500" />
              <input type="text" placeholder="Search..." className="bg-transparent outline-none text-sm ml-2 w-full" value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} autoFocus />
              <button onClick={() => setIsMobileSearchOpen(false)} className="ml-2 p-1" aria-label="Close search" title="Close search"><X className="h-5 w-5 text-gray-600" /></button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}