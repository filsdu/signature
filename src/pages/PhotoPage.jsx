import React, { useEffect, useRef, useState, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

// Supabase client
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Constants
const WALL_WIDTH = 5000;
const WALL_HEIGHT = 3000;
const BASE_PHOTO_SIZE = 200;
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.2;
const MAX_NAME_LENGTH = 20;
const MAX_FILE_SIZE_MB = 5;
const SUPPORTED_FORMATS = ['image/png', 'image/jpeg', 'image/webp'];

// Placement Engine
const PlacementEngine = {
  overlaps: (a, b) => {
    const buffer = 1; // Allow touching with minimal buffer
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

  autoPlaceGrid: ({ wallW, wallH, itemW, itemH, existing, margin = 1, maxTries = 5000 }) => {
    const grid = PlacementEngine.createSpatialGrid(wallW, wallH);
    existing.forEach(item => {
      grid.add(item, item.x, item.y, item.w, item.h);
    });

    const stepX = itemW + margin;
    const stepY = itemH + margin;
    const maxCols = Math.max(1, Math.floor(wallW / stepX));
    const maxRows = Math.max(1, Math.floor(wallH / stepY));
    const startCol = Math.floor(Math.random() * maxCols);
    const startRow = Math.floor(Math.random() * maxRows);

    for (let r = 0; r < maxRows; r++) {
      for (let c = 0; c < maxCols; c++) {
        const col = (startCol + c) % maxCols;
        const row = (startRow + r) % maxRows;
        const x = Math.round(col * stepX);
        const y = Math.round(row * stepY);
        const bb = { x, y, w: itemW, h: itemH };
        const nearbyItems = grid.getNearby(x, y, itemW, itemH);
        const collide = nearbyItems.some(e => PlacementEngine.overlaps(bb, { x: e.x, y: e.y, w: e.w, h: e.h }));
        if (!collide) return { x, y };
      }
    }
    return null;
  }
};

// Photo Input Component
const PhotoInput = ({ 
  fileDataUrl, 
  onFileSelect, 
  scale, 
  onScaleChange, 
  name, 
  onNameChange 
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Upload Photo
        </label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onFileSelect}
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
        />
        <p className="text-xs text-gray-500 mt-1">
          PNG, JPG, or WebP, max {MAX_FILE_SIZE_MB}MB
        </p>
      </div>

      {fileDataUrl && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preview
          </label>
          <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
            <img 
              src={fileDataUrl} 
              alt="preview" 
              className="w-full max-h-64 object-contain"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Size: <span className="text-indigo-600">{Math.round(scale * 100)}%</span>
        </label>
        <input
          type="range"
          min={MIN_SCALE * 100}
          max={MAX_SCALE * 100}
          value={scale * 100}
          onChange={e => onScaleChange(parseInt(e.target.value) / 100)}
          className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Optional Name (shown on hover)
        </label>
        <input
          type="text"
          value={name}
          onChange={e => onNameChange(e.target.value.slice(0, MAX_NAME_LENGTH))}
          placeholder="e.g., Alex"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          {name.length}/{MAX_NAME_LENGTH} characters
        </p>
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
          <p className="mb-3">By uploading your photo, you agree to our guidelines:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Upload appropriate, non-offensive images</li>
            <li>No explicit or inappropriate content</li>
            <li>Respect others' privacy</li>
            <li>Only upload photos you have permission to share</li>
          </ul>
          <p className="mt-4 text-xs text-gray-500">
            Violations may result in removal of your photo.
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
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
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
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
const TimeLapseModal = ({ isOpen, onClose, photos, activeCampaign }) => {
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

    const sortedPhotos = [...photos].sort((a, b) => a.created_at - b.created_at);
    const images = new Map();

    const loadImage = (url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = url;
      });
    };

    const drawFrame = async (frame) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(0.25, 0.25);

      for (let i = 0; i <= frame; i++) {
        const photo = sortedPhotos[i];
        let img = images.get(photo.url);
        if (!img) {
          img = await loadImage(photo.url);
          images.set(photo.url, img);
        }
        ctx.drawImage(img, photo.x, photo.y, photo.w, photo.h);
      }

      ctx.restore();
    };

    drawFrame(currentFrame);

    const playAnimation = () => {
      if (currentFrame >= sortedPhotos.length - 1) {
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
  }, [isOpen, isPlaying, currentFrame, speed, photos]);

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
            max={photos.length - 1}
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
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Photo Board Component
export default function PhotoBoard() {
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [fileDataUrl, setFileDataUrl] = useState(null);
  const [origSize, setOrigSize] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);
  const [name, setName] = useState("");
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
  const [fillPercentage, setFillPercentage] = useState(0);
  const nameTimeoutRef = useRef(null);
  const wallScrollRef = useRef(null);
  const wallInnerRef = useRef(null);

  const userId = useMemo(() => {
    let id = localStorage.getItem('photoShardsUserId');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('photoShardsUserId', id);
    }
    return id;
  }, []);

  const userHasPosted = useMemo(() => 
    photos.some(photo => photo.owner === userId),
    [photos, userId]
  );

  // Load campaigns
  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        const savedCampaigns = JSON.parse(localStorage.getItem('photoShardsCampaigns') || '[]');
        if (savedCampaigns.length > 0) {
          setCampaigns(savedCampaigns);
          setActiveCampaign(savedCampaigns[0]);
        } else {
          const defaultCampaigns = ["CATS", "DOGS", "MEMORIES"];
          setCampaigns(defaultCampaigns);
          setActiveCampaign(defaultCampaigns[0]);
          localStorage.setItem('photoShardsCampaigns', JSON.stringify(defaultCampaigns));
        }
      } catch (err) {
        console.error("Error loading campaigns:", err);
        setUserMessage("Failed to load campaigns. Please refresh.");
      }
    };
    loadCampaigns();
  }, []);

  // Load photos
  useEffect(() => {
    if (!activeCampaign) return;
    const loadPhotos = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("photos")
          .select("*")
          .eq("campaign", activeCampaign)
          .order("created_at", { ascending: true });
        if (error) throw error;
        const formattedPhotos = data.map(row => ({
          id: row.id,
          x: row.x,
          y: row.y,
          w: row.w,
          h: row.h,
          url: row.url,
          owner: row.owner,
          name: row.name || '',
          showName: false,
          created_at: row.created_at
        }));
        setPhotos(formattedPhotos);
        const totalArea = WALL_WIDTH * WALL_HEIGHT;
        const photoArea = formattedPhotos.reduce((acc, photo) => acc + photo.w * photo.h, 0);
        setFillPercentage(Math.min(100, Math.round((photoArea / totalArea) * 100 * 2)));
      } catch (err) {
        console.error("Error loading photos:", err);
        setUserMessage("Unable to load photos. Please try again or contact support.");
      } finally {
        setIsLoading(false);
      }
    };
    loadPhotos();
    const channel = supabase
      .channel(`photos:${activeCampaign}`)
      .on("postgres_changes", 
        { 
          event: "*", 
          schema: "public", 
          table: "photos", 
          filter: `campaign=eq.${activeCampaign}` 
        }, 
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newPhoto = {
              id: payload.new.id,
              x: payload.new.x,
              y: payload.new.y,
              w: payload.new.w,
              h: payload.new.h,
              url: payload.new.url,
              owner: payload.new.owner,
              name: payload.new.name || '',
              showName: false,
              created_at: payload.new.created_at
            };
            setPhotos(prev => [...prev, newPhoto]);
          } else if (payload.eventType === "DELETE") {
            setPhotos(prev => prev.filter(p => p.id !== payload.old.id));
          } else if (payload.eventType === "UPDATE") {
            setPhotos(prev => prev.map(p => 
              p.id === payload.new.id ? {
                ...p,
                x: payload.new.x,
                y: payload.new.y,
                w: payload.new.w,
                h: payload.new.h,
                url: payload.new.url,
                name: payload.new.name || '',
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

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!SUPPORTED_FORMATS.includes(file.type)) {
      setUserMessage("Please upload a PNG, JPG, or WebP image.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setUserMessage(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
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
    reader.readAsDataURL(file);
  };

  // Handle photo placement
  const handlePlacePhoto = async () => {
    if (!guidelinesAccepted) {
      setShowGuidelines(true);
      return;
    }
    if (!fileDataUrl) {
      setUserMessage("Please upload a photo first.");
      return;
    }
    if (userHasPosted) {
      setUserMessage("You've already posted a photo in this campaign.");
      return;
    }

    setUserMessage("Placing your photo...");
    const maxDim = Math.max(origSize.w, origSize.h);
    const ratio = maxDim > 0 ? Math.min(1, BASE_PHOTO_SIZE / maxDim) : 1;
    const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale)) * ratio;
    const w = Math.round(Math.max(80, Math.min(300, origSize.w * s)));
    const h = Math.round(Math.max(80, Math.min(300, origSize.h * s)));

    let spot = null;
    if (placementMode === 'manual' && pendingManualSpot) {
      const trySpot = (x, y) => {
        const bb = { 
          x: Math.max(0, Math.min(x, WALL_WIDTH - w)), 
          y: Math.max(0, Math.min(y, WALL_HEIGHT - h)), 
          w, 
          h 
        };
        const collide = photos.some(e => PlacementEngine.overlaps(bb, { x: e.x, y: e.y, w: e.w, h: e.h }));
        return collide ? null : { x: bb.x, y: bb.y };
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
      spot = PlacementEngine.autoPlaceGrid({ 
        wallW: WALL_WIDTH, 
        wallH: WALL_HEIGHT, 
        itemW: w, 
        itemH: h, 
        existing: photos 
      });
    }
    if (!spot) {
      setUserMessage("No space available. Try a smaller size.");
      return;
    }

    const photoData = {
      campaign: activeCampaign,
      owner: userId,
      x: Math.round(spot.x),
      y: Math.round(spot.y),
      w, h,
      url: fileDataUrl,
      name: name.trim().slice(0, MAX_NAME_LENGTH)
    };

    try {
      const { error } = await supabase
        .from("photos")
        .insert(photoData);
      if (error) throw error;
      setUserMessage("Photo posted successfully!");
      setFileDataUrl(null);
      setName("");
      setPendingManualSpot(null);
      setGuidelinesAccepted(false);
      setTimeout(() => locateMyPhoto(true), 500);
    } catch (err) {
      console.error("Placement error:", err);
      setUserMessage("Failed to post photo. Please try again.");
    }
  };

  // Handle photo removal
  const handleRemovePhoto = async () => {
    if (!window.confirm("Are you sure you want to remove your photo?")) return;
    const userPhoto = photos.find(photo => photo.owner === userId);
    if (!userPhoto) {
      setUserMessage("You haven't posted a photo in this campaign.");
      return;
    }
    try {
      const { error } = await supabase
        .from("photos")
        .delete()
        .eq("id", userPhoto.id)
        .eq("owner", userId);
      if (error) throw error;
      setUserMessage("Your photo has been removed.");
    } catch (err) {
      console.error("Error removing photo:", err);
      setUserMessage("Failed to remove photo. Please try again.");
    }
  };

  // Locate user's photo
  const locateMyPhoto = (autoZoom = false) => {
    const userPhoto = photos.find(photo => photo.owner === userId);
    if (!userPhoto || !wallScrollRef.current) {
      setUserMessage("No photo found.");
      return;
    }
    const container = wallScrollRef.current;
    const cx = userPhoto.x + userPhoto.w / 2;
    const cy = userPhoto.y + userPhoto.h / 2;

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

    const el = wallInnerRef.current?.querySelector(`[data-photo-id="${userPhoto.id}"]`);
    if (el) {
      el.setAttribute('data-flash', '1');
      setTimeout(() => el.removeAttribute('data-flash'), 1500);
    }
  };

  // Fit to full content
  const fitToFullContent = () => {
    if (!wallScrollRef.current || photos.length === 0) return;
    const container = wallScrollRef.current;
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    photos.forEach(photo => {
      minX = Math.min(minX, photo.x);
      minY = Math.min(minY, photo.y);
      maxX = Math.max(maxX, photo.x + photo.w);
      maxY = Math.max(maxY, photo.y + photo.h);
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
    localStorage.setItem('photoShardsCampaigns', JSON.stringify(newCampaigns));
  };

  // Share campaign
  const shareCampaign = async () => {
    const shareData = {
      title: `Photo Shards Campaign: ${activeCampaign}`,
      text: `Join the ${activeCampaign} campaign on Photo Shards!`,
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

      for (const photo of photos) {
        const img = new Image();
        img.src = photo.url;
        await new Promise(resolve => {
          img.onload = resolve;
        });
        ctx.drawImage(img, photo.x, photo.y, photo.w, photo.h);
      }

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `photo-shards-${activeCampaign}.png`;
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
    window.location.href = `mailto:support@photoshards.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Handle wall click for manual placement
  const handleWallClick = (e) => {
    if (placementMode !== 'manual') return;
    const rect = wallInnerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    setPendingManualSpot({ x, y });
    setUserMessage('Spot selected. Click "Place Photo" to place your photo.');
  };

  if (!activeCampaign) {
    return <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-purple-50 text-gray-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-indigo-700">Photo Shards</h1>
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
                      placeholder="e.g., CATS, DOGS, MEMORIES"
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
                            if (!window.confirm(`Delete "${campaign}"? This will remove all photos!`)) return;
                            const newCampaigns = campaigns.filter(c => c !== campaign);
                            setCampaigns(newCampaigns);
                            if (activeCampaign === campaign && newCampaigns.length > 0) {
                              setActiveCampaign(newCampaigns[0]);
                            }
                            localStorage.setItem('photoShardsCampaigns', JSON.stringify(newCampaigns));
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
                  {photos.length} photos in this campaign ({fillPercentage}% filled)
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Upload Your Photo</h2>
                <PhotoInput
                  fileDataUrl={fileDataUrl}
                  onFileSelect={handleFileSelect}
                  scale={scale}
                  onScaleChange={setScale}
                  name={name}
                  onNameChange={setName}
                />
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
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Post Your Photo</h2>
                {userHasPosted ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-blue-700 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      You've already posted a photo
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-amber-700">
                      Your photo will be permanently added to this artwork
                    </p>
                  </div>
                )}
                <div className="space-y-3">
                  <button
                    onClick={handlePlacePhoto}
                    disabled={!fileDataUrl || userHasPosted}
                    className={`w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center ${
                      fileDataUrl && !userHasPosted
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Place Photo
                  </button>
                  <button
                    onClick={handleRemovePhoto}
                    disabled={!userHasPosted}
                    className={`w-full py-2 px-4 rounded-xl font-medium transition-all flex items-center justify-center ${
                      userHasPosted
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Remove My Photo
                  </button>
                  <button
                    onClick={() => locateMyPhoto()}
                    disabled={!userHasPosted}
                    className={`w-full py-2 px-4 rounded-xl font-medium transition-all flex items-center justify-center ${
                      userHasPosted
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    Find My Photo
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
                      {photos.length} photos
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
                        <p className="mt-2 text-gray-600">Loading photos...</p>
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
                        {photos.map(photo => (
                          <div
                            key={photo.id}
                            data-photo-id={photo.id}
                            className="absolute select-none group transition-transform duration-200 hover:z-50 hover:scale-110"
                            style={{
                              left: photo.x,
                              top: photo.y,
                              width: photo.w,
                              height: photo.h
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (nameTimeoutRef.current) clearTimeout(nameTimeoutRef.current);
                              setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, showName: true } : { ...p, showName: false }));
                              nameTimeoutRef.current = setTimeout(() => {
                                setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, showName: false } : p));
                              }, 3000);
                            }}
                          >
                            {photo.name && (
                              <div
                                className={`absolute -top-8 left-1/2 -translate-x-1/2 text-xs px-2 py-1 rounded bg-gray-900 text-white whitespace-nowrap transition-opacity duration-200 ${
                                  photo.showName ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                } z-50`}
                              >
                                {photo.name}
                              </div>
                            )}
                            <img
                              src={photo.url}
                              alt="photo"
                              className="w-full h-full object-cover rounded-lg border border-gray-200"
                              draggable={false}
                            />
                          </div>
                        ))}
                        {photos.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center text-gray-500 text-sm">
                              The wall is empty. Add the first photo →
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  <p>✨ Each photo is placed without overlapping, creating a beautiful mosaic.</p>
                  <p className="mt-1">🖱️ Scroll to explore, zoom in/out, and click photos to see names.</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">About This Campaign</h3>
                <p className="text-sm text-gray-600">
                  This campaign creates a vibrant mosaic of shared photos, each uniquely sized to form a collective artwork.
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
        photos={photos}
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
