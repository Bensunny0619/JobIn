import { LogOut, Bell, Search } from "lucide-react"
import { supabase } from "../lib/supabaseClient"
import Logo from "../assets/jobin2.png"

type NavbarProps = {
  minimal?: boolean
}

export default function Navbar({ minimal = false }: NavbarProps) {
  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  return (
    <header className="bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <img src={Logo} alt="JobIn logo" className="h-8" />
            <span className="text-xl font-heading text-brand.blue">JobIn</span>
          </div>

          {/* If minimal (Login/Signup) → only logo */}
          {!minimal && (
            <>
              {/* Search Bar */}
              <div className="hidden md:flex items-center bg-brand.gray rounded-lg px-3 py-1.5 w-80">
                <Search className="h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search jobs..."
                  className="bg-transparent outline-none text-sm ml-2 w-full"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4">
                <button className="relative">
                  <Bell className="h-5 w-5 text-gray-600" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">
                    3
                  </span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 bg-brand.blue text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
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
