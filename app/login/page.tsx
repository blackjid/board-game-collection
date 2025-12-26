"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// Validate redirect URL to prevent open redirect attacks
function getSafeRedirect(redirectParam: string | null): string {
  const defaultRedirect = "/settings";

  if (!redirectParam) {
    return defaultRedirect;
  }

  // Only allow relative paths starting with /
  // Reject absolute URLs, protocol-relative URLs, and other schemes
  if (
    !redirectParam.startsWith("/") ||
    redirectParam.startsWith("//") ||
    redirectParam.startsWith("/\\")
  ) {
    return defaultRedirect;
  }

  return redirectParam;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = useMemo(
    () => getSafeRedirect(searchParams.get("redirect")),
    [searchParams]
  );

  const [isFirstUser, setIsFirstUser] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if this is the first user (show registration)
  useEffect(() => {
    async function checkFirstUser() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        // If already logged in, redirect
        if (data.user) {
          router.push(redirect);
          return;
        }

        // Check if any users exist
        const firstUserRes = await fetch("/api/auth/check-first-user");
        if (firstUserRes.ok) {
          const firstUserData = await firstUserRes.json();
          if (firstUserData.isFirstUser) {
            setIsFirstUser(true);
            setMode("register");
          } else {
            setIsFirstUser(false);
            setMode("login");
          }
        } else {
          setIsFirstUser(false);
        }
      } catch {
        // If we can't check, assume there are users
        setIsFirstUser(false);
      }
    }
    checkFirstUser();
  }, [redirect, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body = mode === "register"
        ? { email, password, name }
        : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "An error occurred");
        return;
      }

      // Redirect on success
      router.push(redirect);
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isFirstUser === null) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="animate-pulse text-stone-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Board Game Collection
            </h1>
          </Link>
          <p className="mt-2 text-stone-400 text-sm">
            {isFirstUser
              ? "Create your admin account to get started"
              : "Sign in to access the admin panel"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-stone-900 rounded-2xl p-8 shadow-xl border border-stone-800">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name field (registration only) */}
            {mode === "register" && (
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-stone-300 mb-1.5"
                >
                  Name (optional)
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
                  placeholder="Your name"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-stone-300 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-stone-300 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors"
                placeholder="••••••••"
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="w-5 h-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {mode === "register" ? "Creating account..." : "Signing in..."}
                </>
              ) : mode === "register" ? (
                "Create Admin Account"
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Toggle mode (only if not first user) */}
          {!isFirstUser && (
            <div className="mt-6 text-center text-sm text-stone-400">
              {mode === "login" ? (
                <>
                  First time?{" "}
                  <button
                    onClick={() => {
                      setMode("register");
                      setError("");
                    }}
                    className="text-amber-500 hover:text-amber-400 font-medium"
                  >
                    Contact an admin
                  </button>{" "}
                  to create your account
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => {
                      setMode("login");
                      setError("");
                    }}
                    className="text-amber-500 hover:text-amber-400 font-medium"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Back to collection link */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-stone-500 hover:text-stone-300 text-sm transition-colors"
          >
            ← Back to collection
          </Link>
        </div>
      </div>
    </div>
  );
}
