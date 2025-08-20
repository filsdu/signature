import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

/**
 * WORD CAMPAIGN BOARD — premium version
 *
 * - Admin gates to a specific identity:
 *     env VITE_ADMIN_NAME (defaults to "Toklo")
 *     env VITE_ADMIN_EMAIL (optional)
 *   We read the Supabase auth session; only matching users see admin.
 *
 * - Giant auto-fit text mask:
 *     Tries 1..4 lines (or per-letter if short), binary-searches font size to
 *     fill the wall (≈ 96%) while respecting width + height constraints.
 *
 * - Strict inside-letter placement + CSS mask clip:
 *     5x5 interior grid + edge samples (all alpha > 240) or reject spot.
 *     CSS mask image on the wall ensures no visual bleed outside letters.
 *
 * - Working share / download / report buttons.
 *
 * Quick SQL (run once if you don’t have the table yet):
 *   create table if not exists public.word_signatures (
 *     id uuid primary key default gen_random_uuid(),
 *     campaign text not null,
 *     owner text not null,
 *     url text not null,
 *     x int not null,
 *     y int not null,
 *     w int not null,
 *     h int not null,
 *     rot_deg int not null default 0,
 *     name text,
 *     created_at timestamptz default now()
 *   );
 *   alter table public.word_signatures enable row level security;
 *   drop policy if exists ws_select_all on public.word_signatures;
 *   drop policy if exists ws_insert_all on public.word_signatures;
 *   drop policy if exists ws_delete_owner on public.word_signatures;
 *   create policy ws_select_all  on public.word_signatures for select using (true);
 *   create policy ws_insert_all  on public.word_signatures for insert with check (true);
 *   create policy ws_delete_owner on public.word_signatures for delete using (true);
 *
 * Optional simple reports table used by “Report Issue”:
 *   create table if not exists public.reports(
 *     id uuid primary key default gen_random_uuid(),
 *     campaign text not null,
 *     message text not null,
 *     created_at timestamptz default now()
 *   );
 *   alter table public.reports enable row level security;
 *   create policy if not exists reports_insert on public.reports
 *     for insert with check (true);
 */

// ---------- Supabase client ----------
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- Admin allowlist ----------
const ADMIN_NAME  = (import.meta.env.VITE_ADMIN_NAME  || "Toklo Pazat Gamer").toLowerCase();
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "").toLowerCase();

// ---------- Wall constants ----------
const WALL_W = 5000;
const WALL_H = 3000;
const PAD_PCT = 0.02; // ~2% margin around text

// Signature size bounds (kept tight so the letters fill nicely)
const MIN_W = 70,  MAX_W = 110;
const MIN_H = 35,  MAX_H = 55;

// ---------- SignaturePad ----------
function SignaturePad({ onExport, color = "#111827", width = 500, height = 200 }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [last, setLast] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    c.width = width * dpr;
    c.height = height * dpr;
    c.style.width = width + "px";
    c.style.height = height + "px";
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.clearRect(0,0,width,height);
  }, [width, height, color]);

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (e.touches) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    const p = pos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    setIsDrawing(true);
    setLast(p);
  };
  const draw = (e) => {
    if (!isDrawing) return;
    const p = pos(e);
    const ctx = canvasRef.current.getContext("2d");
    const dist = Math.hypot(p.x - last.x, p.y - last.y);
    ctx.lineWidth = Math.max(2, Math.min(5, 10 - dist / 10));
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasInk(true);
    setLast(p);
  };
  const end = () => setIsDrawing(false);

  const clear = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0,0,width,height);
    setHasInk(false);
  };

  const trimExport = () => {
    const src = canvasRef.current;
    const ctx = src.getContext("2d");
    const img = ctx.getImageData(0,0,src.width,src.height);
    const w = src.width, h = src.height, d = img.data;
    let minX=w, minY=h, maxX=0, maxY=0, ink=false;
    const step = 4;
    for (let y=0; y<h; y++){
      for (let x=0; x<w; x++){
        const a = d[(y*w+x)*4+3];
        if (a>0){ ink=true; if(x<minX)minX=x; if(y<minY)minY=y; if(x>maxX)maxX=x; if(y>maxY)maxY=y; }
      }
    }
    if(!ink) return;
    const out = document.createElement("canvas");
    const pad = 5;
    const tw = Math.max(1, maxX - minX + 1 + pad*2);
    const th = Math.max(1, maxY - minY + 1 + pad*2);
    out.width = tw; out.height = th;
    out.getContext("2d").drawImage(src, minX-pad, minY-pad, tw, th, 0, 0, tw, th);
    onExport(out.toDataURL("image/png"));
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-zinc-600">Sign below</div>
        <div className="flex gap-2 text-sm">
          <button onClick={clear} className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200">Clear</button>
          <button onClick={trimExport} disabled={!hasInk}
                  className={`px-3 py-1.5 rounded-xl ${hasInk ? "bg-black text-white hover:opacity-90" : "bg-zinc-300 text-zinc-500 cursor-not-allowed"}`}>
            Use this
          </button>
        </div>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-inner overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={start} onMouseMove={draw} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={draw} onTouchEnd={end}
          className="block w-full h-full"
          style={{ height: `${height}px` }}
        />
      </div>
    </div>
  );
}

