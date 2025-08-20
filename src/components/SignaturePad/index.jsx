import React, { useEffect, useRef, useState } from 'react';
import './SignaturePad.css';

const SignaturePad = ({ onExport, color = '#111827', width = 500, height = 200, strokeWidth = 2.5 }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [pen, setPen] = useState({ pressure: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
  }, [width, height, color]);

  const getPosition = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (e.touches) {
      const t = e.touches[0];
      return { 
        x: t.clientX - rect.left, 
        y: t.clientY - rect.top, 
        pressure: (t.force || 0.5) 
      };
    }
    return { 
      x: e.clientX - rect.left, 
      y: e.clientY - rect.top, 
      pressure: 0.5 
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const pos = getPosition(e);
    const ctx = canvasRef.current.getContext('2d');
    
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setPen({ pressure: pos.pressure });
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const pos = getPosition(e);
    const ctx = canvasRef.current.getContext('2d');
    
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, strokeWidth * (0.75 + pen.pressure));
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasInk(true);
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
    
    const trimW = Math.max(1, maxX - minX + 2);
    const trimH = Math.max(1, maxY - minY + 2);
    const out = document.createElement('canvas');
    
    out.width = trimW;
    out.height = trimH;
    
    const octx = out.getContext('2d');
    octx.putImageData(ctx.getImageData(minX, minY, trimW, trimH), 0, 0);
    
    return out.toDataURL('image/png');
  };

  const exportSignature = () => {
    const trimmed = trimCanvas(canvasRef.current);
    if (!trimmed) return;
    onExport(trimmed);
  };

  return (
    <div className="signature-pad">
      <div className="signature-pad-header">
        <div className="signature-instructions">
          Sign in the box below using your mouse or touchscreen
        </div>
        <div className="signature-actions">
          <button 
            onClick={clearCanvas} 
            className="signature-btn signature-btn-secondary"
          >
            Clear
          </button>
          <button 
            onClick={exportSignature} 
            className="signature-btn signature-btn-primary"
            disabled={!hasInk}
          >
            Use This Signature
          </button>
        </div>
      </div>
      
      <div className="signature-canvas-container">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="signature-canvas"
        />
      </div>
    </div>
  );
};

export default SignaturePad;
