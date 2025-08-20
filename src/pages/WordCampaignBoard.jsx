import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import SignaturePad from "../components/SignaturePad";
import TextMaskGenerator from "../components/TextMaskGenerator";
import CommunityGuidelinesModal from "../components/CommunityGuidelinesModal";
import PlacementEngine from "../utils/PlacementEngine";

// Supabase client
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Constants
const WALL_WIDTH = 3000;
const WALL_HEIGHT = 1800;
const MIN_SIGNATURE_WIDTH = 80;
const MIN_SIGNATURE_HEIGHT = 40;

// Default campaigns
const DEFAULT_CAMPAIGNS = [
  "BLACK LIVES MATTER",
  "LOVE IS LOVE",
  "CLIMATE ACTION NOW",
  "WOMEN'S RIGHTS ARE HUMAN RIGHTS"
];

function WordCampaignBoard() {
  // State management
  const [activeCampaign, setActiveCampaign] = useState(DEFAULT_CAMPAIGNS[0]);
  const [signatures, setSignatures] = useState([]);
  const [userSignature, setUserSignature] = useState(null);
  const [penColor, setPenColor] = useState("#111827");
  const [signatureSize, setSignatureSize] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [zoom, setZoom] = useState(0.8);
  const [isLoading, setIsLoading] = useState(true);
  const [userMessage, setUserMessage] = useState("");
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [userAction, setUserAction] = useState(null);

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

  // Load signatures for active campaign
  useEffect(() => {
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
          setUserMessage("Unable to load signatures at this time. Please try again later.");
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
          // Calculate final dimensions
          const baseMax = 360;
          const ratio = Math.min(1, baseMax / img.width) * signatureSize;
          const w = Math.max(MIN_SIGNATURE_WIDTH, Math.round(img.width * ratio));
          const h = Math.max(MIN_SIGNATURE_HEIGHT, Math.round(img.height * ratio));
          const rotDeg = Math.round(rotation);
          const rotRad = (rotDeg * Math.PI) / 180;

          // Find placement
          const placement = await PlacementEngine.findPlacementInMask({
            text: activeCampaign,
            imgW: w,
            imgH: h,
            rotRad,
            existing: signatures,
            maxTries: 800
          });

          if (!placement) {
            setUserMessage("The word is getting crowded. Try a smaller size or different rotation.");
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

  // Color palette
  const colorPalette = [
    '#111827', '#b91c1c', '#1d4ed8', '#0f766e', '#ca8a04', '#86198f',
    '#dc2626', '#2563eb', '#059669', '#d97706', '#7e22ce'
  ];

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Campaign Selection */}
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Select Campaign</h2>
              <div className="space-y-2">
                {DEFAULT_CAMPAIGNS.map(campaign => (
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
                    min="60" 
                    max="120" 
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
                  userMessage.includes('error') || userMessage.includes('Failed') 
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
                      onClick={() => setZoom(z => Math.max(0.3, +(z - 0.1).toFixed(1)))}
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
                      {/* Text mask preview (faint outline) */}
                      <TextMaskGenerator 
                        text={activeCampaign} 
                        width={WALL_WIDTH}
                        height={WALL_HEIGHT}
                        className="absolute inset-0 opacity-10 pointer-events-none"
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
                <button className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                  Share Campaign
                </button>
                <button className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                  Download Image
                </button>
                <button className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                  Report Issue
                </button>
              </div>
            </div>
          </div>
        </div>
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

      <style jsx>{`
        [data-flash="1"] {
          animation: flash 1.5s ease-in-out;
        }
        
        @keyframes flash {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
          50% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        
        /* Custom range slider */
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

export default WordCampaignBoard;
