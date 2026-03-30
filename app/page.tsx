"use client";

import Link from "next/link";
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
      <main className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-100 text-stone-900">
        <section className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-12">
          <div className="mb-10 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">
              Project 3
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Boba Tea Shop
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-stone-700 sm:text-lg">
              Welcome to the Boba Tea Shop portal. Choose a view below to enter the
              appropriate experience for employees, customers, managers, or the menu display.
            </p>
          </div>

          <nav
            aria-label="Portal navigation"
            className="grid w-full max-w-5xl gap-6 sm:grid-cols-2"
          >
            {portalLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleLinkClick(link)}
                className="group rounded-2xl border border-amber-200 bg-white p-6 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-amber-300"
              >
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold text-stone-900">{link.title}</h2>
                  <span
                    aria-hidden="true"
                    className="text-2xl text-amber-600 transition group-hover:translate-x-1"
                  >
                    →
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-stone-600">
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
