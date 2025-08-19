import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

/**
 * WORD CAMPAIGN BOARD
 * People draw their signature, and it auto-places inside the pixels of a big traced word
 * (e.g., "BLACK LIVES MATTER") without overlapping other signatures.
 *
 * Storage:
 * - Uses a separate table: public.word_signatures
 *   Run the SQL shown at the bottom if you haven’t yet.
 */

// ---------- Supabase client ----------
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- Constants ----------
const DEFAULT_TEXT = "BLACK LIVES MATTER";
const WALL_W = 3000;   // large canvas for nicer word shapes
const WALL_H = 1800;
const MIN_W = 80;      // min signature size (width)
const MIN_H = 40;      // min signature size (height)
const BAD_WORDS = ["fuck","shit","bitch","cunt","dildo","penis","vagina","porn","rape","slut","whore"];

function containsBadWords(text) {
  if (!text) return false;
  const t = String(text).toLowerCase();
  return BAD_WORDS.some(w => t.includes(w));
}

function useDevicePixelRatio() {
  const [dpr, setDpr] = useState(window.devicePixelRatio || 1);
  useEffect(() => {
    const handler = () => setDpr(window.devicePixelRatio || 1);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return dpr;
}

function rotatedBounds(w, h, rotRad) {
  const cos = Math.cos(rotRad);
  const sin = Math.sin(rotRad);
  const rw = Math.abs(w * cos) + Math.abs(h * sin);
  const rh = Math.abs(w * sin) + Math.abs(h * cos);
  return { rw, rh };
}
function overlaps(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

// Simple pressure-like signature pad (same as your existing)
function trimCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  let minX = width, minY = height, maxX = 0, maxY = 0, hasInk = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const a = data[idx + 3];
      if (a > 0) {
        hasInk = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!hasInk) return null;
  const trimW = Math.max(1, maxX - minX + 2);
  const trimH = Math.max(1, maxY - minY + 2);
  const out = document.createElement('canvas');
  out.width = trimW; out.height = trimH;
  const octx = out.getContext('2d');
  octx.putImageData(ctx.getImageData(minX, minY, trimW, trimH), 0, 0);
  return out.toDataURL('image/png');
}

function SignaturePad({ width = 500, height = 200, strokeWidth = 2.5, onExport, color = '#111827' }) {
  const canvasRef = useRef(null);
  const dpr = useDevicePixelRatio();
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [pen, setPen] = useState({ pressure: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
  }, [width, height, dpr, color]);

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (e.touches) {
      const t = e.touches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top, p: (t.force || 0.5) };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, p: 0.5 };
  };
  const start = (e) => {
    e.preventDefault();
    const p = pos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    setIsDrawing(true);
    setPen({ pressure: p.p });
  };
  const move = (e) => {
    if (!isDrawing) return;
    const p = pos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, strokeWidth * (0.75 + pen.pressure));
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasInk(true);
  };
  const end = () => setIsDrawing(false);
  const clear = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    setHasInk(false);
  };
  const exportPng = () => {
    const srcCanvas = canvasRef.current;
    const trimmed = trimCanvas(srcCanvas);
    if (!trimmed) return;
    onExport(trimmed);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-zinc-600">Sign in the box below (mouse/touch)</div>
        <div className="flex gap-2 text-sm">
          <button onClick={clear} className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200">Clear</button>
          <button onClick={exportPng} className="px-3 py-1.5 rounded-xl bg-black text-white hover:opacity-90">Use this</button>
        </div>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-inner">
        <canvas
          ref={canvasRef}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
          className="w-full h-full touch-none rounded-2xl"
          style={{ display: 'block' }}
        />
      </div>
    </div>
  );
}