// ---------- Text mask + outline (auto-fit multiline) ----------
function computeLayoutLines(raw) {
  const text = (raw || "").trim().replace(/\s+/g, " ");
  if (!text) return [[""]];

  // If single token and very short (<=5), lay letters on separate lines for max size.
  const words = text.split(" ");
  if (words.length === 1 && text.length <= 5) {
    return text.split("").map(ch => [ch]); // [['B'],['L'],['M']]
  }

  // Try 1..4 lines; distribute words as evenly as possible.
  const maxLines = Math.min(4, words.length);
  const layouts = [];
  for (let lines = 1; lines <= Math.max(1, maxLines); lines++) {
    const per = Math.ceil(words.length / lines);
    const arr = [];
    for (let i = 0; i < words.length; i += per) {
      arr.push(words.slice(i, i + per).join(" "));
    }
    layouts.push(arr);
  }
  return layouts;
}

function measureFontForLayout(ctx, lines, maxW, maxH, pad) {
  // Binary search font size to fit both width and height
  const lineHeight = 1.08; // tight
  let lo = 10, hi = 1200, best = 10;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    ctx.font = `800 ${mid}px Inter, system-ui, Arial`;
    const widest = Math.max(...lines.map(l => ctx.measureText(l).width));
    const height = lines.length * mid * lineHeight;
    if (widest <= (maxW - pad*2) && height <= (maxH - pad*2)) {
      best = mid; lo = mid + 4;
    } else {
      hi = mid - 4;
    }
  }
  return best;
}

function buildMaskCanvas(phrase) {
  const cnv = document.createElement("canvas");
  cnv.width = WALL_W; cnv.height = WALL_H;
  const ctx = cnv.getContext("2d");
  ctx.clearRect(0,0,WALL_W,WALL_H);

  const pad = Math.floor(Math.min(WALL_W, WALL_H) * PAD_PCT);
  const candidateLayouts = computeLayoutLines(phrase);
  let best = { size: 0, lines: candidateLayouts[0] };

  candidateLayouts.forEach(lines => {
    const size = measureFontForLayout(ctx, lines, WALL_W, WALL_H, pad);
    if (size > best.size) best = { size, lines };
  });

  // Paint filled text mask (solid alpha for precise hit test)
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const lh = best.size * 1.08;
  const totalH = lh * best.lines.length;
  let y = (WALL_H - totalH) / 2 + best.size; // baseline of first line
  ctx.font = `800 ${best.size}px Inter, system-ui, Arial`;
  best.lines.forEach(line => {
    ctx.fillText(line, WALL_W/2, y);
    y += lh;
  });

  return { canvas: cnv, lines: best.lines, fontSize: best.size };
}

function OutlinePreview({ maskCanvas }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!maskCanvas || !ref.current) return;
    const c = ref.current, ctx = c.getContext("2d");
    c.width = WALL_W; c.height = WALL_H;
    ctx.clearRect(0,0,WALL_W,WALL_H);
    ctx.globalAlpha = 0.12;
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.globalAlpha = 1;
  }, [maskCanvas]);
  return (
    <canvas ref={ref}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ width: WALL_W, height: WALL_H }}/>
  );
}

