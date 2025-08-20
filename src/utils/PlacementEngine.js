// Utility function to calculate rotated bounds
const rotatedBounds = (w, h, rotRad) => {
  const cos = Math.cos(rotRad);
  const sin = Math.sin(rotRad);
  const rw = Math.abs(w * cos) + Math.abs(h * sin);
  const rh = Math.abs(w * sin) + Math.abs(h * cos);
  return { rw, rh };
};

// Check if two rectangles overlap
const overlaps = (a, b) => {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
};

// Create a temporary canvas to generate text mask
const createTextMask = (text, width, height, fontFamily = "800 220px Inter, system-ui, Arial", padding = 40) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext("2d");
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
  
  return canvas;
};

// Find a placement spot inside the text mask without overlapping existing items
const findPlacementInMask = ({ text, imgW, imgH, rotRad, existing, maxTries = 500 }) => {
  // Create text mask
  const maskCanvas = createTextMask(text, 3000, 1800);
  const { rw, rh } = rotatedBounds(imgW, imgH, rotRad);
  const w = Math.ceil(rw);
  const h = Math.ceil(rh);
  
  const ctx = maskCanvas.getContext("2d");
  const mask = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;

  // Check if a rectangle is inside the text mask
  const rectIsInsideMask = (x, y) => {
    // Sample multiple points inside the rectangle
    const samples = 24;
    for (let i = 0; i < samples; i++) {
      const px = Math.floor(x + (i % 6) * (w / 5));
      const py = Math.floor(y + Math.floor(i / 6) * (h / 3.5));
      const idx = (py * maskCanvas.width + px) * 4 + 3; // alpha channel
      
      if (mask[idx] < 10) return false; // not inside text
    }
    return true;
  };

  // Try to find a valid position
  for (let i = 0; i < maxTries; i++) {
    const x = Math.floor(Math.random() * Math.max(1, 3000 - w));
    const y = Math.floor(Math.random() * Math.max(1, 1800 - h));

    if (!rectIsInsideMask(x, y)) continue;

    const bb = { x, y, w, h };
    const collides = existing.some(e => {
      const eBounds = rotatedBounds(e.w, e.h, e.rot);
      return overlaps(bb, { 
        x: e.x, 
        y: e.y, 
        w: eBounds.rw, 
        h: eBounds.rh 
      });
    });
    
    if (!collides) return { x, y };
  }
  
  return null; // No valid position found
};

export default {
  rotatedBounds,
  overlaps,
  findPlacementInMask
};
