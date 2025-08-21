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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Hero Section */}
        <section className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-indigo-800 mb-4">
            Signature Shards
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Create beautiful collaborative artworks with signatures, confessions, photos, and word campaigns. 
            Each contribution becomes part of a larger tapestry.
          </p>
        </section>

        {/* Authentication Section */}
        <section className="mb-12">
          <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-4 text-center">Your Account</h2>
            
            {user ? (
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-xl font-semibold text-indigo-600">
                      {user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">Signed in as <span className="font-medium">{user.email}</span></p>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={signOut} 
                    className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors"
                  >
                    Sign out
                  </button>
                  <Link 
                    to="/signatures" 
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-center"
                  >
                    Enter Boards
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4 text-center">Sign in to create and manage your contributions</p>
                <form onSubmit={signIn} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sending}
                    className={`w-full px-4 py-2 rounded-xl ${sending ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white transition-colors`}
                  >
                    {sending ? "Sending..." : "Send Magic Link"}
                  </button>
                </form>
                
                {sent && (
                  <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">
                    Magic link sent! Check your email and click the link to finish signing in.
                  </div>
                )}
              </div>
            )}
            
            {message && (
              <div className="mt-4 p-3 bg-yellow-100 text-yellow-700 rounded-lg text-sm">
                {message}
              </div>
            )}
          </div>
        </section>

        {/* Boards Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-center mb-8">Choose a Board</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Signatures */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden transition-transform hover:scale-105">
              <div className="h-40 bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold mb-2">Signatures</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Draw your signature and place it on a collective artwork without overlaps.
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => go('/signatures')} 
                    className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors"
                  >
                    Create
                  </button>
                  <Link 
                    to="/signatures" 
                    className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm transition-colors"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>

            {/* Confessions */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden transition-transform hover:scale-105">
              <div className="h-40 bg-gradient-to-r from-purple-400 to-purple-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold mb-2">Confessions</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Share thoughts in customizable shapes that touch but don't overlap.
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => go('/confessions')} 
                    className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors"
                  >
                    Create
                  </button>
                  <Link 
                    to="/confessions" 
                    className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm transition-colors"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>

            {/* Photos */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden transition-transform hover:scale-105">
              <div className="h-40 bg-gradient-to-r from-pink-400 to-pink-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold mb-2">Photos</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Upload images to create a mosaic where photos touch but never overlap.
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => go('/photos')} 
                    className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors"
                  >
                    Create
                  </button>
                  <Link 
                    to="/photos" 
                    className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm transition-colors"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>

            {/* Word Campaigns */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden transition-transform hover:scale-105">
              <div className="h-40 bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold mb-2">Word Campaigns</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Contribute to collective word art where each signature fills the outline of a message.
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => go('/word-campaigns')} 
                    className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors"
                  >
                    Create
                  </button>
                  <Link 
                    to="/word-campaigns" 
                    className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm transition-colors"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-semibold text-center mb-8">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Create</h3>
              <p className="text-gray-600">Sign in and create your unique contribution - a signature, confession, photo, or word art.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Place</h3>
              <p className="text-gray-600">Position your creation on the collective canvas where pieces touch but never overlap.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 极速赛车开奖结果 极速赛车开奖官网 极速赛车开奖直播 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905a3.61 3.61 0 01-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Share</h3>
              <p className="text-gray-600">Watch as thousands of contributions come together to form beautiful collaborative art.</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} Signature Shards. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
