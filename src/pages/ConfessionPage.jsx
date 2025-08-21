<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confession Wall</title>
  <script src="https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.development.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.development.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7.22.9/Babel.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    import React, { useEffect, useMemo, useRef, useState } from "react";
    import { createClient } from "@supabase/supabase-js";

    // Supabase client
    const SUPABASE_URL = 'YOUR_SUPABASE_URL';
    const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Constants
    const WALL_WIDTH = 5000;
    const WALL_HEIGHT = 3000;
    const MIN_CONFESSION_WIDTH = 150;
    const MAX_CONFESSION_WIDTH = 300;
    const MIN_CONFESSION_HEIGHT = 100;
    const MAX_CONFESSION_HEIGHT = 200;

    // Bad words filter
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
      rotatedBounds: (w, h, rotRad) => {
        const cos = Math.cos(rotRad);
        const sin = Math.sin(rotRad);
        const rw = Math.abs(w * cos) + Math.abs(h * sin);
        const rh = Math.abs(w * sin) + Math.abs(h * cos);
        return { rw, rh };
      },

      overlaps: (a, b) => {
        const buffer = 5;
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

      findPlacement: ({ wallWidth, wallHeight, itemW, itemH, rotRad, existing, maxTries = 5000 }) => {
        const { rw, rh } = PlacementEngine.rotatedBounds(itemW, itemH, rotRad);
        const w = Math.ceil(rw);
        const h = Math.ceil(rh);
        const grid = PlacementEngine.createSpatialGrid(wallWidth, wallHeight);
        existing.forEach(item => {
          const bounds = PlacementEngine.rotatedBounds(item.w, item.h, item.rot);
          grid.add(item, item.x, item.y, bounds.rw, bounds.rh);
        });
        for (let i = 0; i < maxTries; i++) {
          const x = Math.floor(Math.random() * Math.max(1, wallWidth - w));
          const y = Math.floor(Math.random() * Math.max(1, wallHeight - h));
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

    const CommunityGuidelinesModal = ({ isOpen, onClose, onAccept }) => {
      if (!isOpen) return null;
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Community Guidelines</h2>
            <div className="text-sm mb-6">
              <p className="mb-3">By posting content, you agree to our community guidelines:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Be respectful of others</li>
                <li>No hate speech, harassment, or offensive content</li>
                <li>No personal attacks or bullying</li>
                <li>Respect privacy - don't share personal information</li>
                <li>Content must be appropriate for all ages</li>
                <li>No spam or commercial content</li>
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

    const TimeLapseModal = ({ isOpen, onClose, confessions, activeCampaign }) => {
      const canvasRef = useRef(null);
      const [isPlaying, setIsPlaying] = useState(false);
      const [currentFrame, setCurrentFrame] = useState(0);
      const [playbackSpeed, setPlaybackSpeed] = useState(1);
      const animationRef = useRef(null);
      const lastFrameTimeRef = useRef(0);
      const sortedConfessions = useMemo(() => {
        return [...confessions].sort((a, b) => 
          new Date(a.created_at) - new Date(b.created_at)
        );
      }, [confessions]);
      useEffect(() => {
        if (!isOpen || !canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.width = WALL_WIDTH;
        canvas.height = WALL_HEIGHT;
        const ctx = canvas.getContext('2d');
        const drawFrame = (frame) => {
          ctx.clearRect(0, 0, WALL_WIDTH, WALL_HEIGHT);
          ctx.fillStyle = '#f9fafb';
          ctx.fillRect(0, 0, WALL_WIDTH, WALL_HEIGHT);
          for (let i = 0; i < frame; i++) {
            const conf = sortedConfessions[i];
            if (!conf) continue;
            ctx.save();
            ctx.translate(conf.x + conf.w / 2, conf.y + conf.h / 2);
            ctx.rotate(conf.rot);
            ctx.fillStyle = conf.bg_color || '#ffffff';
            if (conf.shape === 'circle') {
              ctx.beginPath();
              ctx.arc(0, 0, Math.min(conf.w, conf.h) / 2, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = conf.border_color || '#e5e7eb';
              ctx.lineWidth = 2;
              ctx.stroke();
            } else {
              const borderRadius = conf.shape === 'rounded' ? 16 : 0;
              ctx.beginPath();
              ctx.roundRect(-conf.w / 2, -conf.h / 2, conf.w, conf.h, borderRadius);
              ctx.fill();
              ctx.strokeStyle = conf.border_color || '#e5e7eb';
              ctx.lineWidth = 2;
              ctx.stroke();
            }
            ctx.fillStyle = conf.color || '#000000';
            ctx.font = `${conf.font_size || 14}px ${conf.font_family || 'Arial'}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const words = conf.text.split(' ');
            const lines = [];
            let currentLine = words[0];
            for (let i = 1; i < words.length; i++) {
              const testLine = currentLine + ' ' + words[i];
              const metrics = ctx.measureText(testLine);
              if (metrics.width > conf.w * 0.8) {
                lines.push(currentLine);
                currentLine = words[i];
              } else {
                currentLine = testLine;
              }
            }
            lines.push(currentLine);
            const lineHeight = conf.font_size * 1.2 || 16.8;
            for (let i = 0; i < lines.length; i++) {
              ctx.fillText(
                lines[i], 
                0, 
                -((lines.length - 1) * lineHeight) / 2 + i * lineHeight
              );
            }
            ctx.restore();
          }
        };
        drawFrame(currentFrame);
      }, [isOpen, currentFrame, sortedConfessions]);
      useEffect(() => {
        if (!isPlaying) return;
        const animate = (timestamp) => {
          if (!lastFrameTimeRef.current) lastFrameTimeRef.current = timestamp;
          const elapsed = timestamp - lastFrameTimeRef.current;
          if (elapsed > (1000 / (10 * playbackSpeed))) {
            setCurrentFrame(prev => {
              if (prev >= sortedConfessions.length) {
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
      }, [isPlaying, playbackSpeed, sortedConfessions.length]);
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
                Frame: {currentFrame} / {sortedConfessions.length}
              </div>
            </div>
            <div className="mb-4">
              <input
                type="range"
                min="0"
                max={sortedConfessions.length}
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
                    className={`px-3 py-1 rounded ${playbackSpeed === speed ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'}`}
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

    function CampaignBoard() {
      const [activeCampaign, setActiveCampaign] = useState(null);
      const [campaigns, setCampaigns] = useState([]);
      const [confessions, setConfessions] = useState([]);
      const [confessionText, setConfessionText] = useState("");
      const [textColor, setTextColor] = useState("#000000");
      const [bgColor, setBgColor] = useState("#ffffff");
      const [borderColor, setBorderColor] = useState("#e5e7eb");
      const [shape, setShape] = useState("rounded");
      const [fontFamily, setFontFamily] = useState("Arial");
      const [fontSize, setFontSize] = useState(16);
      const [confessionSize, setConfessionSize] = useState(0.5);
      const [rotation, setRotation] = useState(0);
      const [displayName, setDisplayName] = useState("");
      const [zoom, setZoom] = useState(0.5);
      const [isLoading, setIsLoading] = useState(false);
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
      const [shownConfessionId, setShownConfessionId] = useState(null);
      const [placementMode, setPlacementMode] = useState("auto");
      const [pendingManualSpot, setPendingManualSpot] = useState(null);
      const nameTimeoutRef = useRef(null);
      const wallScrollRef = useRef(null);
      const wallInnerRef = useRef(null);
      const userId = useMemo(() => {
        let id = localStorage.getItem('campaignUserId');
        if (!id) {
          id = crypto.randomUUID();
          localStorage.setItem('campaignUserId', id);
        }
        return id;
      }, []);
      const userHasPosted = useMemo(() => 
        confessions.some(conf => conf.owner === userId),
        [confessions, userId]
      );
      const handleConfessionClick = (confId) => {
        if (nameTimeoutRef.current) {
          clearTimeout(nameTimeoutRef.current);
        }
        setShownConfessionId(confId);
        nameTimeoutRef.current = setTimeout(() => setShownConfessionId(null), 3000);
      };
      useEffect(() => {
        const loadCampaigns = async () => {
          try {
            const { data, error } = await supabase  
              .from("campaigns")  
              .select("*")  
              .order("created_at", { ascending: true });
            if (error) throw error;
            if (data.length > 0) {  
              setCampaigns(data);  
              setActiveCampaign(data[0]);  
            } else {  
              const defaultCampaign = {
                title: "Confessions",
                description: "Share your thoughts and secrets anonymously"
              };
              const { data: newCampaign, error: insertError } = await supabase
                .from("campaigns")
                .insert(defaultCampaign)
                .select()
                .single();
              if (insertError) throw insertError;
              setCampaigns([newCampaign]);  
              setActiveCampaign(newCampaign);  
            }
          } catch (err) {
            console.error("Error loading campaigns:", err);
            setUserMessage("Failed to load campaigns. Please refresh.");
          }
        };
        loadCampaigns();
      }, []);
      useEffect(() => {
        if (!activeCampaign) return;
        const loadConfessions = async () => {
          try {
            const { data, error } = await supabase  
              .from("confessions")  
              .select("*")  
              .eq("campaign_id", activeCampaign.id)  
              .order("created_at", { ascending: true });  
            if (error) throw error;
            const formattedConfessions = data.map(row => ({  
              id: row.id,  
              text: row.text,
              color: row.color,
              bg_color: row.bg_color,
              border_color: row.border_color,
              shape: row.shape,
              font_family: row.font_family,
              font_size: row.font_size,
              x: row.x,  
              y: row.y,  
              w: row.w,  
              h: row.h,  
              rot: (row.rot_deg || 0) * Math.PI / 180,  
              owner: row.owner,  
              name: row.name || '',  
              created_at: row.created_at,
              needs_moderation: row.needs_moderation
            }));  
            setConfessions(formattedConfessions);  
            const totalArea = WALL_WIDTH * WALL_HEIGHT;
            const confArea = formattedConfessions.reduce((acc, conf) => acc + conf.w * conf.h, 0);
            setFillPercentage(Math.min(100, Math.round((confArea / totalArea) * 100)));
          } catch (err) {
            console.error("Error loading confessions:", err);  
            setUserMessage("Unable to load confessions. Please refresh the page.");  
          }
        };
        loadConfessions();
        const channel = supabase
          .channel(`confessions:${activeCampaign.id}`)
          .on("postgres_changes", 
            { 
              event: "*", 
              schema: "public", 
              table: "confessions", 
              filter: `campaign_id=eq.${activeCampaign.id}` 
            }, 
            (payload) => {  
              if (payload.eventType === "INSERT") {  
                const newConf = {  
                  id: payload.new.id,  
                  text: payload.new.text,
                  color: payload.new.color,
                  bg_color: payload.new.bg_color,
                  border_color: payload.new.border_color,
                  shape: payload.new.shape,
                  font_family: payload.new.font_family,
                  font_size: payload.new.font_size,
                  x: payload.new.x,  
                  y: payload.new.y,  
                  w: payload.new.w,  
                  h: payload.new.h,  
                  rot: (payload.new.rot_deg || 0) * Math.PI / 180,  
                  owner: payload.new.owner,  
                  name: payload.new.name || '',  
                  created_at: payload.new.created_at,
                  needs_moderation: payload.new.needs_moderation
                };  
                setConfessions(prev => [...prev, newConf]);  
              } else if (payload.eventType === "DELETE") {  
                setConfessions(prev => prev.filter(p => p.id !== payload.old.id));  
              } else if (payload.eventType === "UPDATE") {  
                setConfessions(prev => prev.map(p =>   
                  p.id === payload.new.id ? {  
                    ...p,  
                    text: payload.new.text,
                    color: payload.new.color,
                    bg_color: payload.new.bg_color,
                    border_color: payload.new.border_color,
                    shape: payload.new.shape,
                    font_family: payload.new.font_family,
                    font_size: payload.new.font_size,
                    x: payload.new.x,  
                    y: payload.new.y,  
                    w: payload.new.w,  
                    h: payload.new.h,  
                    rot: (payload.new.rot_deg || 0) * Math.PI / 180,  
                    name: payload.new.name || '',
                    created_at: payload.new.created_at,
                    needs_moderation: payload.new.needs_moderation
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
      const handlePlaceConfession = async () => {
        if (!confessionText.trim()) {
          setUserMessage("Please write something first");
          return;
        }
        if (!guidelinesAccepted) {
          setShowGuidelines(true);
          return;
        }
        if (containsBadWords(confessionText) || containsBadWords(displayName)) {
          setUserMessage("Please remove inappropriate words.");
          return;
        }
        setUserAction('placing');
        setUserMessage("Finding the perfect spot for your confession...");
        try {
          const baseWidth = Math.max(
            MIN_CONFESSION_WIDTH, 
            Math.min(MAX_CONFESSION_WIDTH, confessionText.length * 8)
          );
          const baseHeight = Math.max(
            MIN_CONFESSION_HEIGHT, 
            Math.min(MAX_CONFESSION_HEIGHT, 80 + Math.ceil(confessionText.length / 20) * 20)
          );
          const s = Math.max(0.3, Math.min(1.5, confessionSize));
          const w = Math.round(baseWidth * s);
          const h = Math.round(baseHeight * s);
          const rotDeg = Math.round(rotation);
          const rotRad = (rotDeg * Math.PI) / 180;
          let spot = null;
          if (placementMode === 'manual' && pendingManualSpot) {
            const { rw, rh } = PlacementEngine.rotatedBounds(w, h, rotRad);
            const bb = { 
              x: Math.max(0, Math.min(pendingManualSpot.x - rw/2, WALL_WIDTH - rw)), 
              y: Math.max(0, Math.min(pendingManualSpot.y - rh/2, WALL_HEIGHT - rh)), 
              w: rw, 
              h: rh 
            };
            const nearbyItems = confessions.map(conf => {
              const bounds = PlacementEngine.rotatedBounds(conf.w, conf.h, conf.rot);
              return { x: conf.x, y: conf.y, w: bounds.rw, h: bounds.rh };
            });
            const collides = nearbyItems.some(item => PlacementEngine.overlaps(bb, item));
            if (!collides) {
              spot = { x: bb.x, y: bb.y };
            } else {
              spot = PlacementEngine.findPlacement({
                wallWidth: WALL_WIDTH,
                wallHeight: WALL_HEIGHT,
                itemW: w,
                itemH: h,
                rotRad,
                existing: confessions,
                maxTries: 1000
              });
            }
          } else {
            spot = PlacementEngine.findPlacement({
              wallWidth: WALL_WIDTH,
              wallHeight: WALL_HEIGHT,
              itemW: w,
              itemH: h,
              rotRad,
              existing: confessions,
              maxTries: 5000
            });
          }
          if (!spot) {  
            setUserMessage("The wall is getting full! Try a different size or rotation.");  
            setUserAction(null);  
            return;  
          }
          const confessionData = {  
            campaign_id: activeCampaign.id,  
            owner: userId,  
            text: confessionText.trim(),  
            color: textColor,
            bg_color: bgColor,
            border_color: borderColor,
            shape: shape,
            font_family: fontFamily,
            font_size: fontSize,
            x: Math.round(spot.x),  
            y: Math.round(spot.y),  
            w, h,  
            rot_deg: rotDeg,  
            name: displayName.trim().slice(0, 20),
            needs_moderation: containsBadWords(confessionText)
          };
          const { error } = await supabase  
            .from("confessions")  
            .insert(confessionData);
          if (error) throw error;
          setUserMessage("Your confession has been added to the campaign!");  
          setConfessionText("");  
          setPendingManualSpot(null);
          setTimeout(() => {
            locateMyConfession(true);
          }, 500);  
        } catch (err) {  
          console.error("Placement error:", err);  
          setUserMessage("Something went wrong. Please try again.");  
        } finally {  
          setUserAction(null);  
        }
      };
      const handleRemoveConfession = async () => {
        const userConf = confessions.find(conf => conf.owner === userId);
        if (!userConf) {
          setUserMessage("You haven't posted anything in this campaign yet.");
          return;
        }
        setUserAction('erasing');
        setUserMessage("Removing your confession...");
        try {
          const { error } = await supabase
            .from("confessions")  
            .delete()  
            .eq("id", userConf.id)
            .eq("owner", userId);
          if (error) throw error;
          setConfessions(prev => prev.filter(conf => conf.id !== userConf.id));
          setUserMessage("Your confession has been removed.");  
        } catch (err) {
          console.error("Error removing confession:", err);  
          setUserMessage("Failed to remove your confession. Please try again.");  
        } finally {
          setUserAction(null);
        }
      };
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
          const targetZoom = Math.min(
            1,
            (container.clientWidth - 40) / (rw * 1.5),
            (container.clientHeight - 40) / (rh * 1.5)
          );
          setZoom(Math.max(0.2, Math.min(2, targetZoom)));
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
        const el = wallInnerRef.current?.querySelector(`[data-conf-id="${userConf.id}"]`);
        if (el) {
          el.setAttribute('data-flash', '1');
          setTimeout(() => el.removeAttribute('data-flash'), 1500);
        }
      };
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
        const targetZoom = Math.min(zoomX, zoomY, 1) * 0.9;
        setZoom(targetZoom);
        const cx = minX + contentWidth / 2;
        const cy = minY + contentHeight / 2;
        const left = Math.max(0, cx - container.clientWidth / (2 * targetZoom));
        const top = Math.max(0, cy - container.clientHeight / (2 * targetZoom));
        container.scrollTo({ left, top, behavior: "smooth" });
      };
      const handleCreateCampaign = async () => {
        const title = newCampaignTitle.trim();
        const description = newCampaignDescription.trim();
        if (!title) return;
        try {
          const { data, error } = await supabase
            .from("campaigns")
            .insert({ title, description })
            .select()
            .single();
          if (error) throw error;
          setCampaigns(prev => [...prev, data]);
          setActiveCampaign(data);
          setNewCampaignTitle("");
          setNewCampaignDescription("");
          setUserMessage(`New campaign "${title}" created!`);
        } catch (err) {
          console.error("Error creating campaign:", err);
          setUserMessage("Failed to create campaign. Please try again.");
        }
      };
      const shareCampaign = async () => {
        const shareData = {
          title: `Campaign: ${activeCampaign.title}`,
          text: `Check out the "${activeCampaign.title}" campaign!`,
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
      const downloadImage = async () => {
        setUserMessage("Preparing your download...");
        try {
          fitToFullContent();
          await new Promise(resolve => setTimeout(resolve, 100));
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
            ctx.fillStyle = conf.bg_color || '#ffffff';
            if (conf.shape === 'circle') {
              ctx.beginPath();
              ctx.arc(0, 0, Math.min(conf.w, conf.h) / 2, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = conf.border_color || '#e5e7eb';
              ctx.lineWidth = 2;
              ctx.stroke();
            } else {
              const borderRadius = conf.shape === 'rounded' ? 16 : 0;
              ctx.beginPath();
              ctx.roundRect(-conf.w / 2, -conf.h / 2, conf.w, conf.h, borderRadius);
              ctx.fill();
              ctx.strokeStyle = conf.border_color || '#e5e7eb';
              ctx.lineWidth = 2;
              ctx.stroke();
            }
            ctx.fillStyle = conf.color || '#000000';
            ctx.font = `${conf.font_size || 14}px ${conf.font_family || 'Arial'}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const words = conf.text.split(' ');
            const lines = [];
            let currentLine = words[0];
            for (let i = 1; i < words.length; i++) {
              const testLine = currentLine + ' ' + words[i];
              const metrics = ctx.measureText(testLine);
              if (metrics.width > conf.w * 0.8) {
                lines.push(currentLine);
                currentLine = words[i];
              } else {
                currentLine = testLine;
              }
            }
            lines.push(currentLine);
            const lineHeight = conf.font_size * 1.2 || 16.8;
            for (let i = 0; i < lines.length; i++) {
              ctx.fillText(
                lines[i], 
                0, 
                -((lines.length - 1) * lineHeight) / 2 + i * lineHeight
              );
            }
            ctx.restore();
          }
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `campaign-${activeCampaign.title}.png`;
          link.href = dataUrl;
          link.click();
          setUserMessage("Image downloaded successfully!");
        } catch (err) {
          console.error("Error generating image:", err);
          setUserMessage("Failed to generate image. Please try again.");
        }
      };
      const reportIssue = () => {
        const subject = `Issue Report: ${activeCampaign.title} Campaign`;
        const body = `Please describe the issue you're experiencing with the ${activeCampaign.title} campaign:\n\nUser ID: ${userId}`;
        window.location.href = `mailto:support@campaigns.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      };
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
      const handleModerateConfession = async (confId, approve) => {
        try {
          if (approve) {
            await supabase.from('confessions').update({ needs_moderation: false }).eq('id', confId);
          } else {
            await supabase.from('confessions').delete().eq('id', confId);
          }
          setModerationQueue(prev => prev.filter(conf => conf.id !== confId));
          setConfessions(prev => approve 
            ? prev.map(conf => conf.id === confId ? { ...conf, needs_moderation: false } : conf)
            : prev.filter(conf => conf.id !== confId)
          );
        } catch (err) {
          console.error('Moderation error:', err);
        }
      };
      const onWallClick = (e) => {
        if (placementMode !== 'manual') return;
        const container = wallScrollRef.current;
        const rect = container.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;
        setPendingManualSpot({ x, y });
        setUserMessage('Spot selected. Click "Post to Wall" to place your confession.');
      };
      useEffect(() => {
        return () => {
          if (nameTimeoutRef.current) {
            clearTimeout(nameTimeoutRef.current);
          }
        };
      }, []);
      const textColors = [
        '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
        '#00ffff', '#ff00ff', '#ff9500', '#5856d6', '#007aff', '#34c759'
      ];
      const bgColors = [
        '#ffffff', '#000000', '#ffd1dc', '#fffacd', '#e6e6fa', '#f0fff0', 
        '#ffe4e1', '#f5f5f5', '#e0ffff', '#ffffe0', '#f8f8ff', '#f5f5dc'
      ];
      const borderColors = [
        '#e5e7eb', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ff9500', 
        '#5856d6', '#007aff', '#34c759', '#af52de', '#ff3b30', '#ffcc00'
      ];
      const fontFamilies = [
        'Arial', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New',
        'Impact', 'Comic Sans MS', 'Trebuchet MS', 'Arial Black', 'Palatino'
      ];
      if (!activeCampaign) {
        return <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center"></div>;
      }
      return (
        <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-purple-50 text-gray-900">
          <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-bold text-indigo-700">Campaign Wall</h1>
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
                        className={`px-4 py-2 rounded-xl font-medium ${newCampaignTitle.trim() ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}  
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
                          className={`p-3 rounded-lg border flex justify-between items-center ${activeCampaign.id === campaign.id ? 'bg-indigo-50 border-indigo-500' : 'bg-gray-50 border-gray-200'}`}  
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
                                if (!window.confirm(`Delete "${campaign.title}"? This will remove all confessions!`)) return;
                                supabase
                                  .from('confessions')
                                  .delete()
                                  .eq('campaign_id', campaign.id)
                                  .then(() => {
                                    supabase
                                      .from('campaigns')
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
                        <div key={conf.id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">Confession in {activeCampaign.title}</p>
                              <p className="text-sm text-gray-600">By {conf.name || 'Anonymous'}</p>
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => handleModerateConfession(conf.id, true)}
                                className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleModerateConfession(conf.id, false)}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                          <div 
                            className="p-3 rounded border"
                            style={{ 
                              backgroundColor: conf.bg_color || '#ffffff',
                              color: conf.color || '#000000',
                              borderColor: conf.border_color || '#e5e7eb'
                            }}
                          >
                            {conf.text}
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
                          className={`w-full text-left px-4 py-3 rounded-lg transition-all ${activeCampaign.id === campaign.id   
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
                      {confessions.length} confessions in this campaign ({fillPercentage}% filled)  
                    </p>  
                  </div>  
                  <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">  
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Create Your Confession</h2>  
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Your Confession (max 200 characters)
                      </label>
                      <textarea
                        value={confessionText}
                        onChange={e => setConfessionText(e.target.value.slice(0, 200))}
                        placeholder="Type your confession here..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-28"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>{confessionText.length}/200 characters</span>
                        {containsBadWords(confessionText) && (
                          <span className="text-red-600">Contains inappropriate words</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                        <div className="flex flex-wrap gap-1">
                          {textColors.map(color => (
                            <button
                              key={color}
                              onClick={() => setTextColor(color)}
                              className={`w-6 h-6 rounded border ${textColor === color ? 'ring-2 ring-offset-2 ring-indigo-300' : ''}`}
                              style={{ backgroundColor: color }}
                              aria-label={`Select color ${color}`}
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                        <div className="flex flex-wrap gap-1">
                          {bgColors.map(color => (
                            <button
                              key={color}
                              onClick={() => setBgColor(color)}
                              className={`w-6 h-6 rounded border ${bgColor === color ? 'ring-2 ring-offset-2 ring-indigo-300' : ''}`}
                              style={{ backgroundColor: color }}
                              aria-label={`Select color ${color}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Border Color</label>
                        <div className="flex flex-wrap gap-1">
                          {borderColors.map(color => (
                            <button
                              key={color}
                              onClick={() => setBorderColor(color)}
                              className={`w-6 h-6 rounded border ${borderColor === color ? 'ring-2 ring-offset-2 ring-indigo-300' : ''}`}
                              style={{ backgroundColor: color }}
                              aria-label={`Select color ${color}`}
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Shape</label>
                        <select
                          value={shape}
                          onChange={e => setShape(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="rounded">Rounded</option>
                          <option value="square">Square</option>
                          <option value="circle">Circle</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Font Family</label>
                        <select
                          value={fontFamily}
                          onChange={e => setFontFamily(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          {fontFamilies.map(font => (
                            <option key={font} value={font}>{font}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Font Size: {fontSize}px</label>
                        <input
                          type="range"
                          min="12"
                          max="24"
                          value={fontSize}
                          onChange={e => setFontSize(parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>  
                  <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">  
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Confession Options</h2>  
                    <div className="space-y-4">  
                      <div>  
                        <label className="block text-sm font-medium text-gray-700 mb-1">  
                          Size: <span className="text-indigo-600">{Math.round(confessionSize * 100)}%</span>  
                        </label>  
                        <input   
                          type="range"   
                          min="30"   
                          max="150"   
                          value={confessionSize * 100}   
                          onChange={e => setConfessionSize(parseInt(e.target.value) / 100)}   
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
                          onChange={e => setDisplayName(e.target.value.slice(0,20))}  
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
                      <div>
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
                          <p className="text-xs text-gray-500 mt-1">Click on the wall to select a spot for your confession</p>
                        )}
                      </div>
                    </div>  
                  </div>  
                  <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">  
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Post Your Confession</h2>  
                    <div className="space-y-3">  
                      {userHasPosted ? (  
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">  
                          <p className="text-sm text-blue-700 flex items-center">  
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">  
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />  
                            </svg>  
                            You've already posted in this campaign  
                          </p>  
                        </div>  
                      ) : (  
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">  
                          <p className="text-sm text-amber-700">  
                            Your confession will be permanently added to this wall  
                          </p>  
                        </div>  
                      )}  
                      <button  
                        onClick={handlePlaceConfession}  
                        disabled={!confessionText.trim() || !guidelinesAccepted || userAction}  
                        className={`w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center ${  
                          !confessionText.trim() || !guidelinesAccepted || userAction  
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
                        ) : userHasPosted ? (  
                          'Already Posted'  
                        ) : (  
                          'Post to Wall'  
                        )}  
                      </button>  
                      <button  
                        onClick={handleRemoveConfession}  
                        disabled={!userHasPosted || userAction}  
                        className={`w-full py-2 px-4 rounded-xl font-medium transition-all flex items-center justify-center ${  
                          !userHasPosted || userAction  
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
                          'Remove My Confession'  
                        )}  
                      </button>  
                      <button  
                        onClick={locateMyConfession}  
                        disabled={!userHasPosted}  
                        className={`w-full py-2 px-4 rounded-xl font-medium transition-all flex items-center justify-center ${  
                          !userHasPosted  
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'  
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'  
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
                        userMessage.toLowerCase().includes('fail') || userMessage.toLowerCase().includes('error') || userMessage.toLowerCase().includes('filled')  
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
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">  
                          "{activeCampaign.title}"  
                        </h2>  
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
                          {confessions.map((conf) => (  
                            <div   
                              key={conf.id}   
                              data-conf-id={conf.id}  
                              className="absolute select-none transition-transform duration-200 hover:z-50 hover:scale-105 group"  
                              style={{   
                                left: `${conf.x}px`,   
                                top: `${conf.y}px`,   
                                width: `${conf.w}px`,   
                                height: `${conf.h}px`,  
                                transform: `rotate(${conf.rot * 180 / Math.PI}deg)`,  
                                transformOrigin: 'center',
                                filter: conf.needs_moderation ? 'grayscale(80%) opacity(70%)' : 'none'
                              }}  
                              onClick={() => handleConfessionClick(conf.id)}  
                            >  
                              {conf.name && (  
                                <div className={`absolute -top-8 left-1/2 -translate-x-1/2 text-xs px-2 py-1 rounded bg-gray-900 text-white whitespace-nowrap transition-opacity duration-200 ${  
                                  shownConfessionId === conf.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'  
                                } z-50`}>  
                                  {conf.name}  
                                  {conf.needs_moderation && ' (Under Review)'}
                                </div>  
                              )}  
                              <div
                                className="w-full h-full flex items-center justify-center text-center p-3"
                                style={{
                                  backgroundColor: conf.bg_color || '#ffffff',
                                  color: conf.color || '#000000',
                                  border: `2px solid ${conf.border_color || '#e5e7eb'}`,
                                  borderRadius: conf.shape === 'circle' ? '50%' : conf.shape === 'rounded' ? '16px' : '0',
                                  fontFamily: conf.font_family || 'Arial',
                                  fontSize: `${conf.font_size || 14}px`,
                                  overflow: 'hidden',
                                  wordBreak: 'break-word'
                                }}
                              >
                                {conf.text}
                              </div>
                            </div>  
                          ))}  
                        </div>  
                      </div>  
                    </div>  
                    <div className="mt-4 text-sm text-gray-600">  
                      <p>✨ Each confession is styled uniquely, creating a beautiful mosaic of thoughts and secrets.</p>  
                      <p className="mt-1">🖱️ Scroll to explore, zoom in/out, and click on confessions to see who posted them.</p>  
                    </div>  
                  </div>  
                  <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">  
                    <h3 className="font-semibold text-gray-900 mb-2">About This Campaign</h3>  
                    <p className="text-sm text-gray-600">  
                      {activeCampaign.description || "This campaign brings together community confessions to form a visual tapestry of shared experiences. Each confession is a unique contribution to the collective story."}  
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
                      <button onClick={reportIssue} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py
