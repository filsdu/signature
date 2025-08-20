import React, { useEffect, useRef } from 'react';

const TextMaskGenerator = ({ 
  text, 
  width = 3000, 
  height = 1800, 
  fontFamily = "800 220px Inter, system-ui, Arial", 
  padding = 40,
  className = "" 
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !text) return;
    
    const ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;
    
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Auto-adjust font size to fit
    let fontSize = parseInt(fontFamily.match(/(\d+)px/)?.[1] || "220", 10);
    const fontFamilyName = fontFamily.replace(/^\d+\s*/, "");
    
    while (fontSize > 40) {
      ctx.font = `800 ${fontSize}px ${fontFamilyName}`;
      const metrics = ctx.measureText(text);
      const textWidth = metrics.width + padding * 2;
      const textHeight = fontSize + padding * 2;
      
      if (textWidth <= width && textHeight <= height) break;
      fontSize -= 10;
    }
    
    ctx.font = `800 ${fontSize}px ${fontFamilyName}`;
    ctx.fillText(text, width / 2, height / 2);
  }, [text, width, height, fontFamily, padding]);

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

export default TextMaskGenerator;
