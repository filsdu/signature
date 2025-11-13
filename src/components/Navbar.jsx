import React, { useEffect, useState, useContext } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

// Supabase client (for showing Sign in/Sign out status in the navbar)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function Navbar() {
  const [user, setUser] = useState(null);
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { nickname, clearNickname } = useContext(require('../contexts/NicknameContext').NicknameContext);

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
    setMobileOpen(false);
  }, [location.pathname]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="site-header">
      <div className="container header-row">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link to="/" className="brand">Signature Shards</Link>
        </div>

        <nav style={{display:'flex',alignItems:'center',gap:12}}>
          <div className="nav-links">
            <NavLink to="/signatures" className={({isActive}) => isActive? 'menu-link active' : 'menu-link'}>Signatures</NavLink>
            <NavLink to="/confessions" className={({isActive}) => isActive? 'menu-link active' : 'menu-link'}>Confessions</NavLink>
            <NavLink to="/photos" className={({isActive}) => isActive? 'menu-link active' : 'menu-link'}>Photos</NavLink>
            <NavLink to="/word-campaigns" className={({isActive}) => isActive? 'menu-link active' : 'menu-link'}>Word Campaigns</NavLink>
          </div>

          <div className="nav-actions">
            {nickname ? (
              <>
                <span style={{fontSize:13,color:'#6b7280',marginRight:8}}>{nickname}</span>
                <button onClick={() => clearNickname()} className="btn btn-secondary">Change</button>
              </>
            ) : user ? (
              <>
                <span style={{fontSize:13,color:'#6b7280',marginRight:8}}>{user.email}</span>
                <button onClick={signOut} className="btn btn-secondary">Sign out</button>
              </>
            ) : (
              <Link to="/" className="btn btn-primary" title="Go to Home to sign in">Sign in</Link>
            )}
          </div>

          {/* mobile toggle */}
          <button className="mobile-toggle" onClick={() => setMobileOpen(v => !v)} aria-expanded={mobileOpen} aria-label="Toggle menu">☰</button>
        </nav>
      </div>

      <div className={`mobile-menu ${mobileOpen ? 'open' : ''}`} role="dialog" aria-hidden={!mobileOpen}>
        <div className="container menu-inner">
          <NavLink to="/signatures" className={({isActive}) => isActive? 'menu-link active' : 'menu-link'}>Signatures</NavLink>
          <NavLink to="/confessions" className={({isActive}) => isActive? 'menu-link active' : 'menu-link'}>Confessions</NavLink>
          <NavLink to="/photos" className={({isActive}) => isActive? 'menu-link active' : 'menu-link'}>Photos</NavLink>
          <NavLink to="/word-campaigns" className={({isActive}) => isActive? 'menu-link active' : 'menu-link'}>Word Campaigns</NavLink>

          <div style={{paddingTop:12,borderTop:'1px solid var(--border)',marginTop:12}}>
            {user ? (
              <button onClick={signOut} className="btn btn-secondary" style={{width:'100%'}}>Sign out</button>
            ) : (
              <Link to="/" className="menu-cta">Sign in</Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