// Build a text mask = pixels where signatures are allowed
function useTextMask(text, opts) {
  const { fontFamily = "800 220px Inter, system-ui, Arial", padding = 40 } = opts || {};
  const canvasRef = useRef(document.createElement("canvas"));
  const [maskReady, setMaskReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = WALL_W;
    canvas.height = WALL_H;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,WALL_W,WALL_H);

    // Draw centered text
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = fontFamily; // includes weight + size + family
    // Auto-shrink font until it fits width
    let size = parseInt(fontFamily.match(/(\d+)px/)?.[1] || "220", 10);
    const family = fontFamily.replace(/^\d+\s*/, "");
    while (size > 40) {
      ctx.font = `800 ${size}px ${family}`;
      const m = ctx.measureText(text);
      const textW = m.width + padding * 2;
      const textH = size + padding * 2;
      if (textW <= WALL_W && textH <= WALL_H) break;
      size -= 10;
    }
    ctx.font = `800 ${size}px ${family}`;
    ctx.fillText(text, WALL_W/2, WALL_H/2);

    setMaskReady(true);
  }, [text, fontFamily, padding]);

  return { canvas: canvasRef.current, maskReady };
}

// Find a legal spot: inside mask AND not overlapping existing
function findSpotInMask({ imgW, imgH, rotRad, existing, maskCanvas, tries = 500 }) {
  const { rw, rh } = rotatedBounds(imgW, imgH, rotRad);
  const w = Math.ceil(rw);
  const h = Math.ceil(rh);
  const ctx = maskCanvas.getContext("2d");
  const mask = ctx.getImageData(0,0,maskCanvas.width, maskCanvas.height).data;

  function rectIsInsideMask(x, y) {
    // Sample a grid inside the rect to ensure it's inside the filled text
    const samples = 24;
    for (let i = 0; i < samples; i++) {
      const px = Math.floor(x + (i % 6) * (w / 5));
      const py = Math.floor(y + Math.floor(i / 6) * (h / 3.5));
      const idx = (py * maskCanvas.width + px) * 4 + 3; // alpha channel
      if (mask[idx] < 10) return false; // not inside text
    }
    return true;
  }

  for (let i = 0; i < tries; i++) {
    const x = Math.floor(Math.random() * Math.max(1, WALL_W - w));
    const y = Math.floor(Math.random() * Math.max(1, WALL_H - h));

    if (!rectIsInsideMask(x, y)) continue;

    const bb = { x, y, w, h };
    const collides = existing.some(e => overlaps(bb, { x: e.x, y: e.y, w: rotatedBounds(e.w, e.h, e.rot).rw, h: rotatedBounds(e.w, e.h, e.rot).rh }));
    if (!collides) return { x, y };
  }
  return null;
}

