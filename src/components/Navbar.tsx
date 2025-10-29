import { useEffect, useRef, useState } from "react"
import { LogOut, Bell, Search } from "lucide-react"
import { supabase } from "../lib/supabaseClient" // Assuming you have this file
import Logo from "../assets/jobin2.png" // Assuming you have this asset
import Notifications from "./Notifications"

// Define the component's props
type NavbarProps = {
  minimal?: boolean;
  searchTerm: string; // Add this prop
  onSearchChange: (term: string) => void; // Add this prop
}

export default function Navbar({ minimal = false, searchTerm, onSearchChange }: NavbarProps) {
  const [userId, setUserId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    getUser();
  }, []);

  async function fetchUnreadCount() {
    // ... (rest of your existing fetchUnreadCount function is fine)
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
    // ... (rest of your existing useEffect for unread count is fine)
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
    // ... (rest of your existing useEffect for click outside is fine)
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
          <div className="flex items-center gap-2">
            <img src={Logo} alt="JobIn logo" className="h-8 rounded-3xl" />
            <span className="text-xl font-heading text-brand-blue">JobIn</span>
          </div>

          {!minimal && (
            <>
              {/* === MODIFIED SEARCH INPUT === */}
              <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-1.5 w-80">
                <Search className="h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by company or position..."
                  className="bg-transparent outline-none text-sm ml-2 w-full"
                  value={searchTerm} // Controlled component
                  onChange={(e) => onSearchChange(e.target.value)} // Update state on change
                />
              </div>
              {/* ============================== */}

              <div className="flex items-center gap-4">
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