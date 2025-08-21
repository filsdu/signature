import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Supabase client
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Constants
const WALL_WIDTH = 10000; // Increased for "infinite" feel
const WALL_HEIGHT = 10000;
const MIN_SIGNATURE_WIDTH = 50; // Smaller for denser placement
const MAX_SIGNATURE_WIDTH = 120;
const MIN_SIGNATURE_HEIGHT = 25;
const MAX_SIGNATURE_HEIGHT = 60;

// SignaturePad Component
const SignaturePad = ({ onExport, color = '#111827', width = 500, height = 200 }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [lastPoint, setLastPoint] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
  }, [width, height, color]);

  const getPosition = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (e.touches) {
      const t = e.touches[0];
      return {
        x: t.clientX - rect.left,   
        y: t.clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const pos = getPosition(e);
    const ctx = canvasRef.current.getContext('2d');
    
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setLastPoint(pos);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const pos = getPosition(e);
    const ctx = canvasRef.current.getContext('2d');
    
    const dist = Math.sqrt(Math.pow(pos.x - lastPoint.x, 2) + Math.pow(pos.y - lastPoint.y, 2));
    ctx.lineWidth = Math.max(2, Math.min(5, 10 - dist/10));
    
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasInk(true);
    setLastPoint(pos);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasInk(false);
  };

  const trimCanvas = (canvas) => {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    
    let minX = width, minY = height, maxX = 0, maxY = 0, hasInk = false;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;  
        const alpha = data[idx + 3];  
        
        if (alpha > 0) {  
          hasInk = true;  
          if (x < minX) minX = x;  
          if (y < minY) minY = y;  
          if (x > maxX) maxX = x;  
          if (y > maxY) maxY = y;  
        }
      }
    }
    
    if (!hasInk) return null;
    
    const trimW = Math.max(1, maxX - minX + 2); // Minimal padding for denser placement
    const trimH = Math.max(1, maxY - minY + 2);
    
    const out = document.createElement('canvas');
    out.width = trimW;
    out.height = trimH;
    
    const octx = out.getContext('2d');
    octx.drawImage(canvas, minX-1, minY-1, trimW, trimH, 0, 0, trimW, trimH);
    
    return out.toDataURL('image/png');
  };

  const exportSignature = () => {
    const trimmed = trimCanvas(canvasRef.current);
    if (!trimmed) return;
    onExport(trimmed);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-zinc-600">Draw your signature below</div>
        <div className="flex gap-2 text-sm">
          <button onClick={clearCanvas} className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200">
            Clear
          </button>
          <button 
            onClick={exportSignature} 
            disabled={!hasInk}
            className={`px-3 py-1.5 rounded-xl ${hasInk ? 'bg-black text-white hover:opacity-90' : 'bg-zinc-300 text-zinc-500 cursor-not-allowed'}`}
          >
            Use This Signature
          </button>
        </div>
      </div>
      
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-inner overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full touch-none block"
          style={{ height: `${height}px` }}
        />
      </div>
    </div>
  );
};

// Function to draw text on canvas (shared for mask and outline)
const drawTextOnCanvas = (ctx, text, width, height, isMask = false) => {
  ctx.clearRect(0, 0, width, height);
  if (isMask) {
    ctx.fillStyle = "#000";
  } else {
    ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
    ctx.lineWidth = 8;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const words = text.toUpperCase().trim().split(/\s+/);
  const wordCount = words.length;
  if (wordCount === 0) return;

  // Each word on its own row for multi-word campaigns
  const rows = wordCount;
  const cols = 1;
  const cellWidth = width;
  const cellHeight = height / rows;

  // Determine maximum font size per word
  const fontFamily = "'Arial Black', Gadget, sans-serif";
  let minFontSize = Infinity;
  for (let word of words) {
    let fontSize = Math.min(cellWidth, cellHeight) * 1.95;
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    while (ctx.measureText(word).width > cellWidth * 0.98 && fontSize > 10) {
      fontSize -= 1;
      ctx.font = `bold ${fontSize}px ${fontFamily}`;
    }
    minFontSize = Math.min(minFontSize, fontSize);
  }

  // Use consistent font size across words
  ctx.font = `bold ${minFontSize}px ${fontFamily}`;

  // Draw each word on its row
  words.forEach((word, index) => {
    const x = cellWidth / 2;
    const y = index * cellHeight + cellHeight / 2;
    if (isMask) {
      ctx.fillText(word, x, y);
    } else {
      ctx.strokeText(word, x, y);
    }
  });
};

// Text Outline Generator Component
const TextOutlineGenerator = ({ text, width, height, className = "" }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !text) return;
    const ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;
    drawTextOnCanvas(ctx, text, width, height, false);
  }, [text, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: `${width}px`,   
        height: `${height}px`,  
        display: 'block'
      }}
    />
  );
};

// Community Guidelines Modal Component
const CommunityGuidelinesModal = ({ isOpen, onClose, onAccept }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Community Guidelines</h2>
        
        <div className="text-sm mb-6">
          <p className="mb-3">By adding your signature, you agree to our community guidelines:</p>
          
          <ul className="list-disc pl-5 space-y-2">
            <li>Be respectful of others</li>
            <li>No hate speech or offensive content</li>
            <li>Your signature should be your own creation</li>
            <li>Respect copyright and intellectual property</li>
          </ul>
          
          <p className="mt-4 text-xs text-zinc-500">
            Violations may result in removal of your signature.
          </p>
        </div>
        
        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-200 hover:bg-zinc-300"
          >
            Cancel
          </button>
          <button 
            onClick={onAccept}
            className="px-4 py-2 rounded-lg bg-black text-white hover:opacity-90"
          >
            I Accept
          </button>
        </div>
      </div>
    </div>
  );
};

// Approval Modal for Admin
const ApprovalModal = ({ isOpen, onClose, pendingSignatures, onApprove, onReject }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Pending Signature Approvals</h2>
        {pendingSignatures.length === 0 ? (
          <p className="text-sm text-gray-600">No pending signatures.</p>
        ) : (
          pendingSignatures.map(sig => (
            <div key={sig.id} className="border-b py-4 last:border-b-0">
              <div className="flex items-center gap-4">
                <img src={sig.url} alt="Pending signature" className="w-20 h-10 object-contain" />
                <div>
                  <p className="text-sm">Campaign: {sig.campaign}</p>
                  <p className="text-sm">Name: {sig.name || 'Anonymous'}</p>
                </div>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => onApprove(sig.id)} className="px-3 py-1 bg-green-600 text-white rounded">Approve</button>
                  <button onClick={() => onReject(sig.id)} className="px-3 py-1 bg-red-600 text-white rounded">Reject</button>
                </div>
              </div>
            </div>
          ))
        )}
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded w-full">Close</button>
      </div>
    </div>
  );
};

// Time Lapse Modal
const TimeLapseModal = ({ isOpen, onClose, signatures }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const animationRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    const sortedSigs = [...signatures].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const total = sortedSigs.length;
    let index = 0;

    const animate = () => {
      if (index < total) {
        // Simulate adding signature
        // In real, you'd update a canvas or state to show progressive addition
        setProgress((index + 1) / total * 100);
        index++;
        animationRef.current = setTimeout(animate, 200); // 200ms per signature
      } else {
        setIsPlaying(false);
      }
    };

    animate();

    return () => clearTimeout(animationRef.current);
  }, [isOpen, isPlaying, signatures]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Time Lapse</h2>
        <div className="bg-gray-200 rounded-full h-2.5 mb-4">
          <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
        <button 
          onClick={() => setIsPlaying(!isPlaying)} 
          className="px-4 py-2 bg-indigo-600 text-white rounded w-full mb-2"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded w-full">Close</button>
      </div>
    </div>
  );
};