// ---------- Placement engine ----------
const Placement = {
  rotatedBounds(w, h, rotRad) {
    const c = Math.cos(rotRad), s = Math.sin(rotRad);
    return { rw: Math.abs(w*c)+Math.abs(h*s), rh: Math.abs(w*s)+Math.abs(h*c) };
  },
  overlaps(a,b){ return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y; },

  grid(width, height, cell=120){
    const g = {};
    return {
      add(item, x,y,w,h){
        const sx=Math.floor(x/cell), sy=Math.floor(y/cell);
        const ex=Math.floor((x+w)/cell), ey=Math.floor((y+h)/cell);
        for(let i=sx;i<=ex;i++) for(let j=sy;j<=ey;j++){
          const k = `${i},${j}`; (g[k] ||= []).push(item);
        }
      },
      near(x,y,w,h){
        const sx=Math.floor(x/cell), sy=Math.floor(y/cell);
        const ex=Math.floor((x+w)/cell), ey=Math.floor((y+h)/cell);
        const out = new Set();
        for(let i=sx;i<=ex;i++) for(let j=sy;j<=ey;j++){
          const k = `${i},${j}`; (g[k]||[]).forEach(it=>out.add(it));
        }
        return [...out];
      }
    };
  },

  /** strict inside check: 5x5 + edge samples (alpha >240) */
  rectInsideMask(maskCanvas, x, y, w, h) {
    const ctx = maskCanvas.getContext("2d");
    const data = ctx.getImageData(0,0,maskCanvas.width,maskCanvas.height).data;
    const W = maskCanvas.width;

    const sample = (px,py) => {
      if (px<0 || py<0 || px>=maskCanvas.width || py>=maskCanvas.height) return false;
      return data[(py*W+px)*4+3] > 240;
    };

    // corners + mid-edges
    const edges = [
      [x,y], [x+w,y], [x,y+h], [x+w,y+h],               // corners
      [x+w/2,y], [x+w/2,y+h], [x,y+h/2], [x+w,y+h/2]    // edges
    ];
    for (const [ex,ey] of edges) if (!sample(Math.floor(ex), Math.floor(ey))) return false;

    // interior grid 5x5
    const cols = 5, rows = 5;
    for (let i=1;i<=cols;i++){
      for (let j=1;j<=rows;j++){
        const px = Math.floor(x + (i-0.5)*w/cols);
        const py = Math.floor(y + (j-0.5)*h/rows);
        if (!sample(px,py)) return false;
      }
    }
    return true;
  },

  find(maskCanvas, imgW, imgH, rotRad, existing, maxTries=3000){
    const { rw, rh } = this.rotatedBounds(imgW, imgH, rotRad);
    const w = Math.ceil(rw), h = Math.ceil(rh);

    const grid = this.grid(maskCanvas.width, maskCanvas.height);
    existing.forEach(e=>{
      const b = this.rotatedBounds(e.w,e.h,e.rot);
      grid.add(e, e.x, e.y, b.rw, b.rh);
    });

    for (let i=0; i<maxTries; i++){
      const x = Math.floor(Math.random() * Math.max(1, maskCanvas.width - w));
      const y = Math.floor(Math.random() * Math.max(1, maskCanvas.height - h));

      if (!this.rectInsideMask(maskCanvas, x, y, w, h)) continue;

      const bb = {x,y,w,h};
      const near = grid.near(x,y,w,h);
      const collide = near.some(e=>{
        const b = this.rotatedBounds(e.w,e.h,e.rot);
        return this.overlaps(bb, {x:e.x,y:e.y,w:b.rw,h:b.rh});
      });
      if (!collide) return { x, y };
    }
    return null;
  }
};

// ---------- Hook: Supabase auth user ----------
function useAuthUser() {
  const [user, setUser] = useState(null);
  useEffect(()=>{
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess)=>{
      setUser(sess?.user || null);
    });
    return () => sub?.subscription?.unsubscribe?.();
  },[]);
  return user;
}

