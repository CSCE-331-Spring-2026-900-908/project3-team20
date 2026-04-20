"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// The four portal sections available on the home page
const portalLinks = [
  {
    href: "/cashier",
    title: "Cashier",
    description: "Employee point-of-sale for order entry, cart management, and checkout.",
    requiresAuth: true,
    role: "cashier",
  },
  {
    href: "/customer",
    title: "Customer",
    description: "Public self-service kiosk with large touch targets and a modern interface.",
    requiresAuth: false,
    role: null,
  },
  {
    href: "/manager",
    title: "Manager",
    description: "Management dashboard for inventory, employees, reports, trends, and menu edits.",
    requiresAuth: true,
    role: "manager",
  },
  {
    href: "/menu-board",
    title: "Menu Board",
    description: "Large, non-interactive display for showing the menu in a clean format.",
    requiresAuth: false,
    role: null,
  },
];

// Props for the login modal dialog
interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetHref: string;
  targetRole: string;
}

/**
 * Login modal that appears when an employee tries to access a protected page.
 * Collects username/password and sends them to /api/login.
 */
function LoginModal({ isOpen, onClose, targetHref, targetRole }: LoginModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role: targetRole }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem("employeeId", data.id);
        localStorage.setItem("employeeName", data.name);
        // Redirect to the requested page on successful login
        router.push(targetHref);
      } else {
        // Show error returned from the server
        setError(data.error || "Invalid credentials");
      }
    } catch {
      // Network error - server unreachable
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-stone-900">
            {targetRole === "manager" ? "Manager" : "Cashier"} Login
          </h2>
          <button
            onClick={onClose}
            className="text-2xl text-stone-400 hover:text-stone-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-stone-700">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-stone-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Home page - displays the boba tea shop portal with four sections.
 * Auth-protected sections (Cashier, Manager) open a login modal first.
 */
export default function Portal() {
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();
  // Tracks which link the user clicked so we know where to redirect after login
  const [targetLink, setTargetLink] = useState({ href: "", role: "" });

  const handleLinkClick = (link: typeof portalLinks[0]) => {
    // Public pages (Customer, Menu Board) - navigate directly
    if (!link.requiresAuth) {
      router.push(link.href);
      return;
    }
    // Protected pages (Cashier, Manager) - open login modal first
    if (link.role) {
      setTargetLink({ href: link.href, role: link.role });
      setModalOpen(true);
    }
  };

  return (
    <>
      <main className="min-h-full bg-[#f8f3e3] text-stone-900 flex flex-col items-center justify-center">
        <section className="mx-auto flex min-h-full max-w-6xl flex-col items-center justify-center px-6 py-12">
          <div className="mb-12 text-center">
            {/* Boba cup logo */}
            <div className="mx-auto mb-6 w-32 h-52">
              <svg viewBox="0 0 150 240" className="w-full h-full">
                <g stroke="#2A2A2A" strokeWidth="3" fill="none">
                  {/* Cup outline */}
                  <path d="M40,80 C40,60 40,40 40,20 L110,20 C110,40 110,60 110,80 L110,200 C110,220 40,220 40,200 Z" />

                  {/* Straw */}
                  <line x1="75" y1="10" x2="75" y2="160" strokeWidth="8" />

                  {/* Lid/top */}
                  <line x1="35" y1="20" x2="115" y2="20" />

                  {/* Plant/flowers on left */}
                  <path d="M55,140 C50,130 53,120 60,115" />
                  <path d="M55,140 C58,130 63,125 70,123" />
                  <path d="M55,140 C52,130 50,120 55,110" />
                  <circle cx="60" cy="115" r="5" fill="#2A2A2A" />
                  <circle cx="70" cy="123" r="5" fill="#2A2A2A" />
                  <circle cx="55" cy="110" r="5" fill="#2A2A2A" />

                  {/* Boba pearls on right */}
                  <circle cx="90" cy="130" r="6" fill="#2A2A2A" />
                  <circle cx="95" cy="150" r="6" fill="#2A2A2A" />
                  <circle cx="85" cy="170" r="6" fill="#2A2A2A" />
                  <circle cx="95" cy="190" r="6" fill="#2A2A2A" />
                </g>
              </svg>
            </div>

            {/* Global Code Crew*/}
            <h1 className="mb-2 text-6xl font-bold tracking-tight text-[#2A2A2A]" style={{ letterSpacing: "-1px" }}>
              GLOBAL CODE CREW
            </h1>

            {/* Bubble Tea & More tagline */}
            <p className="text-xl text-[#2A2A2A] mb-8">
              BOBA SHOP & MORE
            </p>
          </div>

          <nav
            aria-label="Portal navigation"
            className="grid w-full max-w-4xl gap-5 sm:grid-cols-2"
          >
            {portalLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleLinkClick(link)}
                className="group rounded-3xl border border-stone-200 bg-white p-6 text-left shadow-md transition hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-stone-900">{link.title}</h2>
                  <span
                    aria-hidden="true"
                    className="text-xl text-stone-500 transition group-hover:translate-x-1"
                  >
                    →
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {link.description}
                </p>
              </button>
            ))}
          </nav>
        </section>
      </main>

      {/* Login modal - conditionally rendered when an auth-required link is clicked */}
      <LoginModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        targetHref={targetLink.href}
        targetRole={targetLink.role}
      />
    </>
  );
}