// Placement Engine
const PlacementEngine = {
  rotatedBounds: (w, h, rotRad) => {
    const cos = Math.cos(rotRad);
    const sin = Math.sin(rotRad);
    const rw = Math.abs(w * cos) + Math.abs(h * sin);
    const rh = Math.abs(w * sin) + Math.abs(h * cos);
    return { rw, rh };
  },

  overlaps: (a, b) => {
    const buffer = 2; // Reduced for denser placement
    return a.x < b.x + b.w + buffer &&
           a.x + a.w + buffer > b.x &&  
           a.y < b.y + b.h + buffer &&  
           a.y + a.h + buffer > b.y;
  },

  createSpatialGrid: (width, height, cellSize = 50) => {
    const grid = {};
    
    const getCellKey = (x, y) => `${Math.floor(x/cellSize)},${Math.floor(y/cellSize)}`;
    
    return {
      add: (item, x, y, w, h) => {
        const startX = Math.floor(x / cellSize);  
        const startY = Math.floor(y / cellSize);  
        const endX = Math.floor((x + w) / cellSize);  
        const endY = Math.floor((y + h) / cellSize);  
        
        for (let i = startX; i <= endX; i++) {  
          for (let j = startY; j <= endY; j++) {  
            const key = `${i},${j}`;  
            if (!grid[key]) grid[key] = [];  
            grid[key].push(item);  
          }  
        }
      },
      
      getNearby: (x, y, w, h) => {
        const startX = Math.floor(x / cellSize);  
        const startY = Math.floor(y / cellSize);  
        const endX = Math.floor((x + w) / cellSize);  
        const endY = Math.floor((y + h) / cellSize);  
        
        const items = new Set();  
        for (let i = startX - 1; i <= endX + 1; i++) { 
          for (let j = startY - 1; j <= endY + 1; j++) {  
            const key = `${i},${j}`;  
            if (grid[key]) {  
              grid[key].forEach(item => items.add(item));  
            }  
          }  
        }  
        return Array.from(items);
      }
    };
  },

  findPlacementInMask: ({ maskCanvas, imgW, imgH, rotRad, existing, maxTries = 10000 }) => {
    const { rw, rh } = PlacementEngine.rotatedBounds(imgW, imgH, rotRad);
    const w = Math.ceil(rw);
    const h = Math.ceil(rh);
    
    const ctx = maskCanvas.getContext("2d");
    const mask = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
    
    const grid = PlacementEngine.createSpatialGrid(maskCanvas.width, maskCanvas.height);
    existing.forEach(item => {
      const bounds = PlacementEngine.rotatedBounds(item.w, item.h, item.rot);
      grid.add(item, item.x, item.y, bounds.rw, bounds.rh);
    });

    const rectIsInsideMask = (x, y) => {
      const samples = 36; // 6x6 for even denser checking
      let insideCount = 0;
      
      for (let i = 0; i < samples; i++) {
        const sampleX = i % 6;
        const sampleY = Math.floor(i / 6);
        
        const px = Math.floor(x + sampleX * (w / 5));  
        const py = Math.floor(y + sampleY * (h / 5));  
        
        if (px >= 0 && px < maskCanvas.width && py >= 0 && py < maskCanvas.height) {  
          const idx = (py * maskCanvas.width + px) * 4 + 3;  
          if (mask[idx] > 200) insideCount++;  
        }
      }
      
      return insideCount >= 32; // Strict: 32/36 points inside
    };

    for (let i = 0; i < maxTries; i++) {
      const x = Math.floor(Math.random() * Math.max(1, maskCanvas.width - w));
      const y = Math.floor(Math.random() * Math.max(1, maskCanvas.height - h));
      
      if (!rectIsInsideMask(x, y)) continue;
      
      const bb = { x, y, w, h };
      
      const nearbyItems = grid.getNearby(x, y, w, h);
      const collides = nearbyItems.some(e => {
        const eBounds = PlacementEngine.rotatedBounds(e.w, e.h, e.rot);  
        return PlacementEngine.overlaps(bb, { 
          x: e.x, 
          y: e.y, 
          w: eBounds.rw, 
          h: eBounds.rh 
        });
      });
      
      if (!collides) return { x, y };
    }
    
    return null;
  }
};

