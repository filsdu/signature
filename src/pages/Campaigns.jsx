import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'mosaic:campaigns';

function loadCampaigns(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return [];
    return JSON.parse(raw);
  }catch(e){return []}
}

function saveCampaigns(list){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }catch(e){}
}

export default function Campaigns(){
  const [campaigns, setCampaigns] = useState([]);
  const navigate = useNavigate();

  useEffect(()=>{
    let list = loadCampaigns();
    if(!list || list.length===0){
      list = [
        { id: 'text-campus', title: 'Campus Confessions', type: 'text', desc: 'Anonymous text confessions from students', created_at: Date.now() },
        { id: 'photo-festival', title: 'Festival Memories', type: 'photo', desc: 'Upload photos from the festival', created_at: Date.now() },
        { id: 'signature-equality', title: 'EQUALITY', type: 'signature', desc: 'Sign the word art', created_at: Date.now() },
        { id: 'audio-voices', title: 'What\'s Your Take?', type: 'audio', desc: 'Share short voice takes', created_at: Date.now() }
      ];
      saveCampaigns(list);
    }
    setCampaigns(list);
  },[]);

  const handleCreate = () => navigate('/create-campaign');

  return (
    <div className="container" style={{padding:'20px 0'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h1 style={{margin:0,fontSize:22}}>Active Campaigns</h1>
        <div>
          <button onClick={handleCreate} className="btn btn-primary">Create Campaign</button>
        </div>
      </div>

    <div style={{display:'grid',gap:12,gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))'}}>
      {campaigns.map(c=> (
          <div key={c.id} style={{background:'#fff',borderRadius:12,padding:12,boxShadow:'0 6px 18px rgba(2,6,23,0.06)'}}>
            <div style={{height:100,borderRadius:8,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(90deg,#7c3aed,#06b6d4)',color:'#fff',marginBottom:10}}>
              <strong style={{fontSize:18}}>{c.title}</strong>
            </div>
            <p style={{margin:'0 0 12px 0',color:'#6b7280'}}>{c.desc}</p>
            <div style={{display:'flex',gap:8}}>
              <Link to={`/campaigns/${c.id}`} className="btn btn-secondary" style={{textDecoration:'none',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>View</Link>
              <Link to={c.type==='text'?`/text/${c.id}`:(c.type==='audio'?`/audio/${c.id}`:`/campaigns/${c.id}`)} className="btn btn-primary" style={{textDecoration:'none',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>Open</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
