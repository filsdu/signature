import React, { useEffect, useRef, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { NicknameContext } from '../contexts/NicknameContext';

const STORAGE_PREFIX = 'mosaic:audio:';

function loadPosts(id){
  try{ return JSON.parse(localStorage.getItem(STORAGE_PREFIX+id) || '[]'); }catch(e){ return []; }
}
function savePosts(id, list){ try{ localStorage.setItem(STORAGE_PREFIX+id, JSON.stringify(list)); }catch(e){}
}

export default function AudioCampaign(){
  const { id } = useParams();
  const { nickname } = useContext(NicknameContext);
  const [campaign, setCampaign] = useState(null);
  const [posts, setPosts] = useState([]);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [shuffle, setShuffle] = useState(true);
  const [loop, setLoop] = useState(false);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const audioRef = useRef(null);

  useEffect(()=>{
    try{ const campaigns = JSON.parse(localStorage.getItem('mosaic:campaigns')||'[]'); setCampaign(campaigns.find(c=>c.id===id) || {id, title:id}); }catch(e){ setCampaign({id, title:id}); }
    setPosts(loadPosts(id));
  },[id]);

  useEffect(()=>{ savePosts(id, posts); },[id,posts]);

  // Build queue when posts or settings change
  useEffect(()=>{
    let list = posts.map((p,i)=>i);
    if(shuffle) list = list.sort(()=>Math.random()-0.5);
    setQueue(list);
    setCurrentIndex(list.length?0:-1);
  },[posts, shuffle]);

  useEffect(()=>{
    if(!audioRef.current) return;
    const audio = audioRef.current;
    const onEnd = ()=>{
      if(queue.length===0) return;
      let next = currentIndex + 1;
      if(next >= queue.length){
        if(loop) next = 0; else { setAutoplay(false); return; }
      }
      setCurrentIndex(next);
    };
    audio.addEventListener('ended', onEnd);
    return ()=> audio.removeEventListener('ended', onEnd);
  },[audioRef, currentIndex, queue, loop]);

  useEffect(()=>{
    if(!autoplay) return;
    if(currentIndex < 0 || !queue[currentIndex]) return;
    const idx = queue[currentIndex];
    const p = posts[idx];
    if(!p) return;
    const audio = audioRef.current;
    audio.src = p.dataUrl;
    audio.play().catch(()=>{});
  },[autoplay, currentIndex, queue, posts]);

  const handleFile = async (file) => {
    if(!file) return;
    setUploading(true);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const item = { id: 'a_'+Date.now()+Math.random().toString(36).slice(2,6), nickname: nickname||'anon', title: file.name, dataUrl, created_at: Date.now() };
      setPosts(prev=>[item,...prev]);
      setUploading(false);
      setFileName('');
    };
    reader.onerror = () => { setUploading(false); alert('Failed to read file') };
    reader.readAsDataURL(file);
  };

  const onUpload = (e)=>{
    const f = e.target.files && e.target.files[0]; if(f) handleFile(f);
  };

  const playIndex = (i)=>{
    const audio = audioRef.current; if(!audio) return;
    const p = posts[i]; if(!p) return;
    setAutoplay(true);
    const idx = queue.indexOf(i);
    if(idx >= 0) setCurrentIndex(idx);
    audio.src = p.dataUrl; audio.play().catch(()=>{});
  };

  return (
    <div className="container" style={{padding:'18px 0'}}>
      <h1 style={{fontSize:20,marginBottom:6}}>{campaign?.title || 'Audio Campaign'}</h1>
      <p style={{color:'#6b7280'}}>{campaign?.desc || 'Share short voice takes and let them play on the wall.'}</p>

      <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:12,marginTop:12}}>
        <section style={{background:'#fff',borderRadius:12,padding:12}}>
          <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
            <label style={{display:'inline-flex',alignItems:'center',gap:8}} className="btn btn-secondary">
              <input type="file" accept="audio/*" onChange={onUpload} style={{display:'none'}} />
              {uploading ? 'Uploading...' : 'Upload Audio'}
            </label>
            <div style={{color:'#6b7280'}}>Or drag & drop audio (mobile browsers may not support drag).</div>
          </div>

          <div style={{marginTop:12}}>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              <button className="btn btn-primary" onClick={()=> setAutoplay(v=>!v)}>{autoplay? 'Pause Autoplay' : 'Start Autoplay'}</button>
              <button className="btn btn-secondary" onClick={()=> setShuffle(s=>!s)}>{shuffle? 'Shuffle: On' : 'Shuffle: Off'}</button>
              <button className="btn btn-secondary" onClick={()=> setLoop(l=>!l)}>{loop? 'Loop: On' : 'Loop: Off'}</button>
            </div>

            <div style={{marginTop:12}}>
              {posts.length===0 && <div style={{color:'#6b7280'}}>No audio posts yet — be the first!</div>}
              <ul style={{listStyle:'none',padding:0,margin:0,display:'grid',gap:8}}>
                {posts.map((p, idx)=> (
                  <li key={p.id} style={{background:'#fafafa',padding:10,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <div style={{width:44,height:44,borderRadius:8,background:'#e6e9ee',display:'flex',alignItems:'center',justifyContent:'center'}}>{p.nickname?.charAt(0)?.toUpperCase()}</div>
                      <div>
                        <div style={{fontSize:14,fontWeight:600}}>{p.title}</div>
                        <div style={{fontSize:12,color:'#6b7280'}}>{p.nickname}</div>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button className="btn btn-primary" onClick={()=> playIndex(idx)}>Play</button>
                      <a className="btn btn-secondary" href={p.dataUrl} download={p.title}>Download</a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <aside style={{background:'#fff',borderRadius:12,padding:12}}>
          <h3 style={{marginTop:0}}>Player</h3>
          <audio ref={audioRef} controls style={{width:'100%'}} />
          <div style={{marginTop:8,fontSize:13,color:'#6b7280'}}>Queue: {queue.length} items</div>
          <div style={{marginTop:12}}>
            <div style={{fontSize:13,color:'#6b7280'}}>Tip: use autoplay + shuffle to listen to random takes continuously.</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
