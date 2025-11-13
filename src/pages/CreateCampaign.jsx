import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'mosaic:campaigns';

function loadCampaigns(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }catch(e){return []}
}
function saveCampaigns(list){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }catch(e){}
}

export default function CreateCampaign(){
  const [title,setTitle] = useState('');
  const [type,setType] = useState('text');
  const [desc,setDesc] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e)=>{
    e.preventDefault();
    if(!title) return alert('Give it a title');
    const id = title.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-_]/g,'') + '-' + Math.random().toString(36).slice(2,7);
    const list = loadCampaigns();
    const item = { id, title, type, desc, created_at: Date.now() };
    list.unshift(item);
    saveCampaigns(list);
    navigate(type==='text'?`/text/${id}`:`/campaigns/${id}`);
  };

  return (
    <div className="container" style={{padding:'20px 0'}}>
      <h1 style={{fontSize:20}}>Create Campaign</h1>
      <form onSubmit={handleSubmit} style={{marginTop:12,display:'grid',gap:10,maxWidth:640}}>
        <input placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} className="" style={{padding:10,borderRadius:8,border:'1px solid #e6e9ee'}} />
        <select value={type} onChange={e=>setType(e.target.value)} style={{padding:10,borderRadius:8,border:'1px solid #e6e9ee'}}>
          <option value="text">Text</option>
          <option value="photo">Photo</option>
          <option value="signature">Signature</option>
          <option value="audio">Audio</option>
        </select>
        <textarea placeholder="Short description" value={desc} onChange={e=>setDesc(e.target.value)} style={{padding:10,borderRadius:8,border:'1px solid #e6e9ee'}} />
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-primary" type="submit">Create</button>
        </div>
      </form>
    </div>
  );
}