export default function WordCampaignBoard() {
  const [campaignText, setCampaignText] = useState(DEFAULT_TEXT);
  const [penColor, setPenColor] = useState("#111827");
  const [scale, setScale] = useState(0.9);
  const [rotation, setRotation] = useState(-8); // we’ll still allow a bit of rotation
  const [displayName, setDisplayName] = useState("");
  const [sigDataUrl, setSigDataUrl] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [message, setMessage] = useState("");
  const [zoom, setZoom] = useState(1);
  const wallScrollRef = useRef(null);
  const wallInnerRef = useRef(null);

  const [myId, setMyId] = useState(null);
  const [placed, setPlaced] = useState([]);

  useEffect(() => {
    setMyId(crypto.getRandomValues(new Uint32Array(1))[0].toString(16));
  }, []);

  // Build / rebuild text mask when campaign text changes
  const { canvas: maskCanvas, maskReady } = useTextMask(campaignText, { fontFamily: "800 220px Inter, system-ui, Arial", padding: 40 });

  // Load + realtime (separate table: word_signatures)
  useEffect(() => {
    let channel;
    (async () => {
      const { data, error } = await supabase
        .from("word_signatures")
        .select("*")
        .eq("campaign", campaignText)
        .order("created_at", { ascending: true });

      if (error) {
        console.error(error);
        setMessage("If you haven’t created the table yet, run the SQL shown below.");
      } else {
        setPlaced(data.map(rowToSig));
      }

      channel = supabase
        .channel("public:word_signatures")
        .on("postgres_changes", { event: "*", schema: "public", table: "word_signatures", filter: `campaign=eq.${campaignText}` }, (payload) => {
          if (payload.eventType === "INSERT") {
            setPlaced(prev => prev.some(p => p.id === payload.new.id) ? prev : [...prev, rowToSig(payload.new)]);
          } else if (payload.eventType === "DELETE") {
            setPlaced(prev => prev.filter(p => p.id !== payload.old.id));
          } else if (payload.eventType === "UPDATE") {
            setPlaced(prev => prev.map(p => p.id === payload.new.id ? rowToSig(payload.new) : p));
          }
        })
        .subscribe();
    })();

    return () => { if (channel) supabase.removeChannel(channel); };
  }, [campaignText]);

  function rowToSig(row) {
    return {
      id: row.id, url: row.url,
      x: row.x, y: row.y, w: row.w, h: row.h,
      rot: (row.rot_deg || 0) * Math.PI / 180,
      owner: row.owner, name: row.name || '',
      showName: false
    };
  }

  const palette = ['#111827', '#b91c1c', '#1d4ed8', '#0f766e', '#ca8a04', '#86198f'];

  async function place() {
    if (!sigDataUrl) return;
    if (!agreed) { setMessage('Please confirm the community guidelines first.'); return; }
    if (containsBadWords(displayName)) { setMessage('Please choose a different display name.'); return; }
    if (!maskReady) { setMessage('Preparing campaign word…'); return; }

    const img = new Image();
    img.onload = async () => {
      const baseMax = 360;
      const s = Math.min(scale, 1.2);
      const ratio = Math.min(1, baseMax / img.width) * s;
      const w = Math.max(MIN_W, Math.round(img.width * ratio));
      const h = Math.max(MIN_H, Math.round(img.height * ratio));
      const rotDeg = Math.round(rotation);
      const rot = (rotDeg * Math.PI) / 180;

      const spot = findSpotInMask({ imgW: w, imgH: h, rotRad: rot, existing: placed, maskCanvas });
      if (!spot) { setMessage("The word is getting crowded here. Try a smaller size or different rotation."); return; }

      const row = {
        campaign: campaignText,
        owner: myId,
        url: sigDataUrl,
        x: Math.round(spot.x),
        y: Math.round(spot.y),
        w, h,
        rot_deg: rotDeg,
        name: (displayName || '').slice(0,20)
      };
      const { error } = await supabase.from("word_signatures").insert(row).single();
      if (error) { console.error(error); setMessage("Failed to save. Did you run the SQL to create the table?"); return; }

      setSigDataUrl(null);
      setAgreed(false);
      setMessage("Placed! Use zoom and scroll to explore.");
      setTimeout(() => locateMine(row), 60);
    };
    img.src = sigDataUrl;
  }

  async function eraseMine() {
    const mine = placed.find(p => p.owner === myId);
    if (!mine) { setMessage("Nothing to erase."); return; }
    const { error } = await supabase.from("word_signatures").delete().eq("id", mine.id);
    if (error) { console.error(error); setMessage("Failed to erase."); return; }
    setMessage("Your signature was removed.");
  }

  function locateMine(mineRow) {
    const target = mineRow
      ? { x: mineRow.x, y: mineRow.y, w: mineRow.w, h: mineRow.h, id: mineRow.id }
      : placed.find(p => p.owner === myId);
    if (!target || !wallScrollRef.current) return;
    const container = wallScrollRef.current;
    const cx = target.x + target.w / 2;
    const cy = target.y + target.h / 2;
    const left = Math.max(0, Math.min(cx - container.clientWidth / (2 * zoom), WALL_W - container.clientWidth / zoom));
    const top  = Math.max(0, Math.min(cy - container.clientHeight / (2 * zoom), WALL_H - container.clientHeight / zoom));
    container.scrollTo({ left, top, behavior: "smooth" });

    const el = wallInnerRef.current?.querySelector(`[data-sig-id="${target.id}"]`);
    if (el) {
      el.setAttribute('data-flash', '1');
      setTimeout(() => el.removeAttribute('data-flash'), 1500);
    }
  }

  const wallInnerRef = useRef(null);

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900">
      <div className="max-w-6xl mx-auto p-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Word Campaign</h1>
            <p className="text-sm text-neutral-600 mt-2">Signatures auto-fill inside the campaign word. No overlaps.</p>
          </div>
          <a href="/" className="text-sm underline">← Back</a>
        </header>

        <div className="grid md:grid-cols-5 gap-6 items-start">
          {/* Left */}
          <div className="md:col-span-2 space-y-4">
            <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <label className="block text-sm mb-2">Campaign text
                <input
                  value={campaignText}
                  onChange={(e)=>setCampaignText(e.target.value.slice(0,40))}
                  placeholder="e.g., BLACK LIVES MATTER"
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>
              <div className="text-xs text-neutral-500">Tip: keep it short (≤ 3 words) for best fit.</div>
            </div>

            <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <SignaturePad onExport={setSigDataUrl} color={penColor} />
              <div className="mt-3">
                <div className="text-sm mb-1">Pen color</div>
                <div className="flex gap-2">
                  {['#111827', '#b91c1c', '#1d4ed8', '#0f766e', '#ca8a04', '#86198f'].map(c => (
                    <button key={c} onClick={()=>setPenColor(c)} className="w-7 h-7 rounded-full border"
                      style={{ background: c, borderColor: c === '#111827' ? '#e5e7eb' : c }}
                      aria-label={`Set color ${c}`} />
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <h3 className="font-medium mb-3">Placement</h3>
              <label className="block text-sm mb-2">Size
                <input type="range" min="0.6" max="1.2" step="0.02" value={scale} onChange={(e)=>setScale(parseFloat(e.target.value))} className="w-full"/>
              </label>
              <label className="block text-sm mb-2">Rotation ({rotation}°)
                <input type="range" min="-45" max="45" step="1" value={rotation} onChange={(e)=>setRotation(parseInt(e.target.value))} className="w-full"/>
              </label>

              <div className="mb-3">
                <label className="block text-sm mb-1">Optional name (shown on hover)
                  <input
                    value={displayName}
                    onChange={(e)=>setDisplayName(e.target.value.slice(0,20))}
                    placeholder="e.g., Fils"
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
                {containsBadWords(displayName) && (
                  <div className="text-xs text-red-600">Please choose a different name.</div>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={place} disabled={!sigDataUrl || !agreed}
                        className={`px-4 py-2 rounded-xl ${sigDataUrl && agreed ? 'bg-black text-white hover:opacity-90' : 'bg-neutral-300 text-neutral-600 cursor-not-allowed'}`}>
                  Place in Word
                </button>
                <button onClick={eraseMine} className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200">Erase my signature</button>
                <button onClick={()=>locateMine()} className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200">Locate my signature</button>
              </div>
              <label className="mt-3 flex items-start gap-2 text-xs text-neutral-600">
                <input type="checkbox" checked={agreed} onChange={(e)=>setAgreed(e.target.checked)} />
                I agree to follow the community guidelines for respectful, appropriate content.
              </label>

              {message && <p className="text-sm text-neutral-600 mt-3">{message}</p>}
            </div>
          </div>

          {/* Right: word wall */}
          <div className="md:col-span-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Word Wall</h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs">
                  Zoom
                  <button onClick={()=>setZoom(z=>Math.max(0.5, +(z-0.1).toFixed(2)))} className="px-2 py-1 rounded border">-</button>
                  <span className="w-10 text-center">{Math.round(zoom*100)}%</span>
                  <button onClick={()=>setZoom(z=>Math.min(2, +(z+0.1).toFixed(2)))} className="px-2 py-1 rounded border">+</button>
                </div>
                <span className="text-xs text-neutral-500">{placed.length} signatures</span>
              </div>
            </div>

            <div ref={wallScrollRef} className="h-[70vh] rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-auto">
              <div
                ref={wallInnerRef}
                className="relative mx-auto my-6"
                style={{
                  width: WALL_W + 'px',
                  height: WALL_H + 'px',
                  backgroundSize: '24px 24px',
                  backgroundImage: 'radial-gradient(#d4d4d8 1px, transparent 1px)',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left'
                }}
              >
                {/* Show the text mask as a faint guide */}
                <MaskPreview maskCanvas={maskCanvas} />

                {/* Placed signatures */}
                {placed.map((p) => (
                  <div key={p.id} data-sig-id={p.id} className="absolute select-none group"
                       style={{ left: p.x, top: p.y, width: p.w, height: p.h,
                                transform: `rotate(${(p.rot*180/Math.PI).toFixed(2)}deg)`,
                                transformOrigin: 'top left' }}
                       onClick={(e) => {
                         e.stopPropagation();
                         setPlaced(prev => prev.map(s => s.id === p.id ? ({ ...s, showName: !s.showName }) : ({ ...s, showName: false })));
                       }}>
                    {p.name && (
                      p.showName
                        ? <div className="absolute -top-5 left-0 text-[10px] px-1.5 py-[2px] rounded bg-black text-white" style={{pointerEvents:'none'}}>{p.name}</div>
                        : <div className="absolute -top-5 left-0 text-[10px] px-1.5 py-[2px] rounded bg-black text-white opacity-0 group-hover:opacity-100" style={{pointerEvents:'none'}}>{p.name}</div>
                    )}
                    <img src={p.url} alt="signature" className="w-full h-full" draggable={false} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <style>{`
          [data-flash="1"] { box-shadow: 0 0 0 4px rgba(34,197,94,0.45), 0 0 0 10px rgba(34,197,94,0.18); transition: box-shadow 0.3s; }
        `}</style>

        <footer className="mt-8 text-xs text-neutral-500">
          If the table isn’t created yet, run the SQL below in Supabase → SQL Editor once.
        </footer>

        <details className="mt-3 text-xs">
          <summary className="cursor-pointer">Show SQL for <code>word_signatures</code> table</summary>
          <pre className="p-3 bg-neutral-100 rounded-lg overflow-auto">
{`create table if not exists public.word_signatures (
  id uuid primary key default gen_random_uuid(),
  campaign text not null,
  owner text not null,
  url text not null,
  x int not null,
  y int not null,
  w int not null,
  h int not null,
  rot_deg int not null default 0,
  name text,
  created_at timestamptz default now()
);

alter publication supabase_realtime add table public.word_signatures;
alter table public.word_signatures enable row level security;

drop policy if exists ws_select_all on public.word_signatures;
drop policy if exists ws_insert_all on public.word_signatures;
drop policy if exists ws_delete_all on public.word_signatures;

create policy ws_select_all on public.word_signatures
  for select using (true);

create policy ws_insert_all on public.word_signatures
  for insert with check (true);

create policy ws_delete_all on public.word_signatures
  for delete using (true);`}
          </pre>
        </details>
      </div>
    </div>
  );
}

function MaskPreview({ maskCanvas }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !maskCanvas) return;
    const ctx = ref.current.getContext("2d");
    ref.current.width = WALL_W;
    ref.current.height = WALL_H;
    ctx.clearRect(0,0,WALL_W,WALL_H);
    ctx.globalAlpha = 0.08;
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.globalAlpha = 1;
  }, [maskCanvas]);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" style={{ width: WALL_W, height: WALL_H }} />;
}