// ---------- Main Component ----------
export default function WordCampaignBoard() {
  // session/user + admin
  const user = useAuthUser();
  const isAdmin = useMemo(()=>{
    if (!user) return false;
    const full = (user.user_metadata?.full_name || user.user_metadata?.name || "").toLowerCase();
    const email = (user.email || "").toLowerCase();
    const nameOk  = full && full === ADMIN_NAME;
    const emailOk = ADMIN_EMAIL && email === ADMIN_EMAIL;
    return nameOk || emailOk;
  }, [user]);

  // wall state
  const [campaigns, setCampaigns] = useState([]);
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [maskCanvas, setMaskCanvas] = useState(null);
  const [maskURL, setMaskURL] = useState(null); // for CSS mask

  const [signatures, setSignatures] = useState([]);
  const [sigDataUrl, setSigDataUrl] = useState(null);
  const [sigColor, setSigColor] = useState("#111827");
  const [sigSize, setSigSize] = useState(0.5);
  const [rotation, setRotation] = useState(0);
  const [displayName, setDisplayName] = useState("");

  const [zoom, setZoom] = useState(0.5);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const wallScrollRef = useRef(null);
  const wallInnerRef = useRef(null);

  const userId = useMemo(() => {
    let id = sessionStorage.getItem("ss_user");
    if (!id) { id = crypto.getRandomValues(new Uint32Array(1))[0].toString(16); sessionStorage.setItem("ss_user", id); }
    return id;
  }, []);

  const hasSigned = useMemo(()=> signatures.some(s => s.owner === userId), [signatures, userId]);

  // load campaigns (from query or localStorage; admin can add)
  useEffect(()=>{
    const url = new URL(window.location.href);
    const c = url.searchParams.get("c");
    const stored = JSON.parse(localStorage.getItem("signatureShardsCampaigns") || "[]");
    if (stored.length === 0) {
      const defaults = ["FREEDOM", "EQUALITY", "JUSTICE"];
      localStorage.setItem("signatureShardsCampaigns", JSON.stringify(defaults));
      setCampaigns(defaults);
      setActiveCampaign(c || defaults[0]);
    } else {
      setCampaigns(stored);
      setActiveCampaign(c && stored.includes(c) ? c : stored[0]);
    }
  },[]);

  // build/rebuild mask when campaign changes
  useEffect(()=>{
    if (!activeCampaign) return;
    const { canvas } = buildMaskCanvas(activeCampaign);
    setMaskCanvas(canvas);
    setMaskURL(canvas.toDataURL("image/png"));
  }, [activeCampaign]);

  // load + realtime
  useEffect(()=>{
    if (!activeCampaign) return;
    let channel;
    (async ()=>{
      const { data, error } = await supabase
        .from("word_signatures")
        .select("*")
        .eq("campaign", activeCampaign)
        .order("created_at",{ascending:true});
      if (error) {
        console.error(error);
        setMsg("Could not load signatures.");
      } else {
        setSignatures(data.map(r => ({
          id: r.id, url: r.url, x: r.x, y: r.y, w: r.w, h: r.h,
          rot: (r.rot_deg||0) * Math.PI / 180,
          owner: r.owner, name: r.name || "", showName: false
        })));
      }

      channel = supabase
        .channel(`word_signatures:${activeCampaign}`)
        .on("postgres_changes",
          { event: "*", schema:"public", table:"word_signatures", filter:`campaign=eq.${activeCampaign}` },
          payload => {
            if (payload.eventType === "INSERT") {
              const n = payload.new;
              setSignatures(prev => prev.some(p=>p.id===n.id) ? prev : [...prev, {
                id:n.id,url:n.url,x:n.x,y:n.y,w:n.w,h:n.h,
                rot:(n.rot_deg||0)*Math.PI/180,owner:n.owner,name:n.name||"",showName:false
              }]);
            } else if (payload.eventType === "DELETE") {
              setSignatures(prev => prev.filter(p=>p.id !== payload.old.id));
            } else if (payload.eventType === "UPDATE") {
              const n = payload.new;
              setSignatures(prev => prev.map(p => p.id===n.id ? {
                ...p, x:n.x,y:n.y,w:n.w,h:n.h, rot:(n.rot_deg||0)*Math.PI/180, name:n.name||""
              } : p));
            }
          })
        .subscribe();
    })();
    return ()=>{ if (channel) supabase.removeChannel(channel); };
  }, [activeCampaign]);

  // place signature
  const place = async () => {
    if (!sigDataUrl) { setMsg("Create a signature first."); return; }
    if (!maskCanvas)  { setMsg("Building campaign word…"); return; }

    setBusy(true); setMsg("Finding a perfect spot…");
    const img = new Image();
    img.onload = async () => {
      try {
        const base = Math.min(img.width, img.height);
        const target = MIN_W + (MAX_W - MIN_W) * sigSize;
        const ratio = target / base;
        const w = Math.max(MIN_W, Math.min(MAX_W, Math.round(img.width * ratio)));
        const h = Math.max(MIN_H, Math.min(MAX_H, Math.round(img.height * ratio)));
        const rotDeg = Math.round(rotation + (Math.random()*20 - 10));
        const rotRad = rotDeg * Math.PI / 180;

        const spot = Placement.find(maskCanvas, w, h, rotRad, signatures, 3500);
        if (!spot) { setMsg("This campaign is full at the current size—try smaller."); setBusy(false); return; }

        const row = {
          campaign: activeCampaign,
          owner: userId,
          url: sigDataUrl,
          x: Math.round(spot.x),
          y: Math.round(spot.y),
          w, h,
          rot_deg: rotDeg,
          name: displayName.trim().slice(0,20)
        };
        const { error } = await supabase.from("word_signatures").insert(row);
        if (error) { console.error("Supabase insert error:", error); setMsg("Failed to save your signature."); }
        else { setMsg("Placed!"); setSigDataUrl(null); setTimeout(()=>locateMine(), 200); }
      } finally {
        setBusy(false);
      }
    };
    img.src = sigDataUrl;
  };

  // erase mine
  const eraseMine = async () => {
    const mine = signatures.find(s => s.owner === userId);
    if (!mine) { setMsg("You haven’t placed a signature yet."); return; }
    setBusy(true);
    try {
      // optimistic update
      setSignatures(prev => prev.filter(p => p.id !== mine.id));
      const { error } = await supabase.from("word_signatures")
        .delete().eq("id", mine.id).eq("owner", userId);
      if (error) {
        console.error("Supabase delete error:", error);
        // restore if failed
        setSignatures(prev => [...prev, mine]);
        setMsg("Failed to remove your signature.");
      } else {
        setMsg("Removed.");
      }
    } finally {
      setBusy(false);
    }
  };

  // locate mine
  const locateMine = () => {
    const mine = signatures.find(s => s.owner === userId);
    if (!mine || !wallScrollRef.current) return;
    const container = wallScrollRef.current;
    const cx = mine.x + mine.w/2, cy = mine.y + mine.h/2;
    const left = Math.max(0, Math.min(cx - container.clientWidth /(2*zoom), WALL_W - container.clientWidth /zoom));
    const top  = Math.max(0, Math.min(cy - container.clientHeight/(2*zoom), WALL_H - container.clientHeight/zoom));
    container.scrollTo({ left, top, behavior: "smooth" });
    const el = wallInnerRef.current?.querySelector(`[data-sig-id="${mine.id}"]`);
    if (el) { el.setAttribute("data-flash","1"); setTimeout(()=>el.removeAttribute("data-flash"),1500); }
  };

  // admin: create / delete campaign
  const [newCampaign, setNewCampaign] = useState("");
  const addCampaign = () => {
    const t = newCampaign.trim().toUpperCase();
    if (!t) return;
    const next = [...new Set([...campaigns, t])];
    setCampaigns(next);
    localStorage.setItem("signatureShardsCampaigns", JSON.stringify(next));
    setActiveCampaign(t);
    setNewCampaign("");
    const url = new URL(window.location.href); url.searchParams.set("c", t); history.replaceState(null,"",url.toString());
  };
  const removeCampaign = (t) => {
    const next = campaigns.filter(x => x !== t);
    setCampaigns(next);
    localStorage.setItem("signatureShardsCampaigns", JSON.stringify(next));
    if (activeCampaign === t && next.length) setActiveCampaign(next[0]);
  };

  // share / download / report
  const shareCampaign = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("c", activeCampaign);
    const shareUrl = url.toString();
    if (navigator.share) {
      try { await navigator.share({ title: `Campaign: ${activeCampaign}`, text: "Join the word wall!", url: shareUrl }); }
      catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setMsg("Link copied to clipboard.");
    }
  };

  const downloadImage = async () => {
    if (!maskCanvas) return;
    const out = document.createElement("canvas");
    out.width = WALL_W; out.height = WALL_H;
    const ctx = out.getContext("2d");
    // draw signatures (with rotation)
    for (const s of signatures) {
      const img = new Image();
      await new Promise(res => { img.onload = res; img.src = s.url; });
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.drawImage(img, 0, 0, s.w, s.h);
      ctx.restore();
    }
    // clip with mask (keep destination where mask alpha)
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.globalCompositeOperation = "source-over";

    const a = document.createElement("a");
    a.href = out.toDataURL("image/png");
    a.download = `${activeCampaign.replace(/\s+/g,'_')}.png`;
    a.click();
  };

  const reportIssue = async () => {
    const message = prompt("Describe the issue (a short note will be saved):");
    if (!message) return;
    try {
      const { error } = await supabase.from("reports").insert({ campaign: activeCampaign, message });
      if (error) throw error;
      setMsg("Thanks! Your report was recorded.");
    } catch {
      // fallback: email
      window.location.href = `mailto:admin@example.com?subject=Report%20${encodeURIComponent(activeCampaign)}&body=${encodeURIComponent(message)}`;
    }
  };

  // palette
  const palette = ['#111827','#b91c1c','#1d4ed8','#0f766e','#ca8a04','#86198f','#dc2626','#2563eb','#059669','#d97706','#7e22ce'];

  if (!activeCampaign) return <div className="min-h-screen grid place-items-center">Loading…</div>;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-purple-50 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-indigo-700">Signature Shards</h1>
              <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">Word Campaign</span>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                  Admin
                </span>
              )}
              <a href="/" className="text-sm text-gray-600 hover:text-indigo-700">← Home</a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAdmin ? (
          // Admin View
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold mb-6">Campaign Management</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Create New Campaign</h3>
                <div className="space-y-3">
                  <input
                    value={newCampaign}
                    onChange={e=>setNewCampaign(e.target.value)}
                    placeholder="e.g., BLACK LIVES MATTER"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <button onClick={addCampaign}
                          disabled={!newCampaign.trim()}
                          className={`px-4 py-2 rounded-xl ${newCampaign.trim() ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-gray-200 text-gray-500"}`}>
                    Create
                  </button>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Existing</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {campaigns.map(c=>(
                    <div key={c} className={`p-3 rounded border flex justify-between items-center ${activeCampaign===c ? "bg-indigo-50 border-indigo-400" : "bg-gray-50 border-gray-200"}`}>
                      <span className="font-medium">"{c}"</span>
                      <div className="flex gap-2">
                        <button onClick={()=>setActiveCampaign(c)} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">View</button>
                        <button onClick={()=>removeCampaign(c)} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // User View
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Controls */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-5 border">
                <h2 className="text-lg font-semibold mb-2">Select Campaign</h2>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {campaigns.map(c=>(
                    <button key={c} onClick={()=>{ setActiveCampaign(c); const u=new URL(window.location.href); u.searchParams.set("c",c); history.replaceState(null,"",u.toString()); }}
                            className={`w-full text-left px-4 py-3 rounded-lg border ${activeCampaign===c ? "bg-indigo-100 border-indigo-500 text-indigo-700" : "bg-gray-100 border-gray-200 hover:bg-gray-200"}`}>
                      "{c}"
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">{signatures.length} signatures</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 border">
                <h2 className="text-lg font-semibold mb-3">Create Your Signature</h2>
                <SignaturePad onExport={setSigDataUrl} color={sigColor} width={320} height={160}/>
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Color</p>
                  <div className="flex flex-wrap gap-2">
                    {palette.map(c => (
                      <button key={c} onClick={()=>setSigColor(c)}
                              className={`w-8 h-8 rounded-full border-2 ${sigColor===c ? "scale-110 ring-2 ring-offset-2 ring-indigo-300" : ""}`}
                              style={{ background:c, borderColor: c==="#111827" ? "#e5e7eb" : c }}/>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 border">
                <h2 className="text-lg font-semibold mb-3">Options</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-1">Size: <span className="text-indigo-600">{Math.round(sigSize*100)}%</span></label>
                    <input type="range" min="30" max="70" value={sigSize*100} onChange={e=>setSigSize(+e.target.value/100)} className="w-full"/>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Rotation: <span className="text-indigo-600">{rotation}°</span></label>
                    <input type="range" min="-45" max="45" value={rotation} onChange={e=>setRotation(parseInt(e.target.value))} className="w-full"/>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Display name (optional)</label>
                    <input value={displayName} onChange={e=>setDisplayName(e.target.value.slice(0,20))}
                           placeholder="Your name" className="w-full px-3 py-2 border rounded-lg"/>
                    <p className="text-xs text-gray-500 mt-1">{displayName.length}/20</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 border">
                <h2 className="text-lg font-semibold mb-3">Actions</h2>
                <div className="space-y-3">
                  <button onClick={place}
                          disabled={!sigDataUrl || hasSigned || busy}
                          className={`w-full py-3 rounded-xl font-medium ${(!sigDataUrl || hasSigned || busy) ? "bg-gray-200 text-gray-500" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
                    {busy ? "Placing…" : hasSigned ? "Already signed" : "Place my signature"}
                  </button>
                  <button onClick={eraseMine} disabled={!hasSigned || busy}
                          className={`w-full py-2 rounded-xl ${(!hasSigned || busy) ? "bg-gray-100 text-gray-400" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                    Remove my signature
                  </button>
                  <button onClick={locateMine} disabled={!hasSigned}
                          className={`w-full py-2 rounded-xl ${!hasSigned ? "bg-gray-100 text-gray-400" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                    Find my signature
                  </button>
                </div>
                {msg && <div className="mt-4 p-3 text-sm rounded border bg-gray-50">{msg}</div>}
              </div>
            </div>

            {/* Wall */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm p-5 border mb-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                  <h2 className="text-xl font-bold">"{activeCampaign}"</h2>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-gray-100 rounded-lg px-3 py-1.5">
                      <button onClick={()=>setZoom(z=>Math.max(0.2, +(z-0.1).toFixed(1)))} className="p-1">−</button>
                      <span className="mx-2 text-sm font-medium min-w-[3rem] text-center">{Math.round(zoom*100)}%</span>
                      <button onClick={()=>setZoom(z=>Math.min(2,   +(z+0.1).toFixed(1)))} className="p-1">+</button>
                    </div>
                    <button onClick={shareCampaign} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded">Share</button>
                    <button onClick={downloadImage} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded">Download</button>
                    <button onClick={reportIssue} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded">Report</button>
                  </div>
                </div>

                <div className="relative bg-gray-100 rounded-lg overflow-hidden border">
                  <div ref={wallScrollRef} className="h-96 overflow-auto relative">
                    <div
                      ref={wallInnerRef}
                      className="relative mx-auto my-6"
                      style={{
                        width: WALL_W + "px",
                        height: WALL_H + "px",
                        backgroundSize: "24px 24px",
                        backgroundImage: "radial-gradient(#d4d4d8 1px, transparent 1px)",
                        transform: `scale(${zoom})`,
                        transformOrigin: "top left",
                        WebkitMaskImage: maskURL ? `url(${maskURL})` : "none",
                        maskImage:       maskURL ? `url(${maskURL})` : "none",
                        WebkitMaskSize: "100% 100%",
                        maskSize: "100% 100%",
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskPosition: "top left",
                        maskPosition: "top left"
                      }}
                    >
                      {/* faint preview */}
                      <OutlinePreview maskCanvas={maskCanvas} />

                      {/* signatures */}
                      {signatures.map(p=>(
                        <div key={p.id} data-sig-id={p.id}
                             className="absolute select-none transition-transform hover:z-10"
                             style={{
                               left: p.x, top: p.y, width: p.w, height: p.h,
                               transform: `rotate(${(p.rot*180/Math.PI).toFixed(2)}deg)`,
                               transformOrigin: "center"
                             }}
                             onClick={e=>{
                               e.stopPropagation();
                               setSignatures(prev => prev.map(s => s.id===p.id ? {...s, showName:!s.showName} : {...s, showName:false}));
                             }}>
                          {p.name && (
                            <div className={`absolute -top-7 left-1/2 -translate-x-1/2 text-xs px-2 py-1 rounded bg-black text-white ${p.showName ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                              {p.name}
                            </div>
                          )}
                          <img src={p.url} alt="signature" className="w-full h-full" draggable={false}/>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-sm text-gray-600">
                  ✨ Signatures are packed inside the letters—no overlaps, no spill. Use zoom and “Find my signature” to jump to yours.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        [data-flash="1"] { animation: flash 1.5s ease-in-out; }
        @keyframes flash {
          0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.7); }
          50% { box-shadow: 0 0 0 14px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
        input[type="range"]{ -webkit-appearance:none; height:6px; background:#e5e7eb; border-radius:3px; }
        input[type="range"]::-webkit-slider-thumb{ -webkit-appearance:none; width:18px; height:18px; border-radius:50%; background:#4f46e5; border:2px solid #fff; box-shadow:0 0 0 1px #e5e7eb, 0 2px 4px rgba(0,0,0,.1); }
        input[type="range"]::-moz-range-thumb{ width:18px; height:18px; border-radius:50%; background:#4f46e5; border:2px solid #fff; box-shadow:0 0 0 1px #e5e7eb, 0 2px 4px rgba(0,0,0,.1); }
      `}</style>
    </div>
  );
}
