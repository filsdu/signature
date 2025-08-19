import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useNavigate, Link } from "react-router-dom";

// Supabase client
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function Home() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");

  // get current session user
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin, // return to site after clicking email link
      },
    });
    setSending(false);
    if (error) {
      console.error(error);
      setMessage("Could not send magic link. Double-check your email.");
    } else {
      setSent(true);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setMessage("Signed out.");
  };

  const go = (path) => {
    // Optional: require sign-in to enter boards via the home cards.
    if (!user) {
      setMessage("Please sign in to enter the boards.");
      return;
    }
    navigate(path);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <section className="mb-10">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Welcome to Signature Shards</h1>
        <p className="text-neutral-600 mt-2">
          Draw signatures, post confessions, and create photo walls. Items can “kiss” but never overlap. Pick a board and add your mark.
        </p>
      </section>

      <section className="mb-10">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-sm text-neutral-500">Account</div>
              {user ? (
                <div className="text-sm">
                  Signed in as <span className="font-medium">{user.email}</span>
                </div>
              ) : (
                <div className="text-sm">Sign in to place and edit your items.</div>
              )}
            </div>

            {!user ? (
              <form onSubmit={signIn} className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e)=>setEmail(e.target.value)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm w-64"
                  required
                />
                <button
                  type="submit"
                  disabled={sending}
                  className={`px-3 py-2 rounded-xl ${sending ? 'bg-neutral-300 text-neutral-600' : 'bg-black text-white hover:opacity-90'}`}
                >
                  {sending ? "Sending..." : "Send magic link"}
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={signOut} className="px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-sm">
                  Sign out
                </button>
                <Link to="/signatures" className="px-3 py-2 rounded-xl bg-black text-white text-sm hover:opacity-90">Enter boards</Link>
              </div>
            )}
          </div>

          {sent && !user && (
            <div className="mt-3 text-xs text-green-700">
              Magic link sent! Check your email and click the link to finish signing in.
            </div>
          )}
          {message && <div className="mt-3 text-xs text-neutral-700">{message}</div>}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Pick a board</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {/* Signatures */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm flex flex-col">
            <div className="text-sm text-neutral-500 mb-2">Board</div>
            <h3 className="text-lg font-medium mb-2">Signatures</h3>
            <p className="text-sm text-neutral-600 mb-4">
              Draw your signature and place it on a giant wall. They can touch, but never overlap.
            </p>
            <div className="mt-auto flex gap-2">
              <button onClick={()=>go('/signatures')} className="px-3 py-2 rounded-xl bg-black text-white text-sm hover:opacity-90">Open</button>
              <Link to="/signatures" className="px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-sm">View</Link>
            </div>
          </div>

          {/* Confessions */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm flex flex-col">
            <div className="text-sm text-neutral-500 mb-2">Board</div>
            <h3 className="text-lg font-medium mb-2">Confessions</h3>
            <p className="text-sm text-neutral-600 mb-4">
              Write a short text in a circle, rounded, or square shape. Place it with auto or manual mode.
            </p>
            <div className="mt-auto flex gap-2">
              <button onClick={()=>go('/confessions')} className="px-3 py-2 rounded-xl bg-black text-white text-sm hover:opacity-90">Open</button>
              <Link to="/confessions" className="px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-sm">View</Link>
            </div>
          </div>

          {/* Photos */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm flex flex-col">
            <div className="text-sm text-neutral-500 mb-2">Board</div>
            <h3 className="text-lg font-medium mb-2">Photos (Cats/Dogs/…)</h3>
            <p className="text-sm text-neutral-600 mb-4">
              Upload an image and place it. No rotation. Items “kiss” in a neat grid without overlap.
            </p>
            <div className="mt-auto flex gap-2">
              <button onClick={()=>go('/photos')} className="px-3 py-2 rounded-xl bg-black text-white text-sm hover:opacity-90">Open</button>
              <Link to="/photos" className="px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-sm">View</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
