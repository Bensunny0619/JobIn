// pages/Login.tsx
import { supabase } from "../lib/supabaseClient"
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc"; // Google’s colored logo

import Logo from "../assets/jobin3.png"

export default function Login() {
  const signIn = async (provider: "github" | "google") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })
  }

  return (
    <div className="min-h-screen grid place-items-center bg-brand.gray p-6">
      <div className="w-full max-w-md rounded-2xl shadow-xl bg-white p-8 text-center">
        <div className="flex justify-center mb-6">
          <img src={Logo} alt="JobIn logo" className="h-12 rounded-3xl" />
        </div>

        <h1 className="text-2xl font-heading font-semibold mb-2 text-brand.blue">
          Welcome to JobIn
        </h1>
        <p className="text-sm text-neutral-600 mb-6">
          Sign in to track your job applications
        </p>

        <div className="space-y-3">
          <button
            onClick={() => signIn("github")}
            className="w-full flex items-center justify-center gap-2 rounded-lg border px-4 py-2 hover:bg-neutral-50"
          >
            <FaGithub className="w-5 h-5" /> Continue with GitHub
          </button>
          <button
            onClick={() => signIn("google")}
            className="w-full flex items-center justify-center gap-2 rounded-lg border px-4 py-2 hover:bg-neutral-50"
          >
            <FcGoogle className="w-5 h-5" /> Continue with Google
          </button>
        </div>
      </div>
    </div>
  )
}
