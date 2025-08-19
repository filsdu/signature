import React, { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// ---------- Supabase ----------
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- Helpers ----------
const BAD_WORDS = ["fuck","shit","bitch","cunt","dildo","penis","vagina","porn","rape","slut","whore"];
function containsBadWords(text) {
  if (!text) return false;
  const t = String(text).toLowerCase();
  return BAD_WORDS.some(word => t.includes(word));
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
function placeWithRetries({ wallW, wallH, itemW, itemH, rot, existing, tries = 180, margin = 1 }) {
  const { rw, rh } = rotatedBounds(itemW + margin, itemH + margin, rot);
  for (let i = 0; i < tries; i++) {
    const x = Math.floor(Math.random() * Math.max(1, wallW - rw));
    const y = Math.floor(Math.random() * Math.max(1, wallH - rh));
    const bb = { x, y, w: rw, h: rh };
    const collides = existing.some(e => {
      const eb = { x: e.x, y: e.y, w: rotatedBounds(e.w, e.h, e.rot).rw, h: rotatedBounds(e.w, e.h, e.rot).rh };
      return overlaps(bb, eb);
    });
    if (!collides) return { x, y };
  }
  return null;
}

// ---------- Page ----------
export default function ConfessionPage() {
  // Wall size
  const WALL_W = 2400;
  const WALL_H = 1600;

  const wallScrollRef = useRef(null);
  const wallInnerRef = useRef(null);

  const [confession, setConfession] = useState("");
  const [shape, setShape] = useState("rounded"); // 'square' | 'rounded' | 'circle'
  const [scale, setScale] = useState(1);         // 0.6 - 1.4
  const [rotation, setRotation] = useState(0);   // -45 .. 45 (text blocks)
  const [displayName, setDisplayName] = useState("");
  const [placementMode, setPlacementMode] = useState("auto");
  const [pendingManualSpot, setPendingManualSpot] = useState(null);
  const [agreed, setAgreed] = useState(false);

  const [placed, setPlaced] = useState([]);
  const [myId, setMyId] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMyId(crypto.getRandomValues(new Uint32Array(1))[0].toString(16));
  }, []);

  // Load + realtime
  useEffect(() => {
    let channel;
    (async () => {
      const { data, error } = await supabase.from("confessions").select("*").order("created_at", { ascending: true });
      if (error) {
        console.error(error);
        setMessage("If you see errors, run the confessions SQL (ask me for it).");
      } else {
        setPlaced(data.map(rowToItem));
      }
      channel = supabase
        .channel("public:confessions")
        .on("postgres_changes", { event: "*", schema: "public", table: "confessions" }, (payload) => {
          if (payload.eventType === "INSERT") {
            setPlaced(prev => prev.some(p => p.id === payload.new.id) ? prev : [...prev, rowToItem(payload.new)]);
          } else if (payload.eventType === "DELETE") {
            setPlaced(prev => prev.filter(p => p.id !== payload.old.id));
          } else if (payload.eventType === "UPDATE") {
            setPlaced(prev => prev.map(p => p.id === payload.new.id ? rowToItem(payload.new) : p));
          }
        })
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  function rowToItem(row) {
    return {
      id: row.id,
      x: row.x, y: row.y, w: row.w, h: row.h,
      rot: (row.rot_deg || 0) * Math.PI/180,
      text: row.text,
      shape: row.shape || 'rounded',
      owner: row.owner,
      name: row.name || '',
      showName: false
    };
  }

  const place = async () => {
    if (!agreed) { setMessage("Please confirm the community guidelines first."); return; }
    if (!confession.trim()) { setMessage("Write something first."); return; }
    if (containsBadWords(confession) || containsBadWords(displayName)) {
      setMessage("Please remove inappropriate words.");
      return;
    }
    if (confession.length > 200) {
      setMessage("Keep it under 200 characters.");
      return;
    }

    // Basic size from text length
    const baseW = Math.min(500, 160 + confession.length * 2.2);
    const baseH = 90 + Math.ceil(confession.length / 28) * 22;
    const s = Math.max(0.6, Math.min(1.4, scale));
    const w = Math.round(baseW * s);
    const h = Math.round(baseH * s);
    const rotDeg = Math.round(rotation);
    const rot = rotDeg * Math.PI/180;

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
      spot = placeWithRetries({ wallW: WALL_W, wallH: WALL_H, itemW: w, itemH: h, rot, existing: placed, tries: 200, margin: 1 });
    }
    if (!spot) { setMessage("No space here—try different rotation/size."); return; }

    const row = {
      owner: myId,
      text: confession.trim(),
      shape,
      x: Math.round(spot.x),
      y: Math.round(spot.y),
      w, h,
      rot_deg: rotDeg,
      name: (displayName || '').slice(0,20)
    };
    const { error } = await supabase.from("confessions").insert(row).single();
    if (error) { console.error(error); setMessage("Save failed (policies or table missing)."); return; }

    setConfession("");
    setDisplayName("");
    setPendingManualSpot(null);
    setAgreed(false);
    setMessage("Posted! Use 'Locate my confession'.");
  };

  const eraseMine = async () => {
    const mine = placed.find(p => p.owner === myId);
    if (!mine) { setMessage("Nothing to erase."); return; }
    const { error } = await supabase.from("confessions").delete().eq("id", mine.id);
    if (error) { console.error(error); setMessage("Failed to erase (policy?)."); return; }
    setMessage("Your confession was removed.");
  };

  const locateMine = () => {
    const target = placed.find(p => p.owner === myId);
    if (!target || !wallScrollRef.current) return;
    const container = wallScrollRef.current;
    const cx = target.x + target.w / 2;
    const cy = target.y + target.h / 2;
    const left = Math.max(0, Math.min(cx - container.clientWidth / 2, WALL_W - container.clientWidth));
    const top  = Math.max(0, Math.min(cy - container.clientHeight / 2, WALL_H - container.clientHeight));
    container.scrollTo({ left, top, behavior: 'smooth' });
    const el = wallInnerRef.current?.querySelector(`[data-cid="${target.id}"]`);
    if (el) {
      el.setAttribute('data-flash', '1');
      setTimeout(() => el.removeAttribute('data-flash'), 1500);
    }
  };

  const onWallClick = (e) => {
    if (placementMode !== 'manual') return;
    const rect = wallInnerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    setPendingManualSpot({ x, y });
    setMessage('Spot selected. Now click "Post to Wall".');
  };

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900">
      <div className="max-w-6xl mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Confessions Wall</h1>
          <p className="text-sm text-neutral-600 mt-2">Write a short confession and place it on the wall.</p>
        </header>

        <div className="grid md:grid-cols-5 gap-6 items-start">
          {/* Left controls */}
          <div className="md:col-span-2 space-y-4">
            <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <label className="block text-sm mb-1">
                Your confession (max 200 chars)
                <textarea
                  value={confession}
                  onChange={(e)=>setConfession(e.target.value.slice(0,200))}
                  placeholder="Type here..."
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm h-28"
                />
              </label>
              {containsBadWords(confession) && (
                <div className="text-xs text-red-600">Please remove inappropriate words.</div>
              )}

              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <label className="block">Shape
                  <select className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-2"
                          value={shape} onChange={(e)=>setShape(e.target.value)}>
                    <option value="rounded">Rounded</option>
                    <option value="square">Square</option>
                    <option value="circle">Circle</option>
                  </select>
                </label>
                <label className="block">Size
                  <input type="range" min="0.6" max="1.4" step="0.02" value={scale}
                         onChange={(e)=>setScale(parseFloat(e.target.value))} className="w-full mt-2"/>
                </label>
              </div>

              <label className="block text-sm mt-3">Rotation ({rotation}°)
                <input type="range" min="-45" max="45" step="1" value={rotation}
                       onChange={(e)=>setRotation(parseInt(e.target.value))} className="w-full"/>
              </label>

              <div className="mt-3">
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

              <div className="flex items-center gap-3 mt-3 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="pmode" value="auto" checked={placementMode==='auto'} onChange={()=>setPlacementMode('auto')} />
                  Auto place
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="pmode" value="manual" checked={placementMode==='manual'} onChange={()=>setPlacementMode('manual')} />
                  Click to place
                </label>
              </div>

              <div className="flex gap-2 mt-3">
                <button onClick={place} disabled={!agreed || !confession.trim()}
                        className={`px-4 py-2 rounded-xl ${agreed && confession.trim() ? 'bg-black text-white hover:opacity-90' : 'bg-neutral-300 text-neutral-600 cursor-not-allowed'}`}>
                  Post to Wall
                </button>
                <button onClick={eraseMine} className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200">Erase my confession</button>
                <button onClick={locateMine} className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200">Locate my confession</button>
              </div>

              <label className="mt-3 flex items-start gap-2 text-xs text-neutral-600">
                <input type="checkbox" checked={agreed} onChange={(e)=>setAgreed(e.target.checked)} />
                I agree to follow the community guidelines for respectful, appropriate content.
              </label>

              {message && <p className="text-sm text-neutral-600 mt-3">{message}</p>}
            </div>
          </div>

          {/* Right wall */}
          <div className="md:col-span-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Wall</h3>
              <div className="text-xs text-neutral-500">{placed.length} confessions</div>
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
                }}
              >
                <div className="absolute top-3 right-4 text-xs text-neutral-500">Shard 001 • {WALL_W}×{WALL_H}px</div>

                {placementMode==='manual' && pendingManualSpot && (
                  <div className="absolute pointer-events-none"
                       style={{ left: pendingManualSpot.x-8, top: pendingManualSpot.y-8, width: 16, height: 16,
                                borderRadius: 9999, border: '2px solid #3b82f6', boxShadow: '0 0 0 4px rgba(59,130,246,0.2)' }} />
                )}

                {placed.map((p) => (
                  <div key={p.id}
                       data-cid={p.id}
                       className="absolute select-none group"
                       style={{
                         left: p.x,
                         top: p.y,
                         width: p.w,
                         height: p.h,
                         transform: `rotate(${(p.rot*180/Math.PI).toFixed(2)}deg)`,
                         transformOrigin: 'top left'
                       }}
                       onClick={(e)=>{
                         e.stopPropagation();
                         setPlaced(prev => prev.map(s => s.id === p.id ? ({ ...s, showName: !s.showName }) : ({ ...s, showName: false })));
                       }}
                  >
                    {p.name && (
                      p.showName
                        ? <div className="absolute -top-5 left-0 text-[10px] px-1.5 py-[2px] rounded bg-black text-white" style={{pointerEvents:'none'}}>{p.name}</div>
                        : <div className="absolute -top-5 left-0 text-[10px] px-1.5 py-[2px] rounded bg-black text-white opacity-0 group-hover:opacity-100" style={{pointerEvents:'none'}}>{p.name}</div>
                    )}
                    <div
                      className="w-full h-full flex items-center justify-center text-center px-3 py-2 text-xs md:text-sm bg-white border border-neutral-300"
                      style={{
                        borderRadius:
                          p.shape === 'circle' ? Math.max(p.w, p.h) :
                          p.shape === 'rounded' ? 16 : 0,
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                      }}
                    >
                      {p.text}
                    </div>
                  </div>
                ))}

                {placed.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-neutral-500 text-sm">
                      The wall is empty. Post the first confession →
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
          Confessions demo. Next: editing + auth + moderation queue.
        </footer>
      </div>
    </div>
  );
}
