"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Google Identity Services global exposed by the GIS script
declare const google: {
  accounts: {
    id: {
      initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
      renderButton: (element: HTMLElement, config: object) => void;
    };
  };
};

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
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const router = useRouter();

  const isManager = targetRole === "manager";
  const isCashier = targetRole === "cashier";

  const handlePinButton = (digit: string) => {
    if (pin.length < 8) {
      setPin((prev) => prev + digit);
      setPinError("");
    }
  };

  const handlePinKeyDown = (e: KeyboardEvent) => {
    const key = e.key;
    if ((key >= '0' && key <= '9') || (key >= 'Numpad0' && key <= 'Numpad9')) {
      const digit = key.replace('Numpad', '');
      handlePinButton(digit);
    } else if (key === 'Backspace') {
      setPin((prev) => prev.slice(0, -1));
    } else if (key === 'Enter') {
      document.getElementById('pin-submit-btn')?.click();
    }
  };

  const handleClear = () => {
    setPin("");
    setPinError("");
  };

  // Global keyboard listener for PIN input
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => handlePinKeyDown(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, pin]);

  // Load Google Identity Services script and initialize GIS when manager modal opens
  useEffect(() => {
    if (!isManager) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === "your-client-id.apps.googleusercontent.com") return;

    const initGIS = () => {
      if (typeof google === "undefined" || !google.accounts) return;
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential?: string }) => {
          if (!response.credential) return;
          setGoogleLoading(true);
          setGoogleError("");
          fetch("/api/login/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ googleToken: response.credential }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.success) {
                localStorage.setItem("employeeId", data.id);
                localStorage.setItem("employeeName", data.name);
                router.push(targetHref);
              } else {
                setGoogleError(data.error || "Google sign-in failed");
              }
            })
            .catch(() => setGoogleError("Connection error. Please try again."))
            .finally(() => setGoogleLoading(false));
        },
      });
      const container = document.getElementById("gis-container");
      if (container) {
        google.accounts.id.renderButton(container, {
          theme: "filled_black",
          size: "large",
          shape: "rectangular",
          text: "signin_with",
        });
      }
    };

    if (document.getElementById("gis-script")) {
      initGIS();
      return;
    }

    const script = document.createElement("script");
    script.id = "gis-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGIS;
    document.head.appendChild(script);
  }, [isManager, targetHref]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");
    setPinLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, role: targetRole }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem("employeeId", data.id);
        localStorage.setItem("employeeName", data.name);
        router.push(targetHref);
      } else {
        setPinError(data.error || "Invalid credentials");
      }
    } catch {
      setPinError("Connection error. Please try again.");
    } finally {
      setPinLoading(false);
    }
  };

  if (!isOpen) return null;

  // ---- CASHIER: single centered card with 3x3 PIN pad ----
  if (isCashier) {
    const pinButtons = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-stone-900">Cashier Login</h2>
            <button onClick={onClose} className="text-2xl text-stone-400 hover:text-stone-600">×</button>
          </div>
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Enter PIN</label>
              {/* PIN display */}
              <div className="flex justify-center gap-3 mb-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-12 h-14 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-colors ${
                      pin.length > i ? 'border-amber-500 bg-amber-50' : 'border-stone-300 bg-white'
                    }`}
                  >
                    {pin.length > i ? '●' : ''}
                  </div>
                ))}
              </div>
              {/* Hidden input - keeps browser happy but we use global keyboard listener */}
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="sr-only"
                required
              />
              {/* 3x3 PIN pad */}
              <div className="grid grid-cols-3 gap-3">
                {pinButtons.map((btn, i) => {
                  if (btn === '') return <div key={i} />;
                  if (btn === '⌫') {
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={handleClear}
                        className="h-14 rounded-xl border border-stone-300 bg-stone-100 text-lg font-semibold text-stone-600 hover:bg-stone-200 active:bg-stone-300 transition"
                      >
                        ⌫
                      </button>
                    );
                  }
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handlePinButton(btn)}
                      className="h-14 rounded-xl border border-stone-300 bg-white text-xl font-semibold hover:bg-amber-50 active:bg-amber-100 transition"
                    >
                      {btn}
                    </button>
                  );
                })}
              </div>
            </div>
            {pinError && <p className="text-sm text-red-600">{pinError}</p>}
            <button
              id="pin-submit-btn"
              type="submit"
              disabled={pinLoading || pin.length < 4}
              className="w-full rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white transition hover:bg-amber-800 disabled:opacity-50"
            >
              {pinLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ---- MANAGER: two side-by-side cards ----
  if (isManager) {
    const pinButtons = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-stone-900">Manager Login</h2>
            <button onClick={onClose} className="text-2xl text-stone-400 hover:text-stone-600">×</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Left card — PIN Login with 3x3 pad */}
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-6">
              <h3 className="text-lg font-semibold text-stone-800 mb-4">Sign in with PIN</h3>
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Employee ID (PIN)</label>
                  {/* PIN display */}
                  <div className="flex justify-center gap-2 mb-4">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-10 h-12 rounded-lg border-2 flex items-center justify-center text-xl font-bold transition-colors ${
                          pin.length > i ? 'border-amber-500 bg-amber-50' : 'border-stone-300 bg-white'
                        }`}
                      >
                        {pin.length > i ? '●' : ''}
                      </div>
                    ))}
                  </div>
                  {/* Hidden input - keeps browser happy but we use global keyboard listener */}
                  <input
                    id="manager-pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="sr-only"
                    required
                  />
                  {/* 3x3 PIN pad */}
                  <div className="grid grid-cols-3 gap-2">
                    {pinButtons.map((btn, i) => {
                      if (btn === '') return <div key={i} />;
                      if (btn === '⌫') {
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={handleClear}
                            className="h-12 rounded-xl border border-stone-300 bg-stone-100 text-base font-semibold text-stone-600 hover:bg-stone-200 active:bg-stone-300 transition"
                          >
                            ⌫
                          </button>
                        );
                      }
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handlePinButton(btn)}
                          className="h-12 rounded-xl border border-stone-300 bg-white text-lg font-semibold hover:bg-amber-50 active:bg-amber-100 transition"
                        >
                          {btn}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {pinError && <p className="text-sm text-red-600">{pinError}</p>}
                <button
                  id="pin-submit-btn"
                  type="submit"
                  disabled={pinLoading || pin.length < 4}
                  className="w-full rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white transition hover:bg-amber-800 disabled:opacity-50"
                >
                  {pinLoading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            </div>

            {/* Right card — Google Sign-In */}
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-6 flex flex-col items-center justify-center">
              <h3 className="text-lg font-semibold text-stone-800 mb-4">Sign in with Google</h3>
              <p className="text-sm text-stone-500 mb-4 text-center">
                Use your <strong>@tamu.edu</strong> account or <strong>reveille.bubbletea@gmail.com</strong>
              </p>
              <div id="gis-container" className="flex items-center justify-center" />
              {googleLoading && <p className="text-sm text-stone-400 mt-3">Redirecting...</p>}
              {googleError && <p className="text-sm text-red-600 mt-3">{googleError}</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
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
