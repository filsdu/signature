import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Supabase client
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
let supabase;
try {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.error("Supabase environment variables are missing. Using fallback mode.");
  }
} catch (error) {
  console.error("Failed to initialize Supabase client:", error);
}

// Constants
const WALL_WIDTH = 5000;
const WALL_HEIGHT = 3000;
const MIN_PHOTO_SIZE = 100; // Minimum width/height in pixels
const MAX_PHOTO_SIZE = 200; // Maximum width/height in pixels
const PHOTO_MARGIN = 5; // Margin between photos

// Bad words filter for names
const BAD_WORDS = [
  "fuck", "shit", "bitch", "cunt", "dildo", "penis", "vagina",
  "porn", "rape", "slut", "whore", "asshole", "dick", "cock",
  "nigger", "nigga", "faggot", "retard", "kys"
];

// Helper functions
const containsBadWords = (text) => {
  if (!text) return false;
  const t = String(text).toLowerCase();
  return BAD_WORDS.some(word => t.includes(word));
};

// Placement Engine
const PlacementEngine = {
  // Check if two rectangles overlap
  overlaps: (a, b) => {
    return (
      a.x < b.x + b.w + PHOTO_MARGIN &&
      a.x + a.w + PHOTO_MARGIN > b.x &&
      a.y < b.y + b.h + PHOTO_MARGIN &&
      a.y + a.h + PHOTO_MARGIN > b.y
    );
  },

  // Create a grid for spatial partitioning
  createSpatialGrid: (width, height, cellSize = 150) => {
    const grid = {};

    const getCellKey = (x, y) => `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)}`;

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

  // Find placement
  findPlacement: ({ wallWidth, wallHeight, itemW, itemH, existing, maxTries = 5000 }) => {
    const w = Math.ceil(itemW);
    const h = Math.ceil(itemH);

    // Create spatial grid for existing items
    const grid = PlacementEngine.createSpatialGrid(wallWidth, wallHeight);
    existing.forEach(item => {
      grid.add(item, item.x, item.y, item.w, item.h);
    });

    // Try to find a valid position
    for (let i = 0; i < maxTries; i++) {
      const x = Math.floor(Math.random() * Math.max(1, wallWidth - w));
      const y = Math.floor(Math.random() * Math.max(1, wallHeight - h));

      const bb = { x, y, w, h };

      // Check only nearby items using spatial grid
      const nearbyItems = grid.getNearby(x, y, w, h);
      const collides = nearbyItems.some(e =>
        PlacementEngine.overlaps(bb, {
          x: e.x,
          y: e.y,
          w: e.w,
          h: e.h
        })
      );

      if (!collides) return { x, y };
    }

    return null; // No valid position found
  }
};

// Community Guidelines Modal Component
const CommunityGuidelinesModal = ({ isOpen, onClose, onAccept }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Community Guidelines</h2>

        <div className="text-sm mb-6">
          <p className="mb-3">By posting photos, you agree to our community guidelines:</p>

          <ul className="list-disc pl-5 space-y-2">
            <li>Be respectful of others</li>
            <li>No hate speech, harassment, or offensive content</li>
            <li>Respect privacy - don't share personal information without consent</li>
            <li>Content must be appropriate for all ages</li>
            <li>No spam or commercial content</li>
            <li>You must have rights to any photos you upload</li>
          </ul>

          <p className="mt-4 text-xs text-zinc-500">
            Violations may result in removal of your content and banning from the platform.
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

// Enhanced Time Lapse Modal Component
const TimeLapseModal = ({ isOpen, onClose, photos, activeCampaign }) => {
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const animationRef = useRef(null);
  const lastFrameTimeRef = useRef(0);

  // Sort photos by creation time
  const sortedPhotos = useMemo(() => {
    return [...photos].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [photos]);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = WALL_WIDTH;
    canvas.height = WALL_HEIGHT;
    const ctx = canvas.getContext('2d');

    // Draw the current frame
    const drawFrame = (frame) => {
      // Clear canvas
      ctx.clearRect(0, 0, WALL_WIDTH, WALL_HEIGHT);

      // Fill background
      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(0, 0, WALL_WIDTH, WALL_HEIGHT);

      // Draw photos up to current frame
      for (let i = 0; i < frame; i++) {
        const photo = sortedPhotos[i];
        if (!photo) continue;

        const img = new Image();
        img.onload = () => {
          ctx.save();
          ctx.drawImage(img, photo.x, photo.y, photo.w, photo.h);

          // Draw border
          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 2;
          ctx.strokeRect(photo.x, photo.y, photo.w, photo.h);

          ctx.restore();
        };
        img.src = photo.url;
      }
    };

    drawFrame(currentFrame);
  }, [isOpen, currentFrame, sortedPhotos]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const animate = (timestamp) => {
      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = timestamp;

      const elapsed = timestamp - lastFrameTimeRef.current;

      if (elapsed > (1000 / (10 * playbackSpeed))) {
        setCurrentFrame(prev => {
          if (prev >= sortedPhotos.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
        lastFrameTimeRef.current = timestamp;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, sortedPhotos.length]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setCurrentFrame(0);
    setIsPlaying(true);
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
  };

  const handleSeek = (e) => {
    const value = parseInt(e.target.value);
    setCurrentFrame(value);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full p-6">
        <h2 className="text-xl font-bold mb-4">Time Lapse: {activeCampaign?.title}</h2>

        <div className="relative mb-4">
          <canvas
            ref={canvasRef}
            className="w-full h-96 border border-gray-300"
            style={{ background: '#f9fafb' }}
          />
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
            Frame: {currentFrame} / {sortedPhotos.length}
          </div>
        </div>

        <div className="mb-4">
          <input
            type="range"
            min="0"
            max={sortedPhotos.length}
            value={currentFrame}
            onChange={handleSeek}
            className="w-full"
          />
        </div>

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={handlePlayPause}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={handleRestart}
              className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700"
            >
              Restart
            </button>
          </div>

          <div className="flex gap-2">
            <span className="self-center text-sm">Speed:</span>
            {[0.5, 1, 2, 4].map(speed => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-3 py-1 rounded ${
                  playbackSpeed === speed ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

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

// Main Photo Campaign Component
export default function PhotoCampaign() {
  // State management
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [photoSize, setPhotoSize] = useState(0.5);
  const [displayName, setDisplayName] = useState("");
  const [zoom, setZoom] = useState(0.5);
  const [isLoading, setIsLoading] = useState(true);
  const [userMessage, setUserMessage] = useState("");
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [userAction, setUserAction] = useState(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [newCampaignTitle, setNewCampaignTitle] = useState("");
  const [newCampaignDescription, setNewCampaignDescription] = useState("");
  const [showTimeLapse, setShowTimeLapse] = useState(false);
  const [moderationQueue, setModerationQueue] = useState([]);
  const [fillPercentage, setFillPercentage] = useState(0);
  const [shownPhotoId, setShownPhotoId] = useState(null);
  const [placementMode, setPlacementMode] = useState("auto");
  const [pendingManualSpot, setPendingManualSpot] = useState(null);
  const nameTimeoutRef = useRef(null);

  // Refs
  const wallScrollRef = useRef(null);
  const wallInnerRef = useRef(null);
  const fileInputRef = useRef(null);

  // User session ID
  const userId = useMemo(() => {
    let id = localStorage.getItem('photoCampaignUserId');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('photoCampaignUserId', id);
    }
    return id;
  }, []);

  // Check if user has already placed a photo
  const userHasPosted = useMemo(() => photos.some(photo => photo.owner === userId), [photos, userId]);

  // Handle photo name display
  const handlePhotoClick = (photoId) => {
    if (nameTimeoutRef.current) {
      clearTimeout(nameTimeoutRef.current);
    }
    setShownPhotoId(photoId);
    nameTimeoutRef.current = setTimeout(() => setShownPhotoId(null), 3000);
  };

  // Load campaigns
  useEffect(() => {
    const loadCampaigns = async () => {
      setIsLoading(true);
      try {
        let data = [];
        if (supabase) {
          const { data: fetchedData, error } = await supabase
            .from("photo_campaigns")
            .select("*")
            .order("created_at", { ascending: true });

          if (error) throw error;
          data = fetchedData;
        }

        if (data.length > 0) {
          setCampaigns(data);
          setActiveCampaign(data[0]);
        } else {
          // Create a fallback campaign if none exists or Supabase is unavailable
          const defaultCampaign = {
            id: 'fallback-' + crypto.randomUUID(),
            title: "Cats",
            description: "Share photos of your feline friends",
            created_at: new Date().toISOString()
          };
          setCampaigns([defaultCampaign]);
          setActiveCampaign(defaultCampaign);
          setUserMessage("Running in offline mode. Some features may be limited.");
        }
      } catch (err) {
        console.error("Error loading campaigns:", err);
        // Fallback to default campaign on error
        const defaultCampaign = {
          id: 'fallback-' + crypto.randomUUID(),
          title: "Cats",
          description: "Share photos of your feline friends",
          created_at: new Date().toISOString()
        };
        setCampaigns([defaultCampaign]);
        setActiveCampaign(defaultCampaign);
        setUserMessage("Failed to load campaigns. Using fallback mode.");
      } finally {
        setIsLoading(false);
      }
    };

    loadCampaigns();
  }, []);

  // Load photos for active campaign
  useEffect(() => {
    if (!activeCampaign) return;

    const loadPhotos = async () => {
      setIsLoading(true);
      try {
        let data = [];
        if (supabase && !activeCampaign.id.startsWith('fallback-')) {
          const { data: fetchedData, error } = await supabase
            .from("photos")
            .select("*")
            .eq("campaign_id", activeCampaign.id)
            .order("created_at", { ascending: true });

          if (error) throw error;
          data = fetchedData;
        }

        const formattedPhotos = data.map(row => ({
          id: row.id,
          url: row.url,
          x: row.x,
          y: row.y,
          w: row.w,
          h: row.h,
          owner: row.owner,
          name: row.name || '',
          created_at: row.created_at,
          needs_moderation: row.needs_moderation
        }));
        setPhotos(formattedPhotos);

        // Calculate fill percentage (approximate)
        const totalArea = WALL_WIDTH * WALL_HEIGHT;
        const photoArea = formattedPhotos.reduce((acc, photo) => acc + photo.w * photo.h, 0);
        setFillPercentage(Math.min(100, Math.round((photoArea / totalArea) * 100)));
      } catch (err) {
        console.error("Error loading photos:", err);
        setUserMessage("Unable to load photos. Displaying empty wall.");
        setPhotos([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPhotos();

    if (!supabase || activeCampaign.id.startsWith('fallback-')) return;

    // Set up realtime subscription
    const channel = supabase
      .channel(`photos:${activeCampaign.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "photos",
          filter: `campaign_id=eq.${activeCampaign.id}`
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newPhoto = {
              id: payload.new.id,
              url: payload.new.url,
              x: payload.new.x,
              y: payload.new.y,
              w: payload.new.w,
              h: payload.new.h,
              owner: payload.new.owner,
              name: payload.new.name || '',
              created_at: payload.new.created_at,
              needs_moderation: payload.new.needs_moderation
            };
            setPhotos(prev => [...prev, newPhoto]);
          } else if (payload.eventType === "DELETE") {
            setPhotos(prev => prev.filter(p => p.id !== payload.old.id));
          } else if (payload.eventType === "UPDATE") {
            setPhotos(prev =>
              prev.map(p =>
                p.id === payload.new.id
                  ? {
                      ...p,
                      url: payload.new.url,
                      x: payload.new.x,
                      y: payload.new.y,
                      w: payload.new.w,
                      h: payload.new.h,
                      name: payload.new.name || '',
                      created_at: payload.new.created_at,
                      needs_moderation: payload.new.needs_moderation
                    }
                  : p
              )
            );
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
    const file = e.target.files[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      setUserMessage("Please select an image file (JPEG, PNG, etc.)");
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUserMessage("Please select an image smaller than 5MB");
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setFilePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle photo placement
  const handlePlacePhoto = async () => {
    if (!selectedFile) {
      setUserMessage("Please select a photo first");
      return;
    }

    if (!guidelinesAccepted) {
      setShowGuidelines(true);
      return;
    }

    if (containsBadWords(displayName)) {
      setUserMessage("Please remove inappropriate words from your name.");
      return;
    }

    setUserAction('placing');
    setUserMessage("Finding the perfect spot for your photo...");

    try {
      // Calculate size based on scale
      const s = Math.max(0.3, Math.min(1.5, photoSize));
      const w = Math.max(MIN_PHOTO_SIZE, Math.min(MAX_PHOTO_SIZE, Math.round(200 * s)));
      const h = Math.max(MIN_PHOTO_SIZE, Math.min(MAX_PHOTO_SIZE, Math.round(200 * s)));

      let spot = null;

      if (placementMode === 'manual' && pendingManualSpot) {
        // Try to place at the clicked spot
        const bb = {
          x: Math.max(0, Math.min(pendingManualSpot.x - w / 2, WALL_WIDTH - w)),
          y: Math.max(0, Math.min(pendingManualSpot.y - h / 2, WALL_HEIGHT - h)),
          w,
          h
        };

        // Check if it overlaps with existing photos
        const nearbyItems = photos.map(photo => ({
          x: photo.x,
          y: photo.y,
          w: photo.w,
          h: photo.h
        }));

        const collides = nearbyItems.some(item => PlacementEngine.overlaps(bb, item));

        if (!collides) {
          spot = { x: bb.x, y: bb.y };
        } else {
          // Try to find a nearby spot
          spot = PlacementEngine.findPlacement({
            wallWidth: WALL_WIDTH,
            wallHeight: WALL_HEIGHT,
            itemW: w,
            itemH: h,
            existing: photos,
            maxTries: 1000
          });
        }
      } else {
        // Auto placement
        spot = PlacementEngine.findPlacement({
          wallWidth: WALL_WIDTH,
          wallHeight: WALL_HEIGHT,
          itemW: w,
          itemH: h,
          existing: photos,
          maxTries: 5000
        });
      }

      if (!spot) {
        setUserMessage("The wall is getting full! Try a different size.");
        setUserAction(null);
        return;
      }

      // Convert file to base64 for storage
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = async () => {
        const photoData = {
          campaign_id: activeCampaign.id,
          owner: userId,
          url: reader.result,
          x: Math.round(spot.x),
          y: Math.round(spot.y),
          w,
          h,
          name: displayName.trim().slice(0, 20),
          needs_moderation: containsBadWords(displayName),
          created_at: new Date().toISOString() // Add timestamp for fallback mode
        };

        if (supabase && !activeCampaign.id.startsWith('fallback-')) {
          const { error } = await supabase.from("photos").insert(photoData);

          if (error) throw error;
        } else {
          // Fallback: Add to local state
          setPhotos(prev => [...prev, photoData]);
        }

        setUserMessage("Your photo has been added to the campaign!");
        setSelectedFile(null);
        setFilePreview(null);
        setPendingManualSpot(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setTimeout(() => {
          locateMyPhoto(true);
        }, 500);
      };

      reader.onerror = () => {
        throw new Error("Failed to read file");
      };
    } catch (err) {
      console.error("Placement error:", err);
      setUserMessage("Something went wrong. Please try again.");
    } finally {
      setUserAction(null);
    }
  };

  // Handle photo removal
  const handleRemovePhoto = async () => {
    const userPhoto = photos.find(photo => photo.owner === userId);
    if (!userPhoto) {
      setUserMessage("You haven't posted anything in this campaign yet.");
      return;
    }

    setUserAction('erasing');
    setUserMessage("Removing your photo...");

    try {
      if (supabase && !activeCampaign.id.startsWith('fallback-')) {
        const { error } = await supabase
          .from("photos")
          .delete()
          .eq("id", userPhoto.id)
          .eq("owner", userId);

        if (error) throw error;
      }

      setPhotos(prev => prev.filter(photo => photo.id !== userPhoto.id));
      setUserMessage("Your photo has been removed.");
    } catch (err) {
      console.error("Error removing photo:", err);
      setUserMessage("Failed to remove your photo. Please try again.");
    } finally {
      setUserAction(null);
    }
  };

  // Locate user's photo with auto zoom
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
      // Calculate optimal zoom to show photo clearly
      const targetZoom = Math.min(
        1,
        (container.clientWidth - 40) / (userPhoto.w * 1.5),
        (container.clientHeight - 40) / (userPhoto.h * 1.5)
      );
      setZoom(Math.max(0.2, Math.min(2, targetZoom)));
    }

    const left = Math.max(0, Math.min(cx - container.clientWidth / (2 * zoom), WALL_WIDTH - container.clientWidth / zoom));
    const top = Math.max(0, Math.min(cy - container.clientHeight / (2 * zoom), WALL_HEIGHT - container.clientHeight / zoom));

    container.scrollTo({ left, top, behavior: "smooth" });

    // Highlight photo
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

    // Calculate bounding box of all photos
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    photos.forEach(photo => {
      minX = Math.min(minX, photo.x);
      minY = Math.min(minY, photo.y);
      maxX = Math.max(maxX, photo.x + photo.w);
      maxY = Math.max(maxY, photo.y + photo.h);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // Calculate zoom to fit content
    const zoomX = container.clientWidth / contentWidth;
    const zoomY = container.clientHeight / contentHeight;
    const targetZoom = Math.min(zoomX, zoomY, 1) * 0.9; // 90% to add padding
    setZoom(targetZoom);

    // Center scroll
    const cx = minX + contentWidth / 2;
    const cy = minY + contentHeight / 2;
    const left = Math.max(0, cx - container.clientWidth / (2 * targetZoom));
    const top = Math.max(0, cy - container.clientHeight / (2 * targetZoom));
    container.scrollTo({ left, top, behavior: "smooth" });
  };

  // Create new campaign
  const handleCreateCampaign = async () => {
    const title = newCampaignTitle.trim();
    const description = newCampaignDescription.trim();

    if (!title) return;

    try {
      let newCampaign;
      if (supabase) {
        const { data, error } = await supabase
          .from("photo_campaigns")
          .insert({ title, description })
          .select()
          .single();

        if (error) throw error;
        newCampaign = data;
      } else {
        newCampaign = {
          id: 'fallback-' + crypto.randomUUID(),
          title,
          description,
          created_at: new Date().toISOString()
        };
      }

      setCampaigns(prev => [...prev, newCampaign]);
      setActiveCampaign(newCampaign);
      setNewCampaignTitle("");
      setNewCampaignDescription("");

      setUserMessage(`New campaign "${title}" created!`);
    } catch (err) {
      console.error("Error creating campaign:", err);
      setUserMessage("Failed to create campaign. Please try again.");
    }
  };

  // Share campaign
  const shareCampaign = async () => {
    const shareData = {
      title: `Photo Campaign: ${activeCampaign.title}`,
      text: `Check out the "${activeCampaign.title}" photo campaign!`,
      url: window.location.href
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

    try {
      // First fit to full content to calculate the right view
      fitToFullContent();

      // Wait a moment for the zoom to update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create a canvas to render the entire campaign
      const canvas = document.createElement('canvas');
      canvas.width = WALL_WIDTH;
      canvas.height = WALL_HEIGHT;
      const ctx = canvas.getContext('2d');

      // Fill background
      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(0, 0, WALL_WIDTH, WALL_HEIGHT);

      // Draw all photos
      const loadImage = (url) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = url;
        });

      for (const photo of photos) {
        const img = await loadImage(photo.url);
        ctx.drawImage(img, photo.x, photo.y, photo.w, photo.h);

        // Draw border
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;
        ctx.strokeRect(photo.x, photo.y, photo.w, photo.h);
      }

      // Create download link
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `photo-campaign-${activeCampaign.title}.png`;
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
    const subject = `Issue Report: ${activeCampaign.title} Campaign`;
    const body = `Please describe the issue you're experiencing with the ${activeCampaign.title} campaign:\n\nUser ID: ${userId}`;

    window.location.href = `mailto:support@photocampaigns.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Load moderation queue for admin
  useEffect(() => {
    if (!isAdminLoggedIn || !supabase) return;

    const loadModerationQueue = async () => {
      try {
        const { data } = await supabase.from('photos').select('*').eq('needs_moderation', true);
        setModerationQueue(data || []);
      } catch (err) {
        console.error('Moderation queue error:', err);
      }
    };

    loadModerationQueue();
  }, [isAdminLoggedIn]);

  // Handle moderation (approve/reject)
  const handleModeratePhoto = async (photoId, approve) => {
    if (!supabase) return;

    try {
      if (approve) {
        await supabase.from('photos').update({ needs_moderation: false }).eq('id', photoId);
      } else {
        await supabase.from('photos').delete().eq('id', photoId);
      }
      setModerationQueue(prev => prev.filter(photo => photo.id !== photoId));

      // Also update the local state
      setPhotos(prev =>
        approve
          ? prev.map(photo => (photo.id === photoId ? { ...photo, needs_moderation: false } : photo))
          : prev.filter(photo => photo.id !== photoId)
      );
    } catch (err) {
      console.error('Moderation error:', err);
    }
  };

  // Handle wall click for manual placement
  const onWallClick = (e) => {
    if (placementMode !== 'manual') return;

    const container = wallScrollRef.current;
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    setPendingManualSpot({ x, y });
    setUserMessage('Spot selected. Click "Place Photo" to place your photo.');
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (nameTimeoutRef.current) {
        clearTimeout(nameTimeoutRef.current);
      }
    };
  }, []);

  // Render fallback UI if no active campaign
  if (!activeCampaign) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-700 mb-4">Unable to load campaign data.</p>
          <p className="text-sm text-gray-500">Please check your Supabase configuration or try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-purple-50 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-indigo-700">Photo Campaign</h1>
              <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                {activeCampaign.title}
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
                    clipRule="evenodd"
                  />
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
                      Campaign Title
                    </label>
                    <input
                      type="text"
                      value={newCampaignTitle}
                      onChange={e => setNewCampaignTitle(e.target.value)}
                      placeholder="Enter campaign title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (optional)
                    </label>
                    <textarea
                      value={newCampaignDescription}
                      onChange={e => setNewCampaignDescription(e.target.value)}
                      placeholder="Enter campaign description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      rows={3}
                    />
                  </div>

                  <button
                    onClick={handleCreateCampaign}
                    disabled={!newCampaignTitle.trim()}
                    className={`px-4 py-2 rounded-xl font-medium ${
                      newCampaignTitle.trim()
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
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
                      key={campaign.id}
                      className={`p-3 rounded-lg border flex justify-between items-center ${
                        activeCampaign.id === campaign.id ? 'bg-indigo-50 border-indigo-500' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div>
                        <span className="font-medium">"{campaign.title}"</span>
                        {campaign.description && (
                          <p className="text-xs text-gray-500 mt-1">{campaign.description}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setActiveCampaign(campaign)}
                          className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            if (!window.confirm(`Delete "${campaign.title}"? This will remove all photos!`)) return;
                            // Delete campaign and its photos
                            if (supabase && !campaign.id.startsWith('fallback-')) {
                              supabase
                                .from('photos')
                                .delete()
                                .eq('campaign_id', campaign.id)
                                .then(() => {
                                  supabase
                                    .from('photo_campaigns')
                                    .delete()
                                    .eq('id', campaign.id)
                                    .then(() => {
                                      const newCampaigns = campaigns.filter(c => c.id !== campaign.id);
                                      setCampaigns(newCampaigns);
                                      if (activeCampaign.id === campaign.id && newCampaigns.length > 0) {
                                        setActiveCampaign(newCampaigns[0]);
                                      }
                                    });
                                });
                            } else {
                              const newCampaigns = campaigns.filter(c => c.id !== campaign.id);
                              setCampaigns(newCampaigns);
                              if (activeCampaign.id === campaign.id && newCampaigns.length > 0) {
                                setActiveCampaign(newCampaigns[0]);
                              }
                            }
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

            {/* Admin Moderation Queue */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Moderation Queue</h3>
              {moderationQueue.length === 0 ? (
                <p className="text-sm text-gray-500">No photos pending moderation.</p>
              ) : (
                <div className="space-y-4">
                  {moderationQueue.map(photo => (
                    <div key={photo.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">Photo in {activeCampaign.title}</p>
                          <p className="text-sm text-gray-600">By {photo.name || 'Anonymous'}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleModeratePhoto(photo.id, true)}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleModeratePhoto(photo.id, false)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                      <div className="p-3 rounded border bg-white">
                        <img
                          src={photo.url}
                          alt="Moderation preview"
                          className="max-w-full max-h-40 object-contain mx-auto"
                        />
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
                      key={campaign.id}
                      onClick={() => setActiveCampaign(campaign)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                        activeCampaign.id === campaign.id
                          ? 'bg-indigo-100 border-indigo-500 text-indigo-700 font-medium'
                          : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                      } border`}
                    >
                      <div>
                        <span>"{campaign.title}"</span>
                        {campaign.description && (
                          <p className="text-xs text-gray-500 mt-1">{campaign.description}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  {photos.length} photos in this campaign ({fillPercentage}% filled)
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Upload Your Photo</h2>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Photo (max 5MB)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: JPEG, PNG, WebP, GIF
                  </p>
                </div>

                {filePreview && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">Preview</p>
                    <div className="border border-gray-300 rounded-lg p-2 bg-gray-50">
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="max-h-40 max-w-full object-contain mx-auto"
                      />
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Photo Size: <span className="text-indigo-600">{Math.round(photoSize * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="150"
                    value={photoSize * 100}
                    onChange={e => setPhotoSize(parseInt(e.target.value) / 100)}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Smaller</span>
                    <span>Larger</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Optional Name (shown on hover)
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value.slice(0, 20))}
                    placeholder="How you'll be identified"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{displayName.length}/20 characters</span>
                    {containsBadWords(displayName) && (
                      <span className="text-red-600">Inappropriate name</span>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Placement Mode</label>
                  <div className="flex gap-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        value="auto"
                        checked={placementMode === 'auto'}
                        onChange={() => setPlacementMode('auto')}
                        className="mr-2"
                      />
                      Auto Place
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        value="manual"
                        checked={placementMode === 'manual'}
                        onChange={() => setPlacementMode('manual')}
                        className="mr-2"
                      />
                      Click to Place
                    </label>
                  </div>
                  {placementMode === 'manual' && (
                    <p className="text-xs text-gray-500 mt-1">Click on the wall to select a spot for your photo</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Post Your Photo</h2>

                <div className="space-y-3">
                  {userHasPosted ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <p className="text-sm text-blue-700 flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1.5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        You've already posted in this campaign
                      </p>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                      <p className="text-sm text-amber-700">
                        Your photo will be permanently added to this wall
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handlePlacePhoto}
                    disabled={!selectedFile || !guidelinesAccepted || userAction}
                    className={`w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center ${
                      !selectedFile || !guidelinesAccepted || userAction
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {userAction === 'placing' ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Placing...
                      </>
                    ) : userHasPosted ? (
                      'Already Posted'
                    ) : (
                      'Place Photo'
                    )}
                  </button>

                  <button
                    onClick={handleRemovePhoto}
                    disabled={!userHasPosted || userAction}
                    className={`w-full py-2 px-4 rounded-xl font-medium transition-all flex items-center justify-center ${
                      !userHasPosted || userAction
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {userAction === 'erasing' ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Removing...
                      </>
                    ) : (
                      'Remove My Photo'
                    )}
                  </button>

                  <button
                    onClick={locateMyPhoto}
                    disabled={!userHasPosted}
                    className={`w-full py-2 px-4 rounded-xl font-medium transition-all flex items-center justify-center ${
                      !userHasPosted
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1.5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clipRule="evenodd"
                      />
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
                      I agree to the{' '}
                      <button
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
                  <div
                    className={`mt-4 p-3 rounded-lg text-sm ${
                      userMessage.toLowerCase().includes('fail') ||
                      userMessage.toLowerCase().includes('error') ||
                      userMessage.toLowerCase().includes('filled')
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-green-50 text-green-700 border border-green-200'
                    }`}
                  >
                    {userMessage}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200 mb-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">"{activeCampaign.title}"</h2>
                    {activeCampaign.description && (
                      <p className="text-sm text-gray-600 mt-1">{activeCampaign.description}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 mt-2 sm:mt-0">
                    <div className="flex items-center bg-gray-100 rounded-lg px-3 py-1.5">
                      <button
                        onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}
                        className="text-gray-600 hover:text-indigo-700 p-1"
                        aria-label="Zoom out"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"
                            clipRule="evenodd"
                          />
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
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                            clipRule="evenodd"
                          />
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
                        <svg
                          className="animate-spin h-8 w-8 text-indigo-600 mx-auto"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <p className="mt-2 text-gray-600">Loading photos...</p>
                      </div>
                    </div>
                  ) : (
                    <div
                      ref={wallScrollRef}
                      className="h-[60vh] overflow-auto relative"
                      onClick={onWallClick}
                    >
                      <div
                        ref={wallInnerRef}
                        className="relative mx-auto my-6 min-w-full min-h-full"
                        style={{
                          width: `${WALL_WIDTH}px`,
                          height: `${WALL_HEIGHT}px`,
                          backgroundSize: '24px 24px',
                          backgroundImage: 'radial-gradient(#d4d4d8 1px, transparent 1px)',
                          backgroundRepeat: 'repeat',
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
                              borderRadius: '50%',
                              border: '2px solid #3b82f6',
                              boxShadow: '0 0 0 4px rgba(59,130,246,0.2)',
                              zIndex: 1000
                            }}
                          />
                        )}

                        {photos.map(photo => (
                          <div
                            key={photo.id}
                            data-photo-id={photo.id}
                            className="absolute select-none transition-transform duration-200 hover:z-50 hover:scale-105 group"
                            style={{
                              left: `${photo.x}px`,
                              top: `${photo.y}px`,
                              width: `${photo.w}px`,
                              height: `${photo.h}px`,
                              filter: photo.needs_moderation ? 'grayscale(80%) opacity(70%)' : 'none'
                            }}
                            onClick={() => handlePhotoClick(photo.id)}
                          >
                            {photo.name && (
                              <div
                                className={`absolute -top-8 left-1/2 -translate-x-1/2 text-xs px-2 py-1 rounded bg-gray-900 text-white whitespace-nowrap transition-opacity duration-200 ${
                                  shownPhotoId === photo.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                } z-50`}
                              >
                                {photo.name}
                                {photo.needs_moderation && ' (Under Review)'}
                              </div>
                            )}

                            <img
                              src={photo.url}
                              alt="User submission"
                              className="w-full h-full object-cover border border-gray-300"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 text-sm text-gray-600">
                  <p>✨ Each photo is placed without overlapping others, creating a beautiful mosaic.</p>
                  <p className="mt-1">🖱️ Scroll to explore, zoom in/out, and click on photos to see who posted them.</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">About This Campaign</h3>
                <p className="text-sm text-gray-600">
                  {activeCampaign.description ||
                    'This photo campaign brings together community images to form a visual tapestry. Each photo is a unique contribution to the collective story.'}
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
                    onClick={() => setShowTimeLapse(true)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    View Time Lapse
                  </button>
                  <button
                    onClick={reportIssue}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Report Issue
                  </button>
                  <button
                    onClick={fitToFullContent}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
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
          appearance: none;
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
