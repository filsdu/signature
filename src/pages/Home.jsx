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
          <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center'}}>
            <Link to="/campaigns" className="btn btn-primary" style={{textDecoration:'none'}}>Explore Campaigns</Link>
            <Link to="/create-campaign" className="btn btn-secondary" style={{textDecoration:'none'}}>Create Campaign</Link>
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
