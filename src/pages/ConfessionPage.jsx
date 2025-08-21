import React, { useEffect, useRef, useState, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

// Supabase client
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Constants
const WALL_WIDTH = 5000;
const WALL_HEIGHT = 3000;
const MIN_CONFESSION_WIDTH = 100;
const MAX_CONFESSION_WIDTH = 200;
const MIN_CONFESSION_HEIGHT = 50;
const MAX_CONFESSION_HEIGHT = 100;
const MAX_CONFESSION_LENGTH = 200;

// Bad words filter
const BAD_WORDS = [
  "fuck", "shit", "bitch", "cunt", "dildo", "penis", "vagina", 
  "porn", "rape", "slut", "whore", "asshole", "damn", "piss", 
  "cock", "dick", "bastard"
];
const containsBadWords = (text) => {
  if (!text) return false;
  const t = String(text).toLowerCase();
  return BAD_WORDS.some(word => t.includes(word));
};

// Confession Input Component
const ConfessionInput = ({ 
  value, 
  onChange, 
  color = '#111827', 
  shape = 'rounded', 
  onShapeChange, 
  scale = 0.5, 
  onScaleChange, 
  rotation = 0, 
  onRotationChange 
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Your Confession (max {MAX_CONFESSION_LENGTH} characters)
        </label>
        <textarea
          value={value}
          onChange={e => onChange(e.target.value.slice(0, MAX_CONFESSION_LENGTH))}
          placeholder="Share your confession..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-28"
          style={{ color }}
        />
        {containsBadWords(value) && (
          <p className="text-xs text-red-600 mt-1">Please remove inappropriate words.</p>
        )}
        <p className="text-xs text-gray-500 mt-1">{value.length}/{MAX_CONFESSION_LENGTH} characters</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Shape
          </label>
          <select
            value={shape}
            onChange={e => onShapeChange(e.target.value)}
            className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="rounded">Rounded Rectangle</option>
            <option value="square">Square</option>
            <option value="circle">Circle</option>
            <option value="hexagon">Hexagon</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Size: <span className="text-indigo-600">{Math.round(scale * 100)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={scale * 100}
            onChange={e => onScaleChange(parseInt(e.target.value) / 100)}
            className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer"
          />
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
          onChange={e => onRotationChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer"
        />
      </div>
    </div>
  );
};

// Community Guidelines Modal
const CommunityGuidelinesModal = ({ isOpen, onClose, onAccept }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Community Guidelines</h2>
        <div className="text-sm mb-6">
          <p className="mb-3">By posting your confession, you agree to our guidelines:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Be respectful and kind</li>
            <li>No obscene or offensive content</li>
            <li>No personal attacks or hate speech</li>
            <li>Keep confessions appropriate for all audiences</li>
          </ul>
          <p className="mt-4 text-xs text-zinc-500">
            Violations may result in removal of your confession.
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

// Admin Login Modal
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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

// Time Lapse Modal
const TimeLapseModal = ({ isOpen, onClose, confessions, activeCampaign }) => {
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentFrame, setCurrentFrame] = useState(0);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = WALL_WIDTH / 4;
    canvas.height = WALL_HEIGHT / 4;
    const ctx = canvas.getContext('2d');

    const sortedConfessions = [...confessions].sort((a, b) => a.created_at - b.created_at);

    const drawFrame = (frame) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(0.25, 0.25);

      for (let i = 0; i <= frame; i++) {
        const conf = sortedConfessions[i];
        ctx.save();
        ctx.translate(conf.x + conf.w / 2, conf.y + conf.h / 2);
        ctx.rotate(conf.rot);
        ctx.fillStyle = conf.color;
        ctx.beginPath();
        if (conf.shape === 'circle') {
          ctx.arc(0, 0, conf.w / 2, 0, Math.PI * 2);
        } else if (conf.shape === 'hexagon') {
          const r = conf.w / 2;
          ctx.moveTo(r, 0);
          for (let i = 1; i < 6; i++) {
            ctx.lineTo(r * Math.cos((i * 60 * Math.PI) / 180), r * Math.sin((i * 60 * Math.PI) / 180));
          }
          ctx.closePath();
        } else {
          ctx.rect(-conf.w / 2, -conf.h / 2, conf.w, conf.h);
        }
        ctx.fill();
        ctx.fillStyle = conf.shape === 'circle' || conf.shape === 'hexagon' ? '#ffffff' : '#f9fafb';
        ctx.fillStyle = conf.color === '#ffffff' ? '#000000' : '#ffffff';
        ctx.font = `${Math.min(conf.w, conf.h) * 0.3}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lines = conf.text.match(/.{1,20}/g) || [conf.text];
        lines.forEach((line, idx) => {
          ctx.fillText(line, 0, idx * (conf.h / (lines.length + 1)) - conf.h / 2 + conf.h / (lines.length + 1));
        });
        ctx.restore();
      }

      ctx.restore();
    };

    drawFrame(currentFrame);

    const playAnimation = () => {
      if (currentFrame >= sortedConfessions.length - 1) {
        setIsPlaying(false);
        return;
      }
      setCurrentFrame(prev => prev + 1);
      animationRef.current = setTimeout(playAnimation, 1000 / speed);
    };

    if (isPlaying) {
      playAnimation();
    }

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isOpen, isPlaying, currentFrame, speed, confessions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full p-6">
        <h2 className="text-xl font-bold mb-4">Time Lapse: {activeCampaign}</h2>
        <canvas ref={canvasRef} className="w-full h-96 border border-gray-300" />
        <div className="mt-4 space-y-2">
          <input 
            type="range"
            min="0"
            max={confessions.length - 1}
            value={currentFrame}
            onChange={(e) => setCurrentFrame(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between">
            <button 
              onClick={() => setSpeed(s => Math.max(0.5, s - 0.5))}
              className="px-2 py-1 bg-gray-200 rounded"
            >
              Slower
            </button>
            <span>Speed: {speed}x</span>
            <button 
              onClick={() => setSpeed(s => Math.min(5, s + 0.5))}
              className="px-2 py-1 bg-gray-200 rounded"
            >
              Faster
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-200 hover:bg-zinc-300"
          >
            Close
          </button>
        </div>
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
    const buffer = 4;
    return a.x < b.x + b.w + buffer &&
           a.x + a.w + buffer > b.x &&
           a.y < b.y + b.h + buffer &&
           a.y + a.h + buffer > b.y;
  },

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

  placeWithRetries: ({ wallW, wallH, itemW, itemH, rot, existing, tries = 5000, margin = 4 }) => {
    const { rw, rh } = PlacementEngine.rotatedBounds(itemW + margin, itemH + margin, rot);
    const grid = PlacementEngine.createSpatialGrid(wallW, wallH);
    existing.forEach(item => {
      const bounds = PlacementEngine.rotatedBounds(item.w, item.h, item.rot);
      grid.add(item, item.x, item.y, bounds.rw, bounds.rh);
    });

    for (let i = 0; i < tries; i++) {
      const x = Math.floor(Math.random() * Math.max(1, wallW - rw));
      const y = Math.floor(Math.random() * Math.max(1, wallH - rh));
      const bb = { x, y, w: rw, h: rh };
      const nearbyItems = grid.getNearby(x, y, rw, rh);
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

// Main Confession Board Component
export default function ConfessionBoard() {
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [confessions, setConfessions] = useState([]);
  const [confessionText, setConfessionText] = useState("");
  const [penColor, setPenColor] = useState("#111827");
  const [shape, setShape] = useState("rounded");
  const [scale, setScale] = useState(0.5);
  const [rotation, setRotation] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [placementMode, setPlacementMode] = useState("auto");
  const [pendingManualSpot, setPendingManualSpot] = useState(null);
  const [zoom, setZoom] = useState(0.5);
  const [isLoading, setIsLoading] = useState(true);
  const [userMessage, setUserMessage] = useState("");
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [newCampaignText, setNewCampaignText] = useState("");
  const [showTimeLapse, setShowTimeLapse] = useState(false);
  const [moderationQueue, setModerationQueue] = useState([]);
  const [fillPercentage, setFillPercentage] = useState(0);
  const nameTimeoutRef = useRef(null);
  const wallScrollRef = useRef(null);
  const wallInnerRef = useRef(null);

  const userId = useMemo(() => {
    let id = localStorage.getItem('confessionShardsUserId');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('confessionShardsUserId', id);
    }
    return id;
  }, []);

  const userHasConfessed = useMemo(() => 
    confessions.some(conf => conf.owner === userId),
    [confessions, userId]
  );

  // Load campaigns
  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        const savedCampaigns = JSON.parse(localStorage.getItem('confessionShardsCampaigns') || '[]');
        if (savedCampaigns.length > 0) {
          setCampaigns(savedCampaigns);
          setActiveCampaign(savedCampaigns[0]);
        } else {
          const defaultCampaigns = ["CONFESSIONS", "CRUSHES", "MEMORIES"];
          setCampaigns(defaultCampaigns);
          setActiveCampaign(defaultCampaigns[0]);
          localStorage.setItem('confessionShardsCampaigns', JSON.stringify(defaultCampaigns));
        }
      } catch (err) {
        console.error("Error loading campaigns:", err);
        setUserMessage("Failed to load campaigns. Please refresh.");
      }
    };
    loadCampaigns();
  }, []);

  // Load confessions
  useEffect(() => {
    if (!activeCampaign) return;
    const loadConfessions = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("confessions")
          .select("*")
          .eq("campaign", activeCampaign)
          .order("created_at", { ascending: true });
        if (error) throw error;
        const formattedConfessions = data.map(row => ({
          id: row.id,
          text: row.text,
          x: row.x,
          y: row.y,
          w: row.w,
          h: row.h,
          rot: (row.rot_deg || 0) * Math.PI / 180,
          shape: row.shape || 'rounded',
          owner: row.owner,
          name: row.name || '',
          color: row.color || '#111827',
          showName: false,
          created_at: row.created_at
        }));
        setConfessions(formattedConfessions);
        const totalArea = WALL_WIDTH * WALL_HEIGHT;
        const confArea = formattedConfessions.reduce((acc, conf) => acc + conf.w * conf.h, 0);
        setFillPercentage(Math.min(100, Math.round((confArea / totalArea) * 100 * 2)));
      } catch (err) {
        console.error("Error loading confessions:", err);
        setUserMessage("Unable to load confessions. Please refresh.");
      } finally {
        setIsLoading(false);
      }
    };
    loadConfessions();
    const channel = supabase
      .channel(`confessions:${activeCampaign}`)
      .on("postgres_changes", 
        { 
          event: "*", 
          schema: "public", 
          table: "confessions", 
          filter: `campaign=eq.${activeCampaign}` 
        }, 
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newConf = {
              id: payload.new.id,
              text: payload.new.text,
              x: payload.new.x,
              y: payload.new.y,
              w: payload.new.w,
              h: payload.new.h,
              rot: (payload.new.rot_deg || 0) * Math.PI / 180,
              shape: payload.new.shape || 'rounded',
              owner: payload.new.owner,
              name: payload.new.name || '',
              color: payload.new.color || '#111827',
              showName: false,
              created_at: payload.new.created_at
            };
            setConfessions(prev => [...prev, newConf]);
          } else if (payload.eventType === "DELETE") {
            setConfessions(prev => prev.filter(p => p.id !== payload.old.id));
          } else if (payload.eventType === "UPDATE") {
            setConfessions(prev => prev.map(p => 
              p.id === payload.new.id ? {
                ...p,
                text: payload.new.text,
                x: payload.new.x,
                y: payload.new.y,
                w: payload.new.w,
                h: payload.new.h,
                rot: (payload.new.rot_deg || 0) * Math.PI / 180,
                shape: payload.new.shape,
                name: payload.new.name || '',
                color: payload.new.color || '#111827',
                created_at: payload.new.created_at
              } : p
            ));
          }
        }
      )
      .subscribe((status, err) => {
        if (err) console.error("Subscription error:", err);
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCampaign]);

  // Load moderation queue for admin
  useEffect(() => {
    if (!isAdminLoggedIn) return;
    const loadModerationQueue = async () => {
      try {
        const { data } = await supabase
          .from('confessions')
          .select('*')
          .eq('needs_moderation', true);
        setModerationQueue(data || []);
      } catch (err) {
        console.error('Moderation queue error:', err);
      }
    };
    loadModerationQueue();
  }, [isAdminLoggedIn]);

  // Handle confession placement
  const handlePlaceConfession = async () => {
    if (!guidelinesAccepted) {
      setShowGuidelines(true);
      return;
    }
    if (!confessionText.trim()) {
      setUserMessage("Please write a confession first.");
      return;
    }
    if (containsBadWords(confessionText) || containsBadWords(displayName)) {
      setUserMessage("Please remove inappropriate words.");
      return;
    }
    if (confessionText.length > MAX_CONFESSION_LENGTH) {
      setUserMessage(`Keep it under ${MAX_CONFESSION_LENGTH} characters.`);
      return;
    }

    setUserMessage("Placing your confession...");
    const baseW = Math.min(600, 200 + confessionText.length * 2.5);
    const baseH = 100 + Math.ceil(confessionText.length / 25) * 25;
    const s = Math.max(0.3, Math.min(1.0, scale));
    const w = Math.round(Math.max(MIN_CONFESSION_WIDTH, Math.min(MAX_CONFESSION_WIDTH, baseW * s)));
    const h = Math.round(Math.max(MIN_CONFESSION_HEIGHT, Math.min(MAX_CONFESSION_HEIGHT, baseH * s)));
    const rotDeg = Math.round(rotation + (Math.random() * 10 - 5));
    const rot = rotDeg * Math.PI / 180;

    let spot = null;
    if (placementMode === 'manual' && pendingManualSpot) {
      const trySpot = (x, y) => {
        const { rw, rh } = PlacementEngine.rotatedBounds(w, h, rot);
        const bb = { 
          x: Math.max(0, Math.min(x, WALL_WIDTH - rw)), 
          y: Math.max(0, Math.min(y, WALL_HEIGHT - rh)), 
          w: rw, 
          h: rh 
        };
        const collides = confessions.some(e => {
          const eBounds = PlacementEngine.rotatedBounds(e.w, e.h, e.rot);
          return PlacementEngine.overlaps(bb, { 
            x: e.x, 
            y: e.y, 
            w: eBounds.rw, 
            h: eBounds.rh 
          });
        });
        return collides ? null : { x: bb.x, y: bb.y };
      };
      spot = trySpot(pendingManualSpot.x, pendingManualSpot.y);
      if (!spot) {
        for (let r = 10; r < 300 && !spot; r += 20) {
          const angle = Math.random() * Math.PI * 2;
          spot = trySpot(pendingManualSpot.x + Math.cos(angle) * r, pendingManualSpot.y + Math.sin(angle) * r);
        }
      }
    }
    if (!spot) {
      spot = PlacementEngine.placeWithRetries({ 
        wallW: WALL_WIDTH, 
        wallH: WALL_HEIGHT, 
        itemW: w, 
        itemH: h, 
        rot, 
        existing: confessions 
      });
    }
    if (!spot) {
      setUserMessage("No space available. Try a different size or rotation.");
      return;
    }

    const confessionData = {
      campaign: activeCampaign,
      owner: userId,
      text: confessionText.trim(),
      shape,
      x: Math.round(spot.x),
      y: Math.round(spot.y),
      w, h,
      rot_deg: rotDeg,
      name: displayName.trim().slice(0, 20),
      color: penColor,
      needs_moderation: containsBadWords(confessionText) || containsBadWords(displayName)
    };

    try {
      const { error } = await supabase
        .from("confessions")
        .insert(confessionData);
      if (error) throw error;
      setUserMessage("Confession posted successfully!");
      setConfessionText("");
      setDisplayName("");
      setPendingManualSpot(null);
      setGuidelinesAccepted(false);
      setTimeout(() => locateMyConfession(true), 500);
    } catch (err) {
      console.error("Placement error:", err);
      setUserMessage("Failed to post confession. Please try again.");
    }
  };

  // Handle confession removal
  const handleRemoveConfession = async () => {
    if (!window.confirm("Are you sure you want to remove your confession?")) return;
    const userConf = confessions.find(conf => conf.owner === userId);
    if (!userConf) {
      setUserMessage("You haven't posted a confession in this campaign.");
      return;
    }
    try {
      const { error } = await supabase
        .from("confessions")
        .delete()
        .eq("id", userConf.id)
        .eq("owner", userId);
      if (error) throw error;
      setUserMessage("Your confession has been removed.");
    } catch (err) {
      console.error("Error removing confession:", err);
      setUserMessage("Failed to remove confession. Please try again.");
    }
  };

  // Locate user's confession
  const locateMyConfession = (autoZoom = false) => {
    const userConf = confessions.find(conf => conf.owner === userId);
    if (!userConf || !wallScrollRef.current) {
      setUserMessage("No confession found.");
      return;
    }
    const container = wallScrollRef.current;
    const { rw, rh } = PlacementEngine.rotatedBounds(userConf.w, userConf.h, userConf.rot);
    const cx = userConf.x + rw / 2;
    const cy = userConf.y + rh / 2;

    if (autoZoom) {
      setZoom(1.5);
    }

    const left = Math.max(0, Math.min(
      cx - container.clientWidth / (2 * zoom),
      WALL_WIDTH - container.clientWidth / zoom
    ));
    const top = Math.max(0, Math.min(
      cy - container.clientHeight / (2 * zoom),
      WALL_HEIGHT - container.clientHeight / zoom
    ));
    container.scrollTo({ left, top, behavior: "smooth" });

    const el = wallInnerRef.current?.querySelector(`[data-cid="${userConf.id}"]`);
    if (el) {
      el.setAttribute('data-flash', '1');
      setTimeout(() => el.removeAttribute('data-flash'), 1500);
    }
  };

  // Fit to full content
  const fitToFullContent = () => {
    if (!wallScrollRef.current || confessions.length === 0) return;
    const container = wallScrollRef.current;
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    confessions.forEach(conf => {
      const { rw, rh } = PlacementEngine.rotatedBounds(conf.w, conf.h, conf.rot);
      minX = Math.min(minX, conf.x);
      minY = Math.min(minY, conf.y);
      maxX = Math.max(maxX, conf.x + rw);
      maxY = Math.max(maxY, conf.y + rh);
    });
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const zoomX = container.clientWidth / contentWidth;
    const zoomY = container.clientHeight / contentHeight;
    const targetZoom = Math.min(zoomX, zoomY) * 0.9;
    setZoom(targetZoom);
    const cx = minX + contentWidth / 2;
    const cy = minY + contentHeight / 2;
    const left = Math.max(0, cx - container.clientWidth / (2 * targetZoom));
    const top = Math.max(0, cy - container.clientHeight / (2 * targetZoom));
    container.scrollTo({ left, top, behavior: "smooth" });
  };

  // Create new campaign
  const handleCreateCampaign = () => {
    const trimmed = newCampaignText.trim().toUpperCase();
    if (!trimmed || campaigns.includes(trimmed)) {
      setUserMessage("Campaign name is invalid or already exists.");
      return;
    }
    const newCampaigns = [...campaigns, trimmed];
    setCampaigns(newCampaigns);
    setActiveCampaign(trimmed);
    setNewCampaignText("");
    localStorage.setItem('confessionShardsCampaigns', JSON.stringify(newCampaigns));
  };

  // Share campaign
  const shareCampaign = async () => {
    const shareData = {
      title: `Confession Shards Campaign: ${activeCampaign}`,
      text: `Join the ${activeCampaign} campaign on Confession Shards!`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setUserMessage("Campaign link copied to clipboard!");
      }
    } catch (err) {
      console.error("Share error:", err);
      setUserMessage("Failed to share. Please copy the URL manually.");
    }
  };

  // Download campaign image
  const downloadImage = async () => {
    setUserMessage("Preparing your download...");
    fitToFullContent();
    try {
      const canvas = document.createElement('canvas');
      canvas.width = WALL_WIDTH;
      canvas.height = WALL_HEIGHT;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(0, 0, WALL_WIDTH, WALL_HEIGHT);
      for (const conf of confessions) {
        ctx.save();
        ctx.translate(conf.x + conf.w / 2, conf.y + conf.h / 2);
        ctx.rotate(conf.rot);
        ctx.fillStyle = conf.color;
        ctx.beginPath();
        if (conf.shape === 'circle') {
          ctx.arc(0, 0, conf.w / 2, 0, Math.PI * 2);
        } else if (conf.shape === 'hexagon') {
          const r = conf.w / 2;
          ctx.moveTo(r, 0);
          for (let i = 1; i < 6; i++) {
            ctx.lineTo(r * Math.cos((i * 60 * Math.PI) / 180), r * Math.sin((i * 60 * Math.PI) / 180));
          }
          ctx.closePath();
        } else {
          ctx.rect(-conf.w / 2, -conf.h / 2, conf.w, conf.h);
        }
        ctx.fill();
        ctx.fillStyle = conf.shape === 'circle' || conf.shape === 'hexagon' ? '#ffffff' : '#f9fafb';
        ctx.fillStyle = conf.color === '#ffffff' ? '#000000' : '#ffffff';
        ctx.font = `${Math.min(conf.w, conf.h) * 0.3}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lines = conf.text.match(/.{1,20}/g) || [conf.text];
        lines.forEach((line, idx) => {
          ctx.fillText(line, 0, idx * (conf.h / (lines.length + 1)) - conf.h / 2 + conf.h / (lines.length + 1));
        });
        ctx.restore();
      }
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `confession-shards-${activeCampaign}.png`;
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
    const body = `Please describe the issue you're experiencing with the ${activeCampaign} campaign:\n\nUser ID: ${userId}`;
    window.location.href = `mailto:support@confessionshards.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Handle moderation
  const handleModerateConfession = async (confId, approve) => {
    try {
      if (approve) {
        await supabase.from('confessions').update({ needs_moderation: false }).eq('id', confId);
      } else {
        await supabase.from('confessions').delete().eq('id', confId);
      }
      setModerationQueue(prev => prev.filter(conf => conf.id !== confId));
    } catch (err) {
      console.error('Moderation error:', err);
    }
  };

  // Handle wall click for manual placement
  const handleWallClick = (e) => {
    if (placementMode !== 'manual') return;
    const rect = wallInnerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    setPendingManualSpot({ x, y });
    setUserMessage('Spot selected. Click "Post to Wall" to place your confession.');
  };

  const colorPalette = [
    '#111827', '#b91c1c', '#1d4ed8', '#0f766e', '#ca8a04', '#86198f',
    '#dc2626', '#2563eb', '#059669', '#d97706', '#7e22ce', '#ffffff'
  ];

  if (!activeCampaign) {
    return <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-purple-50 text-gray-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-indigo-700">Confession Shards</h1>
              <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                Campaign Board
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
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold mb-6">Campaign Management</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Create New Campaign</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Campaign Name
                    </label>
                    <input
                      type="text"
                      value={newCampaignText}
                      onChange={e => setNewCampaignText(e.target.value)}
                      placeholder="e.g., CRUSHES, MEMORIES"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
                            if (!window.confirm(`Delete "${campaign}"? This will remove all confessions!`)) return;
                            const newCampaigns = campaigns.filter(c => c !== campaign);
                            setCampaigns(newCampaigns);
                            if (activeCampaign === campaign && newCampaigns.length > 0) {
                              setActiveCampaign(newCampaigns[0]);
                            }
                            localStorage.setItem('confessionShardsCampaigns', JSON.stringify(newCampaigns));
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
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Moderation Queue</h3>
              {moderationQueue.length === 0 ? (
                <p className="text-sm text-gray-500">No confessions pending moderation.</p>
              ) : (
                <div className="space-y-4">
                  {moderationQueue.map(conf => (
                    <div key={conf.id} className="p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-medium">Confession in {conf.campaign}</p>
                        <p className="text-sm text-gray-600">{conf.text.slice(0, 50)}...</p>
                        <p className="text-sm text-gray-600">By {conf.name || 'Anonymous'}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleModerateConfession(conf.id, true)}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleModerateConfession(conf.id, false)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
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
                  {confessions.length} confessions in this campaign ({fillPercentage}% filled)
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Write Your Confession</h2>
                <ConfessionInput
                  value={confessionText}
                  onChange={setConfessionText}
                  color={penColor}
                  shape={shape}
                  onShapeChange={setShape}
                  scale={scale}
                  onScaleChange={setScale}
                  rotation={rotation}
                  onRotationChange={setRotation}
                />
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Text Color</p>
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
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name (optional)
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value.slice(0, 20))}
                    placeholder="How you'll be identified"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {displayName.length}/20 characters
                  </p>
                  {containsBadWords(displayName) && (
                    <p className="text-xs text-red-600 mt-1">Please choose a different name.</p>
                  )}
                </div>
                <div className="mt-4 flex gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input 
                      type="radio" 
                      name="pmode" 
                      value="auto" 
                      checked={placementMode === 'auto'} 
                      onChange={() => setPlacementMode('auto')} 
                    />
                    Auto Place
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input 
                      type="radio" 
                      name="pmode" 
                      value="manual" 
                      checked={placementMode === 'manual'} 
                      onChange={() => setPlacementMode('manual')} 
                    />
                    Click to Place
                  </label>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Post Your Confession</h2>
                {userHasConfessed ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-blue-700 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      You've already posted a confession
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-amber-700">
                      Your confession will be permanently added to this artwork
                    </p>
                  </div>
                )}
                <div className="space-y-3">
                  <button
                    onClick={handlePlaceConfession}
                    disabled={!confessionText.trim() || userHasConfessed}
                    className={`w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center ${
                      confessionText.trim() && !userHasConfessed
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Post to Wall
                  </button>
                  <button
                    onClick={handleRemoveConfession}
                    disabled={!userHasConfessed}
                    className={`w-full py-2 px-4 rounded-xl font-medium transition-all flex items-center justify-center ${
                      userHasConfessed
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Remove My Confession
                  </button>
                  <button
                    onClick={() => locateMyConfession()}
                    disabled={!userHasConfessed}
                    className={`w-full py-2 px-4 rounded-xl font-medium transition-all flex items-center justify-center ${
                      userHasConfessed
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    Find My Confession
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
                    userMessage.toLowerCase().includes('fail') || userMessage.toLowerCase().includes('error') || userMessage.toLowerCase().includes('space')
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}>
                    {userMessage}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200 mb-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-2 sm:mb-0">
                    "{activeCampaign}"
                  </h2>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center bg-gray-100 rounded-lg px-3 py-1.5">
                      <button
                        onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}
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
                        onClick={() => setZoom(z => Math.min(3, z + 0.1))}
                        className="text-gray-600 hover:text-indigo-700 p-1"
                        aria-label="Zoom in"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-sm text-gray-500 bg-gray-100 rounded-lg px-3 py-1.5">
                      {confessions.length} confessions
                    </div>
                  </div>
                </div>
                <div className="relative bg-gray-100 rounded-lg overflow-hidden border border-gray-300">
                  {isLoading ? (
                    <div className="h-[60vh] flex items-center justify-center">
                      <div className="text-center">
                        <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="mt-2 text-gray-600">Loading confessions...</p>
                      </div>
                    </div>
                  ) : (
                    <div
                      ref={wallScrollRef}
                      className="h-[60vh] overflow-auto relative"
                    >
                      <div
                        ref={wallInnerRef}
                        onClick={handleWallClick}
                        className="relative mx-auto my-6 min-w-full min-h-full"
                        style={{
                          width: `${WALL_WIDTH}px`,
                          height: `${WALL_HEIGHT}px`,
                          backgroundSize: '24px 24px',
                          backgroundImage: 'radial-gradient(#d4d4d8 1px, transparent 1px)',
                          transform: `scale(${zoom})`,
                          transformOrigin: 'center center'
                        }}
                      >
                        {placementMode === 'manual' && pendingManualSpot && (
                          <div
                            className="absolute pointer-events-none"
                            style={{
                              left: pendingManualSpot.x - 8,
                              top: pendingManualSpot.y - 8,
                              width: 16,
                              height: 16,
                              borderRadius: 9999,
                              border: '2px solid #3b82f6',
                              boxShadow: '0 0 0 4px rgba(59,130,246,0.2)'
                            }}
                          />
                        )}
                        {confessions.map(conf => (
                          <div
                            key={conf.id}
                            data-cid={conf.id}
                            className="absolute select-none group transition-transform duration-200 hover:z-50 hover:scale-110"
                            style={{
                              left: conf.x,
                              top: conf.y,
                              width: conf.w,
                              height: conf.h,
                              transform: `rotate(${(conf.rot * 180 / Math.PI).toFixed(2)}deg)`,
                              transformOrigin: 'center'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (nameTimeoutRef.current) clearTimeout(nameTimeoutRef.current);
                              setConfessions(prev => prev.map(c => c.id === conf.id ? { ...c, showName: true } : { ...c, showName: false }));
                              nameTimeoutRef.current = setTimeout(() => {
                                setConfessions(prev => prev.map(c => c.id === conf.id ? { ...c, showName: false } : c));
                              }, 3000);
                            }}
                          >
                            {conf.name && (
                              <div
                                className={`absolute -top-8 left-1/2 -translate-x-1/2 text-xs px-2 py-1 rounded bg-gray-900 text-white whitespace-nowrap transition-opacity duration-200 ${
                                  conf.showName ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                } z-50`}
                              >
                                {conf.name}
                              </div>
                            )}
                            <div
                              className="w-full h-full flex items-center justify-center text-center px-3 py-2 text-sm"
                              style={{
                                backgroundColor: conf.color,
                                border: conf.shape === 'circle' || conf.shape === 'hexagon' ? 'none' : '1px solid rgba(0,0,0,0.1)',
                                borderRadius: conf.shape === 'circle' ? '50%' : conf.shape === 'rounded' ? '16px' : conf.shape === 'hexagon' ? '0' : '0',
                                clipPath: conf.shape === 'hexagon' ? 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' : 'none',
                                color: conf.color === '#ffffff' ? '#000000' : '#ffffff',
                                wordBreak: 'break-word'
                              }}
                            >
                              {conf.text}
                            </div>
                          </div>
                        ))}
                        {confessions.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center text-neutral-500 text-sm">
                              The wall is empty. Post the first confession →
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  <p>✨ Each confession is placed without overlapping, creating a chaotic yet beautiful mosaic.</p>
                  <p className="mt-1">🖱️ Scroll to explore, zoom in/out, and click confessions to see names.</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">About This Campaign</h3>
                <p className="text-sm text-gray-600">
                  This campaign creates a vibrant tapestry of shared confessions, each uniquely styled to form a collective artwork.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={shareCampaign} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                    Share Campaign
                  </button>
                  <button onClick={downloadImage} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                    Download Image
                  </button>
                  <button onClick={() => setShowTimeLapse(true)} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                    View Time Lapse
                  </button>
                  <button onClick={reportIssue} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                    Report Issue
                  </button>
                  <button onClick={fitToFullContent} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                    View Full Campaign
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <CommunityGuidelinesModal
        isOpen={showGuidelines}
        onClose={() => setShowGuidelines(false)}
        onAccept={() => {
          setGuidelinesAccepted(true);
          setShowGuidelines(false);
        }}
      />

      <AdminLoginModal
        isOpen={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
        onLogin={() => setIsAdminLoggedIn(true)}
      />

      <TimeLapseModal
        isOpen={showTimeLapse}
        onClose={() => setShowTimeLapse(false)}
        confessions={confessions}
        activeCampaign={activeCampaign}
      />

      <style>{`
        [data-flash="1"] {
          animation: flash 1.5s ease-in-out;
        }
        @keyframes flash {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
          50% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        input[type="range"] {
          -webkit-appearance: none;
          height: 6px;
          background: #e5e7eb;
          border-radius: 3px;
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #4f46e5;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 0 0 1px #e5e7eb, 0 2px 4px rgba(0,0,0,0.1);
        }
        input[type="range"]::-moz-range-thumb {
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