// Admin Login Modal (unchanged)
const AdminLoginModal = ({ isOpen, onClose, onLogin }) => {
  const [password, setPassword] = useState("");
  
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === "TokloPazatGamer") {
      onLogin();
      onClose();
    } else {
      alert("Incorrect password");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Admin Login</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter admin password"
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-200 hover:bg-zinc-300"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 rounded-lg bg-black text-white hover:opacity-90"
            >
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main Word Campaign Board Component
export default function WordCampaignBoard() {
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [pendingSignatures, setPendingSignatures] = useState([]); // For approval queue
  const [userSignature, setUserSignature] = useState(null);
  const [penColor, setPenColor] = useState("#111827");
  const [signatureSize, setSignatureSize] = useState(0.5);
  const [rotation, setRotation] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [zoom, setZoom] = useState(0.5);
  const [isLoading, setIsLoading] = useState(true);
  const [userMessage, setUserMessage] = useState("");
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [userAction, setUserAction] = useState(null);
  const [maskCanvas, setMaskCanvas] = useState(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [newCampaignText, setNewCampaignText] = useState("");
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showTimeLapse, setShowTimeLapse] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  const wallScrollRef = useRef(null);
  const wallInnerRef = useRef(null);

  const userId = useMemo(() => {
    let id = localStorage.getItem('signatureShardsUserId');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('signatureShardsUserId', id);
    }
    return id;
  }, []);

  const userHasSigned = useMemo(() => 
    signatures.some(sig => sig.owner === userId),
    [signatures, userId]
  );

  // Load campaigns
  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        const { data, error } = await supabase.from('campaigns').select('name').order('created_at');
        if (error) throw error;
        const campaignNames = data.map(c => c.name);
        setCampaigns(campaignNames.length > 0 ? campaignNames : ["FREEDOM", "EQUALITY", "JUSTICE"]);
        setActiveCampaign(campaignNames[0] || "FREEDOM");
      } catch (err) {
        console.error("Error loading campaigns:", err);
      }
    };
    
    loadCampaigns();
  }, []);

  // Generate text mask and calculate completion
  useEffect(() => {
    if (!activeCampaign) return;
    
    const canvas = document.createElement("canvas");
    canvas.width = WALL_WIDTH;
    canvas.height = WALL_HEIGHT;
    const ctx = canvas.getContext("2d");
    drawTextOnCanvas(ctx, activeCampaign, WALL_WIDTH, WALL_HEIGHT, true);
    setMaskCanvas(canvas);

    // Calculate completion percentage
    const calculateCompletion = () => {
      const maskData = ctx.getImageData(0, 0, WALL_WIDTH, WALL_HEIGHT).data;
      let totalPixels = 0;
      let coveredPixels = 0;

      for (let i = 3; i < maskData.length; i += 4) {
        if (maskData[i] > 200) totalPixels++;
      }

      // Simulate coverage calculation (in real, render signatures on a temp canvas and count overlap)
      coveredPixels = signatures.length * 1000; // Placeholder
      setCompletionPercentage(Math.min(100, (coveredPixels / totalPixels * 100).toFixed(1)));
    };

    calculateCompletion();
  }, [activeCampaign, signatures]);

  // Load signatures and pending for admin
  useEffect(() => {
    if (!activeCampaign) return;
    
    const loadSignatures = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase  
          .from("word_signatures")  
          .select("*")  
          .eq("campaign", activeCampaign)  
          .eq("approved", true)  
          .order("created_at", { ascending: true });  
        
        if (error) throw error;
        
        const formattedSignatures = data.map(row => ({  
          id: row.id,  
          url: row.url,  
          x: row.x,  
          y: row.y,  
          w: row.w,  
          h: row.h,  
          rot: (row.rot_deg || 0) * Math.PI / 180,  
          owner: row.owner,  
          name: row.name || '',  
          showName: false,
          created_at: row.created_at  
        }));  
        setSignatures(formattedSignatures);  

        if (isAdminLoggedIn) {
          const { data: pending, error: pendingError } = await supabase  
            .from("word_signatures")  
            .select("*")  
            .eq("campaign", activeCampaign)  
            .is("approved", false);  
          if (pendingError) throw pendingError;
          setPendingSignatures(pending);
        }
      } catch (err) {
        console.error("Error loading signatures:", err);  
        setUserMessage("Unable to load signatures. Please refresh the page.");  
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSignatures();
    
    const channel = supabase
      .channel(`word_signatures:${activeCampaign}`)
      .on("postgres_changes", 
        { 
          event: "*", 
          schema: "public", 
          table: "word_signatures", 
          filter: `campaign=eq.${activeCampaign}` 
        }, 
        (payload) => {  
          if (payload.eventType === "INSERT") {  
            const newSig = {  
              id: payload.new.id,  
              url: payload.new.url,  
              x: payload.new.x,  
              y: payload.new.y,  
              w: payload.new.w,  
              h: payload.new.h,  
              rot: (payload.new.rot_deg || 0) * Math.PI / 180,  
              owner: payload.new.owner,  
              name: payload.new.name || '',  
              showName: false,
              created_at: payload.new.created_at,
              approved: payload.new.approved  
            };  
            if (payload.new.approved) {
              setSignatures(prev => [...prev, newSig]);
            } else if (isAdminLoggedIn) {
              setPendingSignatures(prev => [...prev, newSig]);
            }
          } else if (payload.eventType === "DELETE") {  
            setSignatures(prev => prev.filter(p => p.id !== payload.old.id));  
            setPendingSignatures(prev => prev.filter(p => p.id !== payload.old.id));
          } else if (payload.eventType === "UPDATE") {  
            const updatedSig = {  
              ...payload.new,  
              rot: (payload.new.rot_deg || 0) * Math.PI / 180,  
              showName: false  
            };  
            setSignatures(prev => prev.map(p => p.id === payload.new.id ? updatedSig : p));  
            setPendingSignatures(prev => prev.map(p => p.id === payload.new.id ? updatedSig : p));  
          }  
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCampaign, isAdminLoggedIn]);

  const handlePlaceSignature = async () => {
    if (!userSignature) {
      setUserMessage("Please create a signature first");
      return;
    }
    
    if (!guidelinesAccepted) {
      setShowGuidelines(true);
      return;
    }
    
    setUserAction('placing');
    setUserMessage("Finding the perfect spot for your signature...");
    
    try {
      const img = new Image();
      img.onload = async () => {
        try {  
          const baseSize = Math.min(img.width, img.height);  
          const targetSize = MIN_SIGNATURE_WIDTH + (MAX_SIGNATURE_WIDTH - MIN_SIGNATURE_WIDTH) * signatureSize;  
          const ratio = targetSize / baseSize;  
          
          const w = Math.max(MIN_SIGNATURE_WIDTH, Math.min(MAX_SIGNATURE_WIDTH, Math.round(img.width * ratio)));  
          const h = Math.max(MIN_SIGNATURE_HEIGHT, Math.min(MAX_SIGNATURE_HEIGHT, Math.round(img.height * ratio)));  
          
          const rotDeg = Math.round(rotation + (Math.random() * 20 - 10));
          const rotRad = (rotDeg * Math.PI) / 180;
    
          const placement = PlacementEngine.findPlacementInMask({  
            maskCanvas,  
            imgW: w,  
            imgH: h,  
            rotRad,  
            existing: signatures,  
          });
    
          if (!placement) {  
            setUserMessage("This campaign is completely filled! Try another campaign.");  
            setUserAction(null);  
            return;  
          }
    
          const signatureData = {  
            campaign: activeCampaign,  
            owner: userId,  
            url: userSignature,  
            x: Math.round(placement.x),  
            y: Math.round(placement.y),  
            w, h,  
            rot_deg: rotDeg,  
            name: displayName.trim().slice(0, 20),  
            approved: false // Pending approval
          };
    
          const { error } = await supabase  
            .from("word_signatures")  
            .insert(signatureData);
    
          if (error) throw error;
          
          setUserMessage("Your signature has been submitted for approval!");  
          setUserSignature(null);  
        } catch (err) {  
          console.error("Placement error:", err);  
          setUserMessage("Something went wrong during placement. Please try again.");  
        } finally {  
          setUserAction(null);  
        }
      };
      img.src = userSignature;
    } catch (err) {
      console.error("Unexpected error:", err);
      setUserMessage("An unexpected error occurred. Please try again.");
      setUserAction(null);
    }
  };

  const handleRemoveSignature = async () => {
    const userSig = signatures.find(sig => sig.owner === userId);
    if (!userSig) return;

    if (!window.confirm("Are you sure you want to remove your signature?")) return;

    try {
      const { error } = await supabase
        .from("word_signatures")
        .delete()
        .eq("id", userSig.id);
      if (error) throw error;
      setUserMessage("Signature removed successfully.");
    } catch (err) {
      setUserMessage("Failed to remove signature.");
    }
  };

  const locateMySignature = () => {
    const userSig = signatures.find(sig => sig.owner === userId);
    if (!userSig || !wallScrollRef.current) return;

    const container = wallScrollRef.current;
    const cx = userSig.x + userSig.w / 2;
    const cy = userSig.y + userSig.h / 2;

    const left = cx * zoom - container.clientWidth / 2;
    const top = cy * zoom - container.clientHeight / 2;

    container.scrollTo({ left, top, behavior: "smooth" });

    const el = wallInnerRef.current?.querySelector(`[data-sig-id="${userSig.id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.setAttribute('data-flash', '1');
      setTimeout(() => el.removeAttribute('data-flash'), 2000);
    }
  };

  const handleCreateCampaign = async () => {
    const trimmed = newCampaignText.trim().toUpperCase();
    if (!trimmed) return;

    try {
      const { error } = await supabase.from('campaigns').insert({ name: trimmed });
      if (error) throw error;
      setCampaigns(prev => [...prev, trimmed]);
      setActiveCampaign(trimmed);
      setNewCampaignText("");
    } catch (err) {
      setUserMessage("Failed to create campaign.");
    }
  };

  const shareCampaign = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setUserMessage("Link copied to clipboard!");
  };

  const downloadImage = async () => {
    setUserMessage("Generating image...");
    const canvas = document.createElement('canvas');
    canvas.width = WALL_WIDTH;
    canvas.height = WALL_HEIGHT;
    const ctx = canvas.getContext('2d');

    drawTextOnCanvas(ctx, activeCampaign, WALL_WIDTH, WALL_HEIGHT, false);

    for (const sig of signatures) {
      const img = new Image();
      img.src = sig.url;
      await new Promise(resolve => img.onload = resolve);
      ctx.save();
      ctx.translate(sig.x + sig.w / 2, sig.y + sig.h / 2);
      ctx.rotate(sig.rot);
      ctx.drawImage(img, -sig.w / 2, -sig.h / 2, sig.w, sig.h);
      ctx.restore();
    }

    const link = document.createElement('a');
    link.download = `${activeCampaign}-signatures.png`;
    link.href = canvas.toDataURL();
    link.click();
    setUserMessage("Image downloaded!");
  };

  const reportIssue = () => {
    // Placeholder
    setUserMessage("Issue reported. Thank you!");
  };

  const handleApprove = async (id) => {
    await supabase.from('word_signatures').update({ approved: true }).eq('id', id);
  };

  const handleReject = async (id) => {
    await supabase.from('word_signatures').delete().eq('id', id);
  };

  const colorPalette = [
    '#111827', '#b91c1c', '#1d4ed8', '#0f766e', '#ca8a04', '#86198f',
    '#dc2626', '#2563eb', '#059669', '#d97706', '#7e22ce'
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-purple-50 text-gray-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-indigo-700">Signature Shards - Word Campaign</h1>
            <button onClick={() => setShowAdminLogin(true)} className="text-sm text-gray-600 hover:text-indigo-700">
              Admin Login
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {isAdminLoggedIn ? (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="text-xl font-bold mb-4">Campaign Management</h2>
              <input 
                value={newCampaignText}
                onChange={e => setNewCampaignText(e.target.value)}
                placeholder="New campaign name"
                className="w-full p-2 border rounded mb-2"
              />
              <button onClick={handleCreateCampaign} className="bg-indigo-600 text-white p-2 rounded">Create</button>
            </div>
            <button onClick={() => setShowApprovalModal(true)} className="bg-yellow-500 text-white p-2 rounded">Approve Pending ({pendingSignatures.length})</button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl shadow">
                <h2 className="text-lg font-bold mb-3">Campaigns</h2>
                {campaigns.map(c => (
                  <button key={c} onClick={() => setActiveCampaign(c)} className={`block w-full text-left p-2 ${activeCampaign === c ? 'bg-indigo-100' : ''}`}>
                    {c}
                  </button>
                ))}
              </div>
              <SignaturePad onExport={setUserSignature} color={penColor} />
              <div className="bg-white p-5 rounded-xl shadow">
                <h2 className="text-lg font-bold mb-3">Options</h2>
                <div className="space-y-4">
                  <div>
                    Size: {Math.round(signatureSize * 100)}%
                    <input type="range" min="0" max="1" step="0.01" value={signatureSize} onChange={e => setSignatureSize(e.target.value)} className="w-full" />
                  </div>
                  <div>
                    Rotation: {rotation}°
                    <input type="range" min="-45" max="45" value={rotation} onChange={e => setRotation(e.target.value)} className="w-full" />
                  </div>
                  <input 
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Display Name"
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow">
                <button onClick={handlePlaceSignature} disabled={userHasSigned} className="w-full bg-indigo-600 text-white p-2 rounded mb-2">
                  Place Signature
                </button>
                <button onClick={handleRemoveSignature} disabled={!userHasSigned} className="w-full bg-red-600 text-white p-2 rounded mb-2">
                  Remove Signature
                </button>
                <button onClick={locateMySignature} disabled={!userHasSigned} className="w-full bg-green-600 text-white p-2 rounded mb-2">
                  Locate Signature
                </button>
                <button onClick={() => setShowTimeLapse(true)} className="w-full bg-blue-600 text-white p-2 rounded">
                  View Time Lapse
                </button>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="bg-white p-5 rounded-xl shadow">
                <h2 className="text-xl font-bold mb-4">{activeCampaign}</h2>
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setZoom(z => z - 0.1)} className="p-2 bg-gray-200 rounded">-</button>
                  <span>{(zoom * 100).toFixed(0)}%</span>
                  <button onClick={() => setZoom(z => z + 0.1)} className="p-2 bg-gray-200 rounded">+</button>
                </div>
                <div ref={wallScrollRef} className="h-[70vh] overflow-auto relative border border-gray-200" style={{ background: 'radial-gradient(#d4d4d8 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
                  <div ref={wallInnerRef} style={{ transform: `scale(${zoom})`, transformOrigin: '0 0', minWidth: `${WALL_WIDTH}px`, minHeight: `${WALL_HEIGHT}px` }}>
                    <TextOutlineGenerator text={activeCampaign} width={WALL_WIDTH} height={WALL_HEIGHT} />
                    {signatures.map(sig => (
                      <div key={sig.id} style={{
                        position: 'absolute',
                        left: sig.x,
                        top: sig.y,
                        width: sig.w,
                        height: sig.h,
                        transform: `rotate(${sig.rot * 180 / Math.PI}deg)`
                      }}>
                        <img src={sig.url} alt="" style={{ width: '100%', height: '100%' }} />
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-2">Completion: {completionPercentage}%</p>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={shareCampaign} className="bg-blue-600 text-white p-2 rounded">Share</button>
                <button onClick={downloadImage} className="bg-green-600 text-white p-2 rounded">Download</button>
                <button onClick={reportIssue} className="bg-red-600 text-white p-2 rounded">Report</button>
              </div>
            </div>
          </div>
        )}
      </main>

      <CommunityGuidelinesModal isOpen={showGuidelines} onClose={() => setShowGuidelines(false)} onAccept={() => setGuidelinesAccepted(true)} />
      <AdminLoginModal isOpen={showAdminLogin} onClose={() => setShowAdminLogin(false)} onLogin={() => setIsAdminLoggedIn(true)} />
      <ApprovalModal isOpen={showApprovalModal} onClose={() => setShowApprovalModal(false)} pendingSignatures={pendingSignatures} onApprove={handleApprove} onReject={handleReject} />
      <TimeLapseModal isOpen={showTimeLapse} onClose={() => setShowTimeLapse(false)} signatures={signatures} />
    </div>
  );
}
