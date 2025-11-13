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
                
                import React, { useContext } from "react";
                import { Link } from "react-router-dom";
                import { NicknameContext } from '../contexts/NicknameContext';

                export default function Home(){
                  const { nickname } = useContext(NicknameContext);

                  return (
                    <div style={{minHeight:'100vh',background:'linear-gradient(180deg,#f0f9ff,#f5f3ff)'}}>
                      <div className="container" style={{padding:'40px 16px'}}>
                        <header style={{textAlign:'center',marginBottom:18}}>
                          <h1 style={{margin:0,fontSize:28,fontWeight:700}}>Mosaic Voice</h1>
                          <p style={{color:'#6b7280',marginTop:8,maxWidth:720,marginLeft:'auto',marginRight:'auto'}}>A living digital mosaic where community creations — text, photos, signatures and audio — become a collective artwork. No email required — choose a nickname and start creating.</p>
                        </header>

                        <div style={{display:'flex',gap:12,flexDirection:'column',alignItems:'center',marginTop:12}}>
                          <div style={{display:'flex',gap:8}}>
                            <Link to="/campaigns" className="btn btn-primary">Explore Campaigns</Link>
                            <Link to="/create-campaign" className="btn btn-secondary">Create Campaign</Link>
                          </div>

                          <div style={{marginTop:18,background:'#fff',borderRadius:12,padding:14,boxShadow:'0 6px 18px rgba(2,6,23,0.06)',width:'100%',maxWidth:920}}>
                            <h3 style={{marginTop:0}}>Getting started</h3>
                            <ol style={{color:'#6b7280'}}>
                              <li>Pick a nickname (one-time).</li>
                              <li>Explore or create a campaign.</li>
                              <li>Create your shard — style it, preview, and post.</li>
                            </ol>
                            <div style={{marginTop:12}}>Current identity: <strong>{nickname || 'Not set'}</strong></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                    className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors"
