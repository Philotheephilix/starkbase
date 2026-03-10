import { useState, useEffect } from "react"
import { useAuth } from "@starkbase/sdk"
import { Link, useNavigate } from "react-router-dom"

export default function LoginPage() {
  const { isAuthenticated, isLoading, error, register, login } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [form, setForm] = useState({ username: "", password: "" })

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/console", { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (mode === "register") {
        await register(form)
      } else {
        await login(form)
      }
    } catch {
      // error captured in useAuth state
    }
  }

  if (isAuthenticated) return null

  return (
    <div className="min-h-screen bg-[#FF4D00] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link to="/">
            <h1 className="font-serif text-5xl font-black uppercase tracking-tighter text-black">
              Starkbase
            </h1>
          </Link>
          <p className="font-mono text-sm text-black/60 mt-2">
            {mode === "login" ? "Sign in to your console" : "Create your account"}
          </p>
        </div>

        <div className="bg-black rounded-2xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
          <div className="flex mb-8 bg-white/10 rounded-full p-1">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2.5 rounded-full font-mono text-sm uppercase transition-colors ${
                mode === "login"
                  ? "bg-[#FF4D00] text-black font-bold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 py-2.5 rounded-full font-mono text-sm uppercase transition-colors ${
                mode === "register"
                  ? "bg-[#FF4D00] text-black font-bold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block font-mono text-xs uppercase text-white/40 mb-2">
                Username
              </label>
              <input
                type="text"
                placeholder="alice"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-lg font-mono text-sm text-white placeholder:text-white/30 outline-none focus:border-[#FF4D00] transition-colors"
              />
            </div>

            <div className="mb-6">
              <label className="block font-mono text-xs uppercase text-white/40 mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-lg font-mono text-sm text-white placeholder:text-white/30 outline-none focus:border-[#FF4D00] transition-colors"
              />
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg font-mono text-xs text-red-400">
                {error.message}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !form.username || !form.password}
              className="w-full py-3.5 bg-[#FF4D00] text-black rounded-full font-mono text-sm uppercase font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  {mode === "register" ? "Deploying wallet..." : "Signing in..."}
                </>
              ) : mode === "register" ? (
                "Create account"
              ) : (
                "Sign in"
              )}
            </button>

            {mode === "register" && (
              <p className="mt-4 font-mono text-[11px] text-white/30 text-center">
                Registration deploys a Starknet wallet on Sepolia — takes ~20-30s.
              </p>
            )}
          </form>
        </div>

        <div className="text-center mt-6">
          <Link
            to="/"
            className="font-mono text-xs uppercase text-black/60 hover:text-black transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
