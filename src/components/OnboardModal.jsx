import React, { useContext, useState } from 'react';
import { NicknameContext } from '../contexts/NicknameContext';

export default function OnboardModal() {
  const { nickname, setNickname } = useContext(NicknameContext);
  const [value, setValue] = useState(nickname || '');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const trimmed = (value || '').trim();
    if (!trimmed) {
      setError('Please enter a nickname');
      return;
    }
    if (trimmed.length < 2) {
      setError('Nickname too short');
      return;
    }
    // sanitize: allow letters numbers underscores and spaces
    const cleaned = trimmed.replace(/[^\w\s-]/g, '').slice(0,32);
    setNickname(cleaned);
  };

  if (nickname) return null;

  return (
    <div style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:1200,background:'rgba(2,6,23,0.6)'}}>
      <div style={{width:'min(520px,92%)',background:'#fff',borderRadius:16,padding:20,boxShadow:'0 8px 40px rgba(2,6,23,0.24)'}}>
        <h2 style={{margin:0,marginBottom:8,fontSize:20}}>Welcome to Mosaic Voice</h2>
        <p style={{marginTop:0,color:'#6b7280'}}>Pick a public nickname (no email needed). Display name only — optional avatar and bio later.</p>
        <form onSubmit={submit} style={{marginTop:12,display:'flex',gap:8,flexDirection:'column'}}>
          <input
            autoFocus
            placeholder="Your creative nickname (eg. LunaSky)"
            value={value}
            onChange={(e)=>{setValue(e.target.value); setError('')}}
            style={{padding:'10px 12px',borderRadius:10,border:'1px solid #e6e9ee',fontSize:15}}
          />
          {error && <div style={{color:'#b91c1c',fontSize:13}}>{error}</div>}
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button type="submit" style={{padding:'10px 14px',borderRadius:10,background:'#111827',color:'#fff',border:'none'}}>Join the Mosaic</button>
          </div>
        </form>
      </div>
    </div>
  );
}
