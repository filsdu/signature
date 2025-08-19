import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

// Supabase client (for showing Sign in/Sign out status in the navbar)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function Navbar() {
  const [user, setUser] = useState(null);
  const location = useLocation();

  // keep user in sync
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) setUser(data?.user || null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // close mobile menu on route change
  useEffect(() => {
    const el = document.getElementById("mobile-nav");
    if (el) el.checked = false;
  }, [location.pathname]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const linkClass = ({ isActive }) =>
    `px-2 py-1 rounded ${
      isActive ? "bg-neutral-200 text-neutral-900" : "text-neutral-700 hover:bg-neutral-100"
    }`;

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="font-semibold tracking-tight text-lg">
            Signature Shards
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm ml-2">
            <NavLink to="/signatures" className={linkClass}>Signatures</NavLink>
            <NavLink to="/confessions" className={linkClass}>Confessions</NavLink>
            <NavLink to="/photos" className={linkClass}>Photos</NavLink>
            <NavLink to="/word-campaigns" className={linkClass}>Word Campaigns</NavLink>
          </nav>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-neutral-600 hidden sm:inline">
                {user.email}
              </span>
              <button
                onClick={signOut}
                className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-sm"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/"
              className="px-3 py-1.5 rounded-xl bg-black text-white text-sm hover:opacity-90"
              title="Go to Home to sign in"
            >
              Sign in
            </Link>
          )}
        </div>

        {/* Mobile menu */}
        <div className="md:hidden">
          <input id="mobile-nav" type="checkbox" className="hidden peer" />
          <label
            htmlFor="mobile-nav"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-neutral-300 text-neutral-700"
          >
            ☰
          </label>
          <div className="absolute left-0 right-0 top-14 bg-white border-t border-neutral-200 shadow-sm hidden peer-checked:block">
            <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-2 text-sm">
              <NavLink to="/signatures" className={linkClass}>Signatures</NavLink>
              <NavLink to="/confessions" className={linkClass}>Confessions</NavLink>
              <NavLink to="/photos" className={linkClass}>Photos</NavLink>
              <NavLink to="/word-campaigns" className={linkClass}>Word Campaigns</NavLink>
              <div className="pt-2 border-t border-neutral-200 mt-2">
                {user ? (
                  <button
                    onClick={signOut}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-left"
                  >
                    Sign out
                  </button>
                ) : (
                  <Link
                    to="/"
                    className="w-full inline-block px-3 py-2 rounded-xl bg-black text-white hover:opacity-90"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

