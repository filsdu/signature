import React, { useEffect, useMemo, useRef, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { NicknameContext } from '../contexts/NicknameContext';

// minimal placement engine helpers (copy of the earlier logic simplified)
const overlaps = (a,b)=> {
  const buffer = 6;
  return a.x < b.x + b.w + buffer && a.x + a.w + buffer > b.x && a.y < b.y + b.h + buffer && a.y + a.h + buffer > b.y;
};

function rotatedBounds(w,h,rot){
  const cos = Math.cos(rot); const sin = Math.sin(rot);
  return { rw: Math.abs(w * cos) + Math.abs(h * sin), rh: Math.abs(w * sin) + Math.abs(h * cos) };
}

export default function TextCampaign(){
  const { id } = useParams();
  const { nickname } = useContext(NicknameContext);
  const [campaign, setCampaign] = useState(null);
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');
  const [color, setColor] = useState('#111827');
  const [bg, setBg] = useState('#ffffff');
  const [fontSize, setFontSize] = useState(18);
  const [rotation, setRotation] = useState(0);
  const wallRef = useRef(null);

  useEffect(()=>{
    try{
      const campaigns = JSON.parse(localStorage.getItem('mosaic:campaigns')||'[]');
      setCampaign(campaigns.find(c=>c.id===id) || { id, title: id });
    }catch(e){ setCampaign({ id, title: id }) }

    const raw = localStorage.getItem('mosaic:posts:'+id);
    if(raw) setPosts(JSON.parse(raw));
  },[id]);

  useEffect(()=>{
    localStorage.setItem('mosaic:posts:'+id, JSON.stringify(posts));
  },[posts,id]);

  const placeAuto = (itemW,itemH,rot)=>{
    const wall = wallRef.current;
    if(!wall) return {x:10,y:10};
    const rect = wall.getBoundingClientRect();
    const wallW = Math.max(400, Math.floor(rect.width));
    const wallH = Math.max(300, Math.floor(rect.height));

    const existing = posts.map(p=>({ x:p.x, y:p.y, w:p.w, h:p.h, rot:p.rotation }));

    for(let i=0;i<2000;i++){
      const x = Math.floor(Math.random()*(wallW - itemW));
      const y = Math.floor(Math.random()*(wallH - itemH));
      const bb = { x,y,w:itemW,h:itemH };
      const collides = existing.some(e=>{
        const b = rotatedBounds(e.w,e.h,e.rot||0);
        return overlaps(bb, { x:e.x, y:e.y, w:b.rw, h:b.rh });
      });
      if(!collides) return { x,y };
    }
    // fallback: grid scan
    return { x: Math.max(10, Math.floor(Math.random()*50)), y: Math.max(10, Math.floor(Math.random()*50)) };
  };

  const handlePost = (e)=>{
    e.preventDefault();
    if(!text.trim()) return;
    if(!nickname){ alert('Please choose a nickname first'); return; }
    // compute size estimate
    const w = Math.min(360, Math.max(120, Math.floor((text.length/2) + fontSize * 6)));
    const h = Math.min(220, Math.max(60, Math.floor(fontSize * 2.6 + (text.split('\n').length-1)*fontSize)));
    const rot = (rotation * Math.PI)/180;
    const pos = placeAuto(w,h,rot);
    const item = {
      id: 'p_'+Date.now()+''+Math.random().toString(36).slice(2,6),
      nickname: nickname,
      text: text.trim(),
      color, bg, fontSize, rotation, x: pos.x, y: pos.y, w, h, created_at: Date.now()
    };
    setPosts(prev=>[item,...prev]);
    setText('');
  };

  return (
    <div className="container" style={{padding:'20px 0'}}>
      <h1 style={{fontSize:20}}>{campaign?.title || 'Campaign'}</h1>
      <p style={{color:'#6b7280'}}>{campaign?.desc}</p>

      <div style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:16,marginTop:14}}>
        <div style={{background:'#fff',borderRadius:12,padding:12,minHeight:420,position:'relative'}}>
          <div ref={wallRef} style={{position:'relative',width:'100%',height:700,background:'#f7fafc',overflow:'hidden',borderRadius:10}}>
            {posts.map(p=> (
              <div key={p.id} style={{position:'absolute',left:p.x,top:p.y,width:p.w,height:p.h,transform:`rotate(${p.rotation}deg)`,transformOrigin:'center',padding:8,boxSizing:'border-box',background:p.bg,border:`1px solid #e6e9ee`,borderRadius:10,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{textAlign:'center',color:p.color,fontSize:p.fontSize,lineHeight:1.1,wordBreak:'break-word'}}>{p.text}</div>
              </div>
            ))}
          </div>
        </div>

        <aside style={{background:'#fff',borderRadius:12,padding:12}}>
          <h3 style={{marginTop:0}}>Create Text Shard</h3>
          <form onSubmit={handlePost} style={{display:'grid',gap:8}}>
            <textarea placeholder="Write your shard..." value={text} onChange={e=>setText(e.target.value)} style={{minHeight:120,padding:10,borderRadius:8,border:'1px solid #e6e9ee'}} />

            <div style={{display:'flex',gap:8}}>
              <label style={{display:'flex',flexDirection:'column',flex:1}}>
                <span style={{fontSize:12,color:'#6b7280'}}>Text Color</span>
                <input type="color" value={color} onChange={e=>setColor(e.target.value)} />
              </label>
              <label style={{display:'flex',flexDirection:'column',flex:1}}>
                <span style={{fontSize:12,color:'#6b7280'}}>BG Color</span>
                <input type="color" value={bg} onChange={e=>setBg(e.target.value)} />
              </label>
            </div>

            <label>
              <div style={{fontSize:12,color:'#6b7280'}}>Font size: {fontSize}px</div>
              <input type="range" min={12} max={40} value={fontSize} onChange={e=>setFontSize(parseInt(e.target.value))} />
            </label>

            <label>
              <div style={{fontSize:12,color:'#6b7280'}}>Rotation: {rotation}°</div>
              <input type="range" min={-45} max={45} value={rotation} onChange={e=>setRotation(parseInt(e.target.value))} />
            </label>

            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-primary" type="submit">Auto Place & Post</button>
              <button type="button" className="btn btn-secondary" onClick={()=>{
                alert('Manual placement coming soon — this is the prototype auto-placement.')
              }}>Manual Place</button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}
