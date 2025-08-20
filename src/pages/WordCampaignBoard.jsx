import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import html2canvas from "html2canvas";

// Supabase client
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Constants
const WALL_WIDTH = 5000;
const WALL_HEIGHT = 3000;
const MIN_SIGNATURE_WIDTH = 70;
const MAX_SIGNATURE_WIDTH = 100;
const MIN_SIGNATURE_HEIGHT = 35;
const MAX_SIGNATURE_HEIGHT = 50;

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
    
    // Calculate distance from last point to determine line width
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
    
    const trimW = Math.max(1, maxX - minX + 10);
    const trimH = Math.max(1, maxY - minY + 10);
    
    const out = document.createElement('canvas');
    out.width = trimW;
    out.height = trimH;
    
    const octx = out.getContext('2d');
    octx.drawImage(canvas, minX-5, minY-5, trimW, trimH, 0, 0, trimW, trimH);
    
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

// Text Outline Generator Component
const TextOutlineGenerator = ({ text, width, height, className = "" }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !text) return;
    
    const ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    
    ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
    ctx.lineWidth = 3;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Split text into characters for multi-line layout
    const characters = text.split("");
    const charCount = characters.length;
    
    // Determine layout - single line for short text, multi-line for longer text
    let rows = 1;
    let cols = charCount;
    
    if (charCount > 6) {
      // For longer text, use multiple rows
      rows = Math.ceil(Math.sqrt(charCount));
      cols = Math.ceil(charCount / rows);
    }
    
    const cellWidth = width / cols;
    const cellHeight = height / rows;
    
    // Find the maximum font size that fits all cells
    let fontSize = Math.min(cellWidth, cellHeight) * 1.8;
    const fontFamily = "'Arial Black', Arial, sans-serif";
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    
    // Adjust font size if any character is too wide
    for (let i = 0; i < charCount; i++) {
      const char = characters[i];
      const metrics = ctx.measureText(char);
      const textWidth = metrics.width;
      
      while (textWidth > cellWidth * 0.9 && fontSize > 10) {
        fontSize -= 2;
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
      }
    }
    
    // Draw each character in its cell
    let charIndex = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (charIndex >= charCount) break;
        
        const char = characters[charIndex];
        const x = col * cellWidth + cellWidth / 2;
        const y = row * cellHeight + cellHeight / 2;
        
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
        ctx.strokeText(char, x, y);
        charIndex++;
      }
    }
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

