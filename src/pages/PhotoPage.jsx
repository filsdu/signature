import React, { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Supabase (optional for now)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helpers
function overlaps(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}
// grid-based placer (no rotation), items can "kiss" with margin 0 or 1
function autoPlaceGrid({ wallW, wallH, itemW, itemH, existing, margin = 0 }) {
  const stepX = itemW + margin;
  const stepY = itemH + margin;
  // Try random start row/col to avoid clustering in the corner
  const startCol = Math.floor(Math.random() * Math.max(1, Math.floor(wallW / stepX)));
  const startRow = Math.floor(Math.random() * Math.max(1, Math.floor(wallH / stepY)));

  const maxCols = Math.max(1, Math.floor(wallW / stepX));
  const maxRows = Math.max(1, Math.floor(wallH / stepY));

  for (let r = 0; r < maxRows; r++) {
    for (let c = 0; c < maxCols; c++) {
      const col = (startCol + c) % maxCols;
      const row = (startRow + r) % maxRows;
      const x = Math.round(col * stepX);
      const y = Math.round(row * stepY);
      const bb = { x, y, w: itemW, h: itemH };
      const collide = existing.some(e => overlaps(bb, { x: e.x, y: e.y, w: e.w, h: e.h }));
      if (!collide) return { x, y };
    }
  }
  return null;
}

export default function PhotoPage() {
  // Wall size (bigger by default)
  const WALL_W = 3200;
  const WALL_H = 2200;

  const wallScrollRef = useRef(null);
  const wallInnerRef = useRef(null);

  const [fileDataUrl, setFileDataUrl] = useState(null);
  const [origSize, setOrigSize] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);
  const [name, setName] = useState("");
  const [placementMode, setPlacementMode] = useState("auto");
  const [pendingManualSpot, setPendingManualSpot] = useState(null);
  const [agreed, setAgreed] = useState(false);

  const [placed, setPlaced] = useState([]);
  const [myId, setMyId] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMyId(crypto.getRandomValues(new Uint32Array(1))[0].toString(16));
  }, []);

  // Try to load from Supabase if a `photos` table exists; otherwise just work locally.
  useEffect(() => {
    let channel;
    (async () => {
      try {
        const { data, error } = await supabase.from("photos").select("*").order("created_at", { ascending: true });
        if (error) {
          console.warn("Photos table missing (local-only mode).", error.message);
          setMessage("Photos table not found yet — running in local-only mode.");
          return;
        }
        setPlaced(data.map(rowToItem));
        channel = supabase
          .channel("public:photos")
          .on("postgres_changes", { event: "*", schema: "public", table: "photos" }, (payload) => {
            if (payload.eventType === "INSERT") {
              setPlaced(prev => prev.some(p => p.id === payload.new.id) ? prev : [...prev, rowToItem(payload.new)]);
            } else if (payload.eventType === "DELETE") {
              setPlaced(prev => prev.filter(p => p.id !== payload.old.id));
            } else if (payload.eventType === "UPDATE") {
              setPlaced(prev => prev.map(p => p.id === payload.new.id ? rowToItem(payload.new) : p));
            }
          })
          .subscribe();
      } catch (e) {
        console.warn("Supabase not configured. Local-only mode.", e);
        setMessage("Supabase not configured for photos — local-only mode.");
      }
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  function rowToItem(row) {
    return {
      id: row.id,
      x: row.x, y: row.y, w: row.w, h: row.h,
      url: row.url,
      owner: row.owner,
      name: row.name || '',
      showName: false
    };
  }

  const onSelectFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/image\/(png|jpe?g|webp)/i.test(f.type)) {
      setMessage("Please choose a PNG/JPG/WebP image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result;
      setFileDataUrl(url);
      const img = new Image();
      img.onload = () => {
        setOrigSize({ w: img.width, h: img.height });
      };
      img.src = url;
    };
    reader.readAsDataURL(f);
  };

  const place = async () => {
    if (!fileDataUrl) { setMessage("Upload an image first."); return; }
    if (!agreed) { setMessage("Please confirm the community guidelines first."); return; }

    // Size (no rotation). Enforce min 80x80, cap max to fit the wall nicely.
    const baseMax = 480;
    const ratio = (origSize.w > 0) ? Math.min(1, baseMax / origSize.w) : 1;
    const s = Math.max(0.5, Math.min(1.6, scale)) * ratio;
    const w = Math.max(80, Math.round((origSize.w || 300) * s));
    const h = Math.max(80, Math.round((origSize.h || 300) * s));

    let spot = null;
    if (placementMode === "manual" && pendingManualSpot) {
      const x = Math.max(0, Math.min(pendingManualSpot.x, WALL_W - w));
      const y = Math.max(0, Math.min(pendingManualSpot.y, WALL_H - h));
      const bb = { x, y, w, h };
      const collide = placed.some(e => overlaps(bb, { x: e.x, y: e.y, w: e.w, h: e.h }));
      spot = collide ? null : { x, y };
    }
    if (!spot) {
      spot = autoPlaceGrid({ wallW: WALL_W, wallH: WALL_H, itemW: w, itemH: h, existing: placed, margin: 0 });
    }
    if (!spot) { setMessage("No room found. Try a smaller size."); return; }

    // Try to persist to Supabase if table exists; otherwise keep local
    const newItem = {
      id: crypto.randomUUID(),
      owner: myId,
      x: spot.x,
      y: spot.y,
      w, h,
      url: fileDataUrl,
      name: (name || "").slice(0, 20)
    };

    try {
      const { error } = await supabase.from("photos").insert({
        id: newItem.id,
        owner: newItem.owner,
        x: newItem.x,
        y: newItem.y,
        w: newItem.w,
        h: newItem.h,
        url: newItem.url,
        name: newItem.name
      }).single();
      if (error) {
        console.warn("Supabase insert failed (likely missing table). Using local-only.", error.message);
        setPlaced(prev => [...prev, newItem]); // local fallback
        setMessage("Placed locally (no photos table yet).");
      } else {
        setMessage("Placed!");
      }
    } catch {
      setPlaced(prev => [...prev, newItem]); // local fallback
      setMessage("Placed locally (no photos table yet).");
    }

    setPendingManualSpot(null);
    setAgreed(false);
  };

  const eraseMine = async () => {
    const mine = placed.find(p => p.owner === myId);
    if (!mine) { setMessage("Nothing to erase."); return; }
    try {
      const { error } = await supabase.from("photos").delete().eq("id", mine.id);
      if (error) {
        console.warn("Supabase delete failed, removing locally.", error.message);
      }
    } catch {}
    setPlaced(prev => prev.filter(p => p.id !== mine.id));
    setMessage("Your photo was removed.");
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

    const el = wallInnerRef.current?.querySelector(`[data-photo-id="${target.id}"]`);
    if (el) {
      el.setAttribute('data-flash', '1');
      setTimeout(() => el.removeAttribute('data-flash'), 1500);
    }
  };

  const onWallClick = (e) => {
    if (placementMode !== "manual") return;
    const rect = wallInnerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    setPendingManualSpot({ x, y });
    setMessage('Spot selected. Now click "Place Photo".');
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Photos Wall</h1>
        <p className="text-sm text-neutral-600 mt-2">
          Upload images (cats, dogs, campaigns). No rotation. Items “kiss” in a tidy grid without overlap.
        </p>
      </header>

      <div className="grid md:grid-cols-5 gap-6 items-start">
        {/* Left controls */}
        <div className="md:col-span-2 space-y-4">
          <div className="p-4 rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <label className="block text-sm mb-1">
              Upload an image
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={onSelectFile}
                className="mt-1 block w-full text-sm"
              />
            </label>

            {fileDataUrl && (
              <div className="mt-3">
                <div className="text-sm mb-1">Preview</div>
                <div className="rounded-2xl border border-neutral-200 overflow-hidden bg-white">
                  <img src={fileDataUrl} alt="preview" className="w-full max-h-60 object-contain" />
                </div>
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <label className="block">Size
                <input type="range" min="0.5" max="1.6" step="0.02" value={scale}
                       onChange={(e)=>setScale(parseFloat(e.target.value))} className="w-full mt-2"/>
              </label>
              <label className="block">Optional name
                <input
                  value={name}
                  onChange={(e)=>setName(e.target.value.slice(0,20))}
                  placeholder="e.g., Fils"
                  className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>
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
              <button onClick={place} disabled={!agreed || !fileDataUrl}
                      className={`px-4 py-2 rounded-xl ${agreed && fileDataUrl ? 'bg-black text-white hover:opacity-90' : 'bg-neutral-300 text-neutral-600 cursor-not-allowed'}`}>
                Place Photo
              </button>
              <button onClick={eraseMine} className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200">Erase my photo</button>
              <button onClick={locateMine} className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200">Locate my photo</button>
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
            <div className="text-xs text-neutral-500">{placed.length} photos</div>
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
              <div className="absolute top-3 right-4 text-xs text-neutral-500">Photo Board • {WALL_W}×{WALL_H}px</div>

              {placementMode==='manual' && pendingManualSpot && (
                <div className="absolute pointer-events-none"
                     style={{ left: pendingManualSpot.x-8, top: pendingManualSpot.y-8, width: 16, height: 16,
                              borderRadius: 9999, border: '2px solid #3b82f6', boxShadow: '0 0 0 4px rgba(59,130,246,0.2)' }} />
              )}

              {placed.map((p) => (
                <div
                  key={p.id}
                  data-photo-id={p.id}
                  className="absolute select-none group"
                  style={{ left: p.x, top: p.y, width: p.w, height: p.h }}
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
                  <img src={p.url} alt="photo" className="w-full h-full object-cover rounded" draggable={false} />
                </div>
              ))}

              {placed.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-neutral-500 text-sm">
                    The wall is empty. Add the first photo →
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
    </div>
  );
}
