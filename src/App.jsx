import React, { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// ---------- Supabase client ----------
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env");
}
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- Helpers ----------
const BAD_WORDS = ["fuck","shit","bitch","cunt","dildo","penis","vagina","porn","rape","slut","whore"];
function containsBadWords(text) {
  if (!text) return false;
  const t = String(text).toLowerCase();
  return BAD_WORDS.some(word => t.includes(word));
}
function useDevicePixelRatio() {
  const [dpr, setDpr] = useState(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
  useEffect(() => {
    const handler = () => setDpr(window.devicePixelRatio || 1);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return dpr;
}
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
function placeWithRetries({ wallW, wallH, itemW, itemH, rot, existing, tries = 160, margin = 1 }) {
  const { rw, rh } = rotatedBounds(itemW + margin, itemH + margin, rot);
  for (let i = 0; i < tries; i++) {
    const x = Math.floor(Math.random() * Math.max(1, wallW - rw));
    const y = Math.floor(Math.random() * Math.max(1, wallH - rh));
    const bb = { x, y, w: rw, h: rh };
    const collides = existing.some(e => {
      const { rw: erw, rh: erh } = rotatedBounds(e.w + margin, e.h + margin, e.rot);
      const ebb = { x: e.x, y: e.y, w: erw, h: erh };
      return overlaps(bb, ebb);
    });
    if (!collides) return { x, y };
  }
  return null;
}

// ---------- SignaturePad ----------
function SignaturePad({ width = 480, height = 180, strokeWidth = 2.5, onExport, color = '#111827' }) {
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

// ---------- Main App (Supabase realtime) ----------
export default function App() {
  const WALL_W = 2400;
  const WALL_H = 1600;

  const wallScrollRef = useRef(null);
  const wallInnerRef = useRef(null);

  const [sigDataUrl, setSigDataUrl] = useState(null);
  const [scale, setScale] = useState(0.8);
  const [rotation, setRotation] = useState(-12);
  const [penColor, setPenColor] = useState('#111827');
  const [displayName, setDisplayName] = useState("");
  const [placed, setPlaced] = useState([]);
  const [myId, setMyId] = useState(null);
  const [message, setMessage] = useState("");
  const [placementMode, setPlacementMode] = useState('auto');
  const [pendingManualSpot, setPendingManualSpot] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    setMyId(crypto.getRandomValues(new Uint32Array(1))[0].toString(16));
  }, []);

  // Load + Realtime
  useEffect(() => {
    let channel;
    (async () => {
      const { data, error } = await supabase.from("signatures").select("*").order("created_at", { ascending: true });
      if (error) console.error(error);
      else setPlaced(data.map(rowToSig));

      channel = supabase
        .channel("public:signatures")
        .on("postgres_changes", { event: "*", schema: "public", table: "signatures" }, (payload) => {
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
  }, []);

  function rowToSig(row) {
    return {
      id: row.id, url: row.url,
      x: row.x, y: row.y, w: row.w, h: row.h,
      rot: (row.rot_deg || 0) * Math.PI / 180,
      owner: row.owner, name: row.name || '',
      showName: false
    };
  }

  const place = async () => {
    if (!sigDataUrl) return;
    if (!agreed) { setMessage('Please confirm the community guidelines first.'); return; }
    if (containsBadWords(displayName)) { setMessage('Please choose a different display name.'); return; }

    const img = new Image();
    img.onload = async () => {
      const baseMax = 360;
      const s = Math.min(scale, 1.2);
      const ratio = Math.min(1, baseMax / img.width) * s;
      const w = Math.max(80, Math.round(img.width * ratio));
      const h = Math.max(40, Math.round(img.height * ratio));
      const rotDeg = Math.round(rotation);
      const rot = (rotDeg * Math.PI) / 180;

      let spot = null;
      if (placementMode === 'manual' && pendingManualSpot) {
        const trySpot = (x, y) => {
          const { rw, rh } = rotatedBounds(w, h, rot);
          const bb = { x: Math.max(0, Math.min(x, WALL_W - rw)), y: Math.max(0, Math.min(y, WALL_H - rh)), w: rw, h: rh };
          const collides = placed.some(e => overlaps(
            { x: bb.x, y: bb.y, w: bb.w, h: bb.h },
            { x: e.x, y: e.y, w: rotatedBounds(e.w, e.h, e.rot).rw, h: rotatedBounds(e.w, e.h, e.rot).rh }
          ));
          return collides ? null : { x: bb.x, y: bb.y };
        };
        spot = trySpot(pendingManualSpot.x, pendingManualSpot.y);
        if (!spot) {
          for (let r = 8; r < 280 && !spot; r += 16) {
            const angle = Math.random() * Math.PI * 2;
            spot = trySpot(pendingManualSpot.x + Math.cos(angle) * r, pendingManualSpot.y + Math.sin(angle) * r);
          }
        }
      }
      if (!spot) {
        spot = placeWithRetries({ wallW: WALL_W, wallH: WALL_H, itemW: w, itemH: h, rot, existing: placed, tries: 160, margin: 1 });
      }
      if (!spot) { setMessage("Wall is busy here. Try a different rotation/size or clear some space."); return; }

      const row = {
        owner: myId,
        url: sigDataUrl,
        x: Math.round(spot.x),
        y: Math.round(spot.y),
        w, h,
        rot_deg: rotDeg,
        name: (displayName || '').slice(0,20)
      };
      const { error } = await supabase.from("signatures").insert(row).single();
      if (error) { console.error(error); setMessage("Failed to save. Check console/policies."); return; }

      setSigDataUrl(null);
      setPendingManualSpot(null);
      setAgreed(false);
      setMessage("Placed! Use 'Locate my signature'.");
      setTimeout(() => locateMine(row), 50);
    };
    img.src = sigDataUrl;
  };

  const eraseMine = async () => {
    const mine = placed.find(p => p.owner === myId);
    if (!mine) { setMessage("Nothing to erase."); return; }
    const { error } = await supabase.from("signatures").delete().eq("id", mine.id);
    if (error) { console.error(error); setMessage("Failed to erase (policy?)."); return; }
    setMessage("Your signature was removed.");
  };

  const locateMine = (mineRow) => {
    const target = mineRow
      ? { x: mineRow.x, y: mineRow.y, w: mineRow.w, h: mineRow.h, id: mineRow.id }
      : placed.find(p => p.owner === myId);
    if (!target || !wallScrollRef.current) return;
    const container = wallScrollRef.current;
    const cx = target.x + target.w / 2;
    const cy = target.y + target.h / 2;
    const left = Math.max(0, Math.min(cx - container.clientWidth / (2 * zoom), WALL_W - container.clientWidth / zoom));
    const top  = Math.max(0, Math.min(cy - container.clientHeight / (2 * zoom), WALL_H - container.clientHeight / zoom));
    container.scrollTo({ left, top, behavior: 'smooth' });

    const el = wallInnerRef.current?.querySelector(`[data-sig-id="${target.id}"]`);
    if (el) {
      el.setAttribute('data-flash', '1');
      setTimeout(() => el.removeAttribute('data-flash'), 1500);
    }
  };

  const onWallClick = (e) => {
    if (placementMode !== 'manual') return;
    const rect = wallInnerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    setPendingManualSpot({ x, y });
    setMessage('Spot selected. Now click "Place on Wall".');
  };

  const palette = ['#111827', '#b91c1c', '#1d4ed8', '#0f766e', '#ca8a04', '#86198f'];

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900">
      <div className="max-w-6xl mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Signature Shard</h1>
          <p className="text-sm text-neutral-600 mt-2">Realtime wall via Supabase. Draw, place, and see others instantly.</p>
        </header>

        <div className="grid md:grid-cols-5 gap-6 items-start">
          {/* Left: controls */}
          <div className="md:col-span-2 space-y-4">
            <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <SignaturePad onExport={setSigDataUrl} strokeWidth={2.5} color={penColor} />
              <div className="mt-3">
                <div className="text-sm mb-1">Pen color</div>
                <div className="flex gap-2">
                  {palette.map(c => (
                    <button key={c} onClick={()=>setPenColor(c)} className="w-7 h-7 rounded-full border"
                      style={{ background: c, borderColor: c === '#111827' ? '#e5e7eb' : c }}
                      aria-label={`Set color ${c}`} />
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Placement</h3>
                <div className="text-xs text-neutral-500">Session ID: {myId?.slice(0, 6)}</div>
              </div>
              <label className="block text-sm mb-2">Size
                <input type="range" min="0.6" max="1.2" step="0.02" value={scale} onChange={(e)=>setScale(parseFloat(e.target.value))} className="w-full"/>
              </label>
              <label className="block text-sm mb-2">Rotation ({rotation}°)
                <input type="range" min="-90" max="90" step="1" value={rotation} onChange={(e)=>setRotation(parseInt(e.target.value))} className="w-full"/>
              </label>

              <div className="flex items-center gap-3 mb-3 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="pmode" value="auto" checked={placementMode==='auto'} onChange={()=>setPlacementMode('auto')} />
                  Auto place
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="pmode" value="manual" checked={placementMode==='manual'} onChange={()=>setPlacementMode('manual')} />
                  Click to place
                </label>
              </div>

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
                  Place on Wall
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

          {/* Right: wall */}
          <div className="md:col-span-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Wall</h3>
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
                onClick={onWallClick}
                style={{
                  width: WALL_W + 'px',
                  height: WALL_H + 'px',
                  backgroundSize: '24px 24px',
                  backgroundImage: 'radial-gradient(#d4d4d8 1px, transparent 1px)',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left'
                }}
              >
                <div className="absolute top-3 right-4 text-xs text-neutral-500">Shard 001 • {WALL_W}×{WALL_H}px</div>

                {placementMode==='manual' && pendingManualSpot && (
                  <div className="absolute pointer-events-none"
                       style={{ left: pendingManualSpot.x-8, top: pendingManualSpot.y-8, width: 16, height: 16,
                                borderRadius: 9999, border: '2px solid #3b82f6', boxShadow: '0 0 0 4px rgba(59,130,246,0.2)' }} />
                )}

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

                {placed.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-neutral-500 text-sm">
                      The wall is empty. Add the first signature →
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <style>{`
          [data-flash="1"] { box-shadow: 0 0 0 4px rgba(34,197,94,0.45), 0 0 0 10px rgba(34,197,94,0.18); transition: box-shadow 0.3s; }
        `}</style>

        <footer className="mt-8 text-xs text-neutral-500">
          Demo build. Next: Auth + stricter RLS + edit/updates.
        </footer>
      </div>
    </div>
  );
}