// Placement Engine
const PlacementEngine = {
  // Calculate rotated bounds
  rotatedBounds: (w, h, rotRad) => {
    const cos = Math.cos(rotRad);
    const sin = Math.sin(rotRad);
    const rw = Math.abs(w * cos) + Math.abs(h * sin);
    const rh = Math.abs(w * sin) + Math.abs(h * cos);
    return { rw, rh };
  },

  // Check if two rectangles overlap
  overlaps: (a, b) => {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&  
           a.y < b.y + b.h &&  
           a.y + a.h > b.y;
  },

  // Create a grid for spatial partitioning
  createSpatialGrid: (width, height, cellSize = 100) => {
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
        for (let i = startX; i <= endX; i++) {  
          for (let j = startY; j <= endY; j++) {  
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

  // Find placement inside text mask
  findPlacementInMask: ({ maskCanvas, imgW, imgH, rotRad, existing, maxTries = 2000 }) => {
    const { rw, rh } = PlacementEngine.rotatedBounds(imgW, imgH, rotRad);
    const w = Math.ceil(rw);
    const h = Math.ceil(rh);
    
    const ctx = maskCanvas.getContext("2d");
    const mask = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
    
    // Create spatial grid for existing items
    const grid = PlacementEngine.createSpatialGrid(maskCanvas.width, maskCanvas.height);
    existing.forEach(item => {
      const bounds = PlacementEngine.rotatedBounds(item.w, item.h, item.rot);
      grid.add(item, item.x, item.y, bounds.rw, bounds.rh);
    });

    // Check if a rectangle is inside the text mask
    const rectIsInsideMask = (x, y) => {
      // Sample multiple points inside the rectangle
      const samples = 16; // Increased from 9 to 16 for better accuracy
      let insideCount = 0;
      
      for (let i = 0; i < samples; i++) {
        const sampleX = i % 4; // 4x4 grid
        const sampleY = Math.floor(i / 4);
        
        const px = Math.floor(x + sampleX * (w / 3));  
        const py = Math.floor(y + sampleY * (h / 3));  
        
        if (px >= 0 && px < maskCanvas.width && py >= 0 && py < maskCanvas.height) {  
          const idx = (py * maskCanvas.width + px) * 4 + 3; // alpha channel  
          if (mask[idx] > 200) insideCount++;  
        }
      }
      
      return insideCount >= 12; // At least 12 of 16 points should be inside
    };

    // Try to find a valid position
    for (let i = 0; i < maxTries; i++) {
      const x = Math.floor(Math.random() * Math.max(1, maskCanvas.width - w));
      const y = Math.floor(Math.random() * Math.max(1, maskCanvas.height - h));
      
      if (!rectIsInsideMask(x, y)) continue;
      
      const bb = { x, y, w, h };
      
      // Check only nearby items using spatial grid
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
    
    return null; // No valid position found
  }
};

// Admin Login Modal
const AdminLoginModal = ({ isOpen, onClose, onLogin }) => {
  const [password, setPassword] = useState("");
  
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === "TokloPazatGamer") {
      onLogin();
      onClose();
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
  // State management
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [signatures, setSignatures] = useState([]);
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [newCampaignText, setNewCampaignText] = useState("");

  // Refs
  const wallScrollRef = useRef(null);
  const wallInnerRef = useRef(null);

  // User session ID
  const userId = useMemo(() => {
    let id = sessionStorage.getItem('signatureShardsUserId');
    if (!id) {
      id = crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
      sessionStorage.setItem('signatureShardsUserId', id);
    }
    return id;
  }, []);

  // Check if user has already placed a signature
  const userHasSigned = useMemo(() => 
    signatures.some(sig => sig.owner === userId),
    [signatures, userId]
  );

  // Load campaigns
  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        // In a real app, you'd fetch from your campaigns table  
        // For now, we'll use localStorage as a simple solution  
        const savedCampaigns = JSON.parse(localStorage.getItem('signatureShardsCampaigns') || '[]');  
        
        if (savedCampaigns.length > 0) {  
          setCampaigns(savedCampaigns);  
          setActiveCampaign(savedCampaigns[0]);  
        } else {  
          // Default campaigns if none exist  
          const defaultCampaigns = ["FREEDOM", "EQUALITY", "JUSTICE"];  
          setCampaigns(defaultCampaigns);  
          setActiveCampaign(defaultCampaigns[0]);  
          localStorage.setItem('signatureShardsCampaigns', JSON.stringify(defaultCampaigns));  
        }
      } catch (err) {
        console.error("Error loading campaigns:", err);
      }
    };
    
    loadCampaigns();
  }, []);

  // Generate text mask
  useEffect(() => {
    if (!activeCampaign) return;
    
    const canvas = document.createElement("canvas");
    canvas.width = WALL_WIDTH;
    canvas.height = WALL_HEIGHT;
    const ctx = canvas.getContext("2d");
    
    ctx.clearRect(0, 0, WALL_WIDTH, WALL_HEIGHT);
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Split text into characters for multi-line layout
    const characters = activeCampaign.split("");
    const charCount = characters.length;
    
    // Determine layout - single line for short text, multi-line for longer text
    let rows = 1;
    let cols = charCount;
    
    if (charCount > 6) {
      // For longer text, use multiple rows
      rows = Math.ceil(Math.sqrt(charCount));
      cols = Math.ceil(charCount / rows);
    }
    
    const cellWidth = WALL_WIDTH / cols;
    const cellHeight = WALL_HEIGHT / rows;
    
    // Find the maximum font size that fits all cells
    let fontSize = Math.min(cellWidth, cellHeight) * 1.8;
    const fontFamily = "'Arial Black', Arial, sans-serif";
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    
    // Adjust font size if any character is too wide
    for (let i = 0; i < charCount; i++) {
      const char = characters[i];
      const metrics = ctx.measureText(char);
      const textWidth = metrics.width;
      
      while (textWidth > cellWidth * 0.9 && fontSize > 10) {
        fontSize -= 2;
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
      }
    }
    
    // Draw each character in its cell
    let charIndex = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (charIndex >= charCount) break;
        
        const char = characters[charIndex];
        const x = col * cellWidth + cellWidth / 2;
        const y = row * cellHeight + cellHeight / 2;
        
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
        ctx.fillText(char, x, y);
        charIndex++;
      }
    }
    
    setMaskCanvas(canvas);
  }, [activeCampaign]);

  // Load signatures for active campaign
  useEffect(() => {
    if (!activeCampaign) return;
    
    const loadSignatures = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase  
          .from("word_signatures")  
          .select("*")  
          .eq("campaign", activeCampaign)  
          .order("created_at", { ascending: true });  
        
        if (error) {  
          console.error("Error loading signatures:", error);  
          setUserMessage("Unable to load signatures. Please refresh the page.");  
        } else {  
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
            showName: false  
          }));  
          setSignatures(formattedSignatures);  
        }
      } catch (err) {
        console.error("Unexpected error:", err);  
        setUserMessage("An unexpected error occurred. Please refresh the page.");  
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSignatures();
    
    // Set up realtime subscription
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
              showName: false  
            };  
            setSignatures(prev => [...prev, newSig]);  
          } else if (payload.eventType === "DELETE") {  
            setSignatures(prev => prev.filter(p => p.id !== payload.old.id));  
          } else if (payload.eventType === "UPDATE") {  
            setSignatures(prev => prev.map(p =>   
              p.id === payload.new.id ? {  
                ...p,  
                x: payload.new.x,  
                y: payload.new.y,  
                w: payload.new.w,  
                h: payload.new.h,  
                rot: (payload.new.rot_deg || 0) * Math.PI / 180,  
                name: payload.new.name || ''  
              } : p  
            ));  
          }  
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCampaign]);

  // Handle signature placement
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
          // Calculate dimensions with constrained size variation  
          const baseSize = Math.min(img.width, img.height);  
          const targetSize = MIN_SIGNATURE_WIDTH + (MAX_SIGNATURE_WIDTH - MIN_SIGNATURE_WIDTH) * signatureSize;  
          const ratio = targetSize / baseSize;  
          
          const w = Math.max(MIN_SIGNATURE_WIDTH, Math.min(MAX_SIGNATURE_WIDTH, Math.round(img.width * ratio)));  
          const h = Math.max(MIN_SIGNATURE_HEIGHT, Math.min(MAX_SIGNATURE_HEIGHT, Math.round(img.height * ratio)));  
          
          // Slight random rotation for visual interest (-10 to +10 degrees)  
          const rotDeg = Math.round(rotation + (Math.random() * 20 - 10)); // ← make it an INT
          const rotRad = (rotDeg * Math.PI) / 180;
    
          // Find placement  
          const placement = PlacementEngine.findPlacementInMask({  
            maskCanvas,  
            imgW: w,  
            imgH: h,  
            rotRad,  
            existing: signatures,  
            maxTries: 2500  
          });
    
          if (!placement) {  
            setUserMessage("This campaign is completely filled! Try another campaign.");  
            setUserAction(null);  
            return;  
          }
    
          // Save to database  
          const signatureData = {  
            campaign: activeCampaign,  
            owner: userId,  
            url: userSignature,  
            x: Math.round(placement.x),  
            y: Math.round(placement.y),  
            w, h,  
            rot_deg: rotDeg,  
            name: displayName.trim().slice(0, 20)  
          };
    
          const { error } = await supabase  
            .from("word_signatures")  
            .insert(signatureData);
    
          if (error) {  
            console.error("Error saving signature:", error);  
            setUserMessage("Failed to save your signature. Please try again.");  
          } else {  
            setUserMessage("Your signature has been added to the campaign!");  
            setUserSignature(null);  
            setTimeout(() => locateMySignature(), 500);  
          }  
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

  // Handle signature removal
  const handleRemoveSignature = async () => {
    const userSig = signatures.find(sig => sig.owner === userId);
    if (!userSig) {
      setUserMessage("You haven't placed a signature in this campaign yet.");
      return;
    }
    
    setUserAction('erasing');
    setUserMessage("Removing your signature...");
    
    try {
      const { error } = await supabase
        .from("word_signatures")  
        .delete()  
        .eq("id", userSig.id);
      
      if (error) {
        console.error("Error removing signature:", error);  
        setUserMessage("Failed to remove your signature. Please try again.");  
      } else {
        setUserMessage("Your signature has been removed.");  
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setUserMessage("An unexpected error occurred. Please try again.");  
    } finally {
      setUserAction(null);
    }
  };

  // Locate user's signature
  const locateMySignature = () => {
    const userSig = signatures.find(sig => sig.owner === userId);
    if (!userSig || !wallScrollRef.current) return;
    
    const container = wallScrollRef.current;
    const cx = userSig.x + userSig.w / 2;
    const cy = userSig.y + userSig.h / 2;
    
    const left = Math.max(0, Math.min(
      cx - container.clientWidth / (2 * zoom),
      WALL_WIDTH - container.clientWidth / zoom
    ));
    
    const top = Math.max(0, Math.min(
      cy - container.clientHeight / (2 * zoom),
      WALL_HEIGHT - container.clientHeight / zoom
    ));
    
    container.scrollTo({ left, top, behavior: "smooth" });
    
    // Highlight signature
    const el = wallInnerRef.current?.querySelector(`[data-sig-id="${userSig.id}"]`);
    if (el) {
      el.setAttribute('data-flash', '1');
      setTimeout(() => el.removeAttribute('data-flash'), 1500);
    }
  };

  // Create new campaign
  const handleCreateCampaign = () => {
    if (!newCampaignText.trim()) return;
    
    const newCampaigns = [...campaigns, newCampaignText.trim().toUpperCase()];
    setCampaigns(newCampaigns);
    setActiveCampaign(newCampaignText.trim().toUpperCase());
    setNewCampaignText("");
    localStorage.setItem('signatureShardsCampaigns', JSON.stringify(newCampaigns));
  };

  // Share campaign
  const shareCampaign = () => {
    if (navigator.share) {
      navigator.share({
        title: `Signature Shards Campaign: ${activeCampaign}`,
        text: `Check out this signature campaign for ${activeCampaign} on Signature Shards!`,
        url: window.location.href,
      })
      .catch(console.error);
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href);
      setUserMessage("Campaign link copied to clipboard!");
    }
  };

  // Download campaign image
  const downloadImage = async () => {
    if (!wallInnerRef.current) return;
    
    setUserMessage("Preparing your download...");
    
    try {
      const canvas = await html2canvas(wallInnerRef.current, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        onclone: (clonedDoc) => {
          // Make sure all signatures are visible in the clone
          const clonedWall = clonedDoc.querySelector('[data-wall-inner]');
          if (clonedWall) {
            clonedWall.style.transform = 'scale(1)';
            clonedWall.style.transformOrigin = 'top left';
          }
        }
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `signature-shards-${activeCampaign}.png`;
      link.href = dataUrl;
      link.click();
      
      setUserMessage("Image downloaded successfully!");
    } catch (err) {
      console.error("Error generating image:", err);
      setUserMessage("Failed to generate image. Please try again.");
    }
  };

  // Report issue
  const reportIssue = () => {
    const subject = `Issue Report: ${activeCampaign} Campaign`;
    const body = `Please describe the issue you're experiencing with the ${activeCampaign} campaign:`;
    
    window.open(`mailto:support@signatureshards.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  // Color palette
  const colorPalette = [
    '#111827', '#b91c1c', '#1d4ed8', '#0f766e', '#ca8a04', '#86198f',
    '#dc2626', '#2563eb', '#059669', '#d97706', '#7e22ce'
  ];

  if (!activeCampaign) {
    return <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-purple-50 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-indigo-700">Signature Shards</h1>
              <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                Word Campaign
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setShowAdminLogin(true)}
                className="text-sm text-gray-600 hover:text-indigo-700 transition-colors"
              >
                Admin Login
              </button>
              <a 
                href="/" 
                className="flex items-center text-sm text-gray-600 hover:text-indigo-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back to Home
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAdminLoggedIn ? (  
          // Admin View  
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">  
            <h2 className="text-xl font-bold mb-6">Campaign Management</h2>  
              
            <div className="grid md:grid-cols-2 gap-8">  
              <div>  
                <h3 className="text-lg font-semibold mb-4">Create New Campaign</h3>  
                <div className="space-y-4">  
                  <div>  
                    <label className="block text-sm font-medium text-gray-700 mb-1">  
                      Campaign Text  
                    </label>  
                    <input  
                      type="text"  
                      value={newCampaignText}  
                      onChange={e => setNewCampaignText(e.target.value)}  
                      placeholder="Enter campaign text (short is best)"  
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"  
                    />  
                    <p className="text-xs text-gray-500 mt-1">  
                      Keep it short (2-3 words) for best results  
                    </p>  
                  </div>  
                    
                  <button  
                    onClick={handleCreateCampaign}  
                    disabled={!newCampaignText.trim()}  
                    className={`px-4 py-2 rounded-xl font-medium ${newCampaignText.trim() ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}  
                  >  
                    Create Campaign  
                  </button>  
                </div>  
              </div>  
                
              <div>  
                <h3 className="text-lg font-semibold mb-4">Existing Campaigns</h3>  
                <div className="space-y-2 max-h-60 overflow-y-auto">  
                  {campaigns.map(campaign => (  
                    <div  
                      key={campaign}  
                      className={`p-3 rounded-lg border flex justify-between items-center ${activeCampaign === campaign ? 'bg-indigo-50 border-indigo-500' : 'bg-gray-50 border-gray-200'}`}  
                    >  
                      <span className="font-medium">"{campaign}"</span>  
                      <div className="flex space-x-2">  
                        <button  
                          onClick={() => setActiveCampaign(campaign)}  
                          className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded"  
                        >  
                          View  
                        </button>  
                        <button  
                          onClick={() => {  
                            const newCampaigns = campaigns.filter(c => c !== campaign);  
                            setCampaigns(newCampaigns);  
                            if (activeCampaign === campaign && newCampaigns.length > 0) {  
                              setActiveCampaign(newCampaigns[0]);  
                            }  
                            localStorage.setItem('signatureShardsCampaigns', JSON.stringify(newCampaigns));  
                          }}  
                          className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded"  
                        >  
                          Delete  
                        </button>  
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
            {/* Left Column - Controls */}  
            <div className="lg:col-span-1 space-y-6">  
              {/* Campaign Selection */}  
              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">  
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Select Campaign</h2>  
                <div className="space-y-2 max-h-60 overflow-y-auto">  
                  {campaigns.map(campaign => (  
                    <button  
                      key={campaign}  
                      onClick={() => setActiveCampaign(campaign)}  
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all ${activeCampaign === campaign   
                        ? 'bg-indigo-100 border-indigo-500 text-indigo-700 font-medium'   
                        : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'  
                      } border`}  
                    >  
                      "{campaign}"  
                    </button>  
                  ))}  
                </div>  
                <p className="text-xs text-gray-500 mt-3">  
                  {signatures.length} signatures in this campaign  
                </p>  
              </div>  

              {/* Signature Creation */}  
              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">  
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Create Your Signature</h2>  
                  
                <SignaturePad   
                  onExport={setUserSignature}   
                  color={penColor}   
                  width={320}  
                  height={160}  
                />  
                  
                <div className="mt-4">  
                  <p className="text-sm font-medium text-gray-700 mb-2">Signature Color</p>  
                  <div className="flex flex-wrap gap-2">  
                    {colorPalette.map(color => (  
                      <button  
                        key={color}  
                        onClick={() => setPenColor(color)}  
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${penColor === color ? 'scale-110 ring-2 ring-offset-2 ring-indigo-300' : 'hover:scale-105'}`}  
                        style={{ backgroundColor: color, borderColor: color === '#111827' ? '#e5e7eb' : color }}  
                        aria-label={`Select color ${color}`}  
                      />  
                    ))}  
                  </div>  
                </div>  
              </div>  

              {/* Placement Options */}  
              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">  
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Signature Options</h2>  
                  
                <div className="space-y-4">  
                  <div>  
                    <label className="block text-sm font-medium text-gray-700 mb-1">  
                      Size: <span className="text-indigo-600">{Math.round(signatureSize * 100)}%</span>  
                    </label>  
                    <input   
                      type="range"   
                      min="30"   
                      max="70"   
                      value={signatureSize * 100}   
                      onChange={e => setSignatureSize(parseInt(e.target.value) / 100)}   
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"  
                    />  
                    <div className="flex justify-between text-xs text-gray-500 mt-1">  
                      <span>Smaller</span>  
                      <span>Larger</span>  
                    </div>  
                  </div>  
                    
                  <div>  
                    <label className="block text-sm font-medium text-gray-700 mb-1">  
                      Rotation: <span className="text-indigo-600">{rotation}°</span>  
                    </label>  
                    <input   
                      type="range"   
                      min="-45"   
                      max="45"   
                      value={rotation}   
                      onChange={e => setRotation(parseInt(e.target.value))}   
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"  
                    />  
                    <div className="flex justify-between text-xs text-gray-500 mt-1">  
                      <span>-45°</span>  
                      <span>0°</span>  
                      <span>45°</span>  
                    </div>  
                  </div>  
                    
                  <div>  
                    <label className="block text-sm font-medium text-gray-700 mb-1">  
                      Display Name (optional)  
                    </label>  
                    <input  
                      type="text"  
                      value={displayName}  
                      onChange={e => setDisplayName(e.target.value.slice(0, 20))}  
                      placeholder="How you'll be identified"  
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"  
                    />  
                    <p className="text-xs text-gray-500 mt-1">  
                      {displayName.length}/20 characters  
                    </p>  
                  </div>  
                </div>  
              </div>  

              {/* Action Buttons */}  
              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">  
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Add Your Signature</h2>  
                  
                <div className="space-y-3">  
                  {userHasSigned ? (  
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">  
                      <p className="text-sm text-blue-700 flex items-center">  
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">  
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />  
                        </svg>  
                        You've already signed this campaign  
                      </p>  
                    </div>  
                  ) : (  
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">  
                      <p className="text-sm text-amber-700">  
                        Your signature will be permanently added to this artwork  
                      </p>  
                    </div>  
                  )}  
                    
                  <button  
                    onClick={handlePlaceSignature}  
                    disabled={!userSignature || userHasSigned || userAction === 'placing'}  
                    className={`w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center ${  
                      !userSignature || userHasSigned || userAction === 'placing'  
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'  
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'  
                    }`}  
                  >  
                    {userAction === 'placing' ? (  
                      <>  
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">  
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>  
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>  
                        </svg>  
                        Placing...  
                      </>  
                    ) : userHasSigned ? (  
                      'Already Signed'  
                    ) : (  
                      'Place My Signature'  
                    )}  
                  </button>  
                    
                  <button  
                    onClick={handleRemoveSignature}  
                    disabled={!userHasSigned || userAction === 'erasing'}  
                    className={`w-full py-2 px-4 rounded-xl font-medium transition-all flex items-center justify-center ${  
                      !userHasSigned || userAction === 'erasing'  
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'  
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'  
                    }`}  
                  >  
                    {userAction === 'erasing' ? (  
                      <>  
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">  
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>  
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>  
                        </svg>  
                        Removing...  
                      </>  
                    ) : (  
                      'Remove My Signature'  
                    )}  
                  </button>  
                    
                  <button  
                    onClick={locateMySignature}  
                    disabled={!userHasSigned}  
                    className={`w-full py-2 px-4 rounded-xl font-medium transition-all flex items-center justify-center ${  
                      !userHasSigned  
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'  
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'  
                    }`}  
                  >  
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">  
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />  
                    </svg>  
                    Find My Signature  
                  </button>  
                    
                  <div className="flex items-start mt-4">  
                    <input  
                      type="checkbox"  
                      id="guidelinesCheckbox"  
                      checked={guidelinesAccepted}  
                      onChange={e => setGuidelinesAccepted(e.target.checked)}  
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded mt-1 focus:ring-indigo-500"  
                    />  
                    <label htmlFor="guidelinesCheckbox" className="ml-2 block text-sm text-gray-700">  
                      I agree to the <button   
                        type="button"   
                        onClick={() => setShowGuidelines(true)}   
                        className="text-indigo-600 hover:underline"  
                      >  
                        Community Guidelines  
                      </button>  
                    </label>  
                  </div>  
                </div>  
                  
                {userMessage && (  
                  <div className={`mt-4 p-3 rounded-lg text-sm ${  
                    userMessage.includes('error') || userMessage.includes('Failed') || userMessage.includes('crowded') || userMessage.includes('filled')  
                      ? 'bg-red-50 text-red-700 border border-red-200'   
                      : 'bg-green-50 text-green-700 border border-green-200'  
                  }`}>  
                    {userMessage}  
                  </div>  
                )}  
              </div>  
            </div>  

            {/* Right Column - Canvas */}  
            <div className="lg:col-span-2">  
              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200 mb-5">  
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">  
                  <h2 className="text-xl font-bold text-gray-900 mb-2 sm:mb-0">  
                    "{activeCampaign}"  
                  </h2>  
                    
                  <div className="flex items-center space-x-3">  
                    <div className="flex items-center bg-gray-100 rounded-lg px-3 py-1.5">  
                      <button   
                        onClick={() => setZoom(z => Math.max(0.2, +(z - 0.1).toFixed(1)))}  
                        className="text-gray-600 hover:text-indigo-700 p-1"  
                        aria-label="Zoom out"  
                      >  
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">  
                          <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />  
                        </svg>  
                      </button>  
                        
                      <span className="mx-2 text-sm font-medium text-gray-700 min-w-[3rem] text-center">  
                        {Math.round(zoom * 100)}%  
                      </span>  
                        
                      <button   
                        onClick={() => setZoom(z => Math.min(2, +(z + 0.1).toFixed(1)))}  
                        className="text-gray-600 hover:text-indigo-700 p-1"  
                        aria-label="Zoom in"  
                      >  
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">  
                          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />  
                        </svg>  
                      </button>  
                    </div>  
                      
                    <div className="text-sm text-gray-500 bg-gray-100 rounded-lg px-3 py-1.5">  
                      {signatures.length} signatures  
                    </div>  
                  </div>  
                </div>  
                  
                <div className="relative bg-gray-100 rounded-lg overflow-hidden border border-gray-300">  
                  {isLoading ? (  
                    <div className="h-96 flex items-center justify-center">  
                      <div className="text-center">  
                        <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">  
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>  
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>  
                        </svg>  
                        <p className="mt-2 text-gray-600">Loading signatures...</p>  
                      </div>  
                    </div>  
                  ) : (  
                    <div   
                      ref={wallScrollRef}  
                      className="h-96 overflow-auto relative"  
                    >  
                      <div  
                        ref={wallInnerRef}  
                        data-wall-inner  
                        className="relative mx-auto my-6"  
                        style={{  
                          width: WALL_WIDTH + 'px',  
                          height: WALL_HEIGHT + 'px',  
                          backgroundSize: '24px 24px',  
                          backgroundImage: 'radial-gradient(#d4d4d8 1px, transparent 1px)',  
                          transform: `scale(${zoom})`,  
                          transformOrigin: 'top left'  
                        }}  
                      >  
                        {/* Text outline preview */}  
                        <TextOutlineGenerator   
                          text={activeCampaign}   
                          width={WALL_WIDTH}  
                          height={WALL_HEIGHT}  
                          className="absolute inset-0 pointer-events-none"  
                        />  
                          
                        {/* Signatures */}  
                        {signatures.map((sig) => (  
                          <div   
                            key={sig.id}   
                            data-sig-id={sig.id}  
                            className="absolute select-none transition-transform duration-200 hover:z-10 hover:scale-105"  
                            style={{   
                              left: sig.x,   
                              top: sig.y,   
                              width: sig.w,   
                              height: sig.h,  
                              transform: `rotate(${(sig.rot * 180 / Math.PI).toFixed(2)}deg)`,  
                              transformOrigin: 'center'  
                            }}  
                            onClick={(e) => {  
                              e.stopPropagation();  
                              setSignatures(prev => prev.map(s =>   
                                s.id === sig.id   
                                  ? { ...s, showName: !s.showName }   
                                  : { ...s, showName: false }  
                              ));  
                            }}  
                          >  
                            {/* Name tooltip */}  
                            {sig.name && (  
                              <div className={`absolute -top-7 left-1/2 transform -translate-x-1/2 text-xs px-2 py-1 rounded bg-gray-900 text-white whitespace-nowrap transition-opacity ${  
                                sig.showName ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'  
                              }`}>  
                                {sig.name}  
                              </div>  
                            )}  
                              
                            <img   
                              src={sig.url}   
                              alt="signature"   
                              className="w-full h-full"  
                              draggable={false}  
                            />  
                          </div>  
                        ))}  
                      </div>  
                    </div>  
                  )}  
                </div>  
                  
                <div className="mt-4 text-sm text-gray-600">  
                  <p>✨ Each signature is placed without overlapping others, creating a beautiful mosaic within the campaign text.</p>  
                  <p className="mt-1">🖱️ Scroll to explore, zoom in/out, and click on signatures to see who left them.</p>  
                </div>  
              </div>  
                
              {/* Campaign Info */}  
              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">  
                <h3 className="font-semibold text-gray-900 mb-2">About This Campaign</h3>  
                <p className="text-sm text-gray-600">  
                  This word campaign brings together community signatures to form a powerful visual statement.   
                  Each signature is a unique contribution to the collective message.  
                </p>  
                  
                <div className="mt-4 flex flex-wrap gap-2">  
                  <button 
                    onClick={shareCampaign}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"  
                  >  
                    Share Campaign  
                  </button>  
                  <button 
                    onClick={downloadImage}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"  
                  >  
                    Download Image  
                  </button>  
                  <button 
                    onClick={reportIssue}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"  
                  >  
                    Report Issue  
                  </button>  
                </div>  
              </div>  
            </div>  
          </div>  
        )}
      </main>

      {/* Community Guidelines Modal */}
      <CommunityGuidelinesModal
        isOpen={showGuidelines}  
        onClose={() => setShowGuidelines(false)}  
        onAccept={() => {  
          setGuidelinesAccepted(true);  
          setShowGuidelines(false);  
        }}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
        onLogin={() => {
          setIsAdminLoggedIn(true);
          setIsAdmin(true);
        }}
      />

     // ... (all the previous code remains the same until the style section at the end)

// Remove the entire style jsx section and replace it with this:

<style>{`
  [data-flash="1"] {  
    animation: flash 1.5s ease-in-out;  
  }  
    
  @keyframes flash {  
    0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }  
    50% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }  
    100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }  
  }  
    
  /* Custom range slider */  
  .word-campaign-board input[type="range"] {  
    -webkit-appearance: none;  
    height: 6px;  
    background: #e5e7eb;  
    border-radius: 3px;  
    outline: none;  
  }  
    
  .word-campaign-board input[type="range"]::-webkit-slider-thumb {  
    -webkit-appearance: none;  
    appearance: none;  
    width: 18px;  
    height: 18px;  
    border-radius: 50%;  
    background: #4f46e5;  
    cursor: pointer;  
    border: 2px solid white;  
    box-shadow: 0 0 0 1px #e5e7eb, 0 2px 4px rgba(0,0,0,0.1);  
  }  
    
  .word-campaign-board input[type="range"]::-moz-range-thumb {  
    width: 18px;  
    height: 18px;  
    border-radius: 50%;  
    background: #4f46e5;  
    cursor: pointer;  
    border: 2px solid white;  
    box-shadow: 0 0 0 1px #e5e7eb, 0 2px 4px rgba(0,0,0,0.1);  
  }  
`}</style>
    </div>
  );
}
