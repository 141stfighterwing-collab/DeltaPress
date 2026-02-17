
import React, { useEffect, useRef } from 'react';

interface CategoryIconProps {
  category: string;
  size?: number;
  color?: string;
  className?: string;
}

const CategoryIcon: React.FC<CategoryIconProps> = ({ 
  category, 
  size = 24, 
  color, 
  className = '' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Determine specific color if not provided, based on category keywords
    const cat = category.toLowerCase();
    let drawColor = color || '#4b5563';
    
    if (!color) {
        if (cat.includes('econ')) drawColor = '#059669'; // Emerald
        else if (cat.includes('politi')) drawColor = '#1e3a8a'; // Blue
        else if (cat.includes('global')) drawColor = '#4f46e5'; // Indigo
        else if (cat.includes('tech')) drawColor = '#0891b2'; // Cyan
        else if (cat.includes('ai')) drawColor = '#9333ea'; // Purple
        else if (cat.includes('food') || cat.includes('agri')) drawColor = '#d97706'; // Amber/Orange
        else if (cat.includes('env')) drawColor = '#16a34a'; // Green
        else if (cat.includes('sec')) drawColor = '#334155'; // Slate
        else if (cat.includes('soc')) drawColor = '#e11d48'; // Rose
        else if (cat.includes('op')) drawColor = '#f97316'; // Orange
        else if (cat.includes('cyber')) drawColor = '#2563eb'; // Blue
        else if (cat.includes('hist')) drawColor = '#7c3aed'; // Violet
    }

    // Clear and scale
    ctx.clearRect(0, 0, size * 2, size * 2);
    ctx.save();
    ctx.scale(2, 2); 
    ctx.strokeStyle = drawColor;
    ctx.fillStyle = drawColor;
    ctx.lineWidth = size * 0.07;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const mid = size / 2;
    const pad = size * 0.2;

    if (cat.includes('econ') || cat.includes('finance') || cat.includes('money')) {
      // Economics: $ sign with a growing trend line
      ctx.beginPath();
      ctx.moveTo(pad, size - pad);
      ctx.lineTo(mid + 2, mid + 2);
      ctx.lineTo(size - pad, mid - 4);
      ctx.stroke();
      
      ctx.font = `bold ${size * 0.6}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', mid, mid - 1);
    } 
    else if (cat.includes('politi') || cat.includes('policy') || cat.includes('govt')) {
      // Politics: Classic Temple/Parthenon
      ctx.beginPath();
      ctx.moveTo(pad, mid);
      ctx.lineTo(mid, pad);
      ctx.lineTo(size - pad, mid);
      ctx.closePath();
      ctx.stroke();
      // Base
      ctx.fillRect(pad, size - pad - 2, size - pad * 2, 2);
      // 3 Pillars
      ctx.fillRect(pad + 2, mid + 2, 3, size - pad - mid - 4);
      ctx.fillRect(mid - 1.5, mid + 2, 3, size - pad - mid - 4);
      ctx.fillRect(size - pad - 5, mid + 2, 3, size - pad - mid - 4);
    } 
    else if (cat.includes('global') || cat.includes('world') || cat.includes('internat')) {
      // Global Order: Globe with meridians
      ctx.beginPath();
      ctx.arc(mid, mid, mid - pad, 0, Math.PI * 2);
      ctx.stroke();
      // Cross lines
      ctx.beginPath();
      ctx.moveTo(pad, mid); ctx.lineTo(size - pad, mid);
      ctx.moveTo(mid, pad); ctx.lineTo(mid, size - pad);
      ctx.stroke();
      // Meridian ellipses
      ctx.beginPath();
      ctx.ellipse(mid, mid, (mid - pad) * 0.45, mid - pad, 0, 0, Math.PI * 2);
      ctx.stroke();
    } 
    else if (cat.includes('tech') || cat.includes('digit') || cat.includes('dev')) {
      // Technology: CPU Chip
      const innerSize = size - pad * 2;
      ctx.strokeRect(pad, pad, innerSize, innerSize);
      ctx.strokeRect(mid - 2, mid - 2, 4, 4);
      // Pins
      for (let i = 0; i < 3; i++) {
        const offset = pad + 4 + (i * ((innerSize - 8) / 2));
        ctx.moveTo(offset, 0); ctx.lineTo(offset, pad);
        ctx.moveTo(offset, size - pad); ctx.lineTo(offset, size);
        ctx.moveTo(0, offset); ctx.lineTo(pad, offset);
        ctx.moveTo(size - pad, offset); ctx.lineTo(size, offset);
      }
      ctx.stroke();
    } 
    else if (cat.includes('ai') || cat.includes('futur')) {
      // AI: Neural Node
      ctx.beginPath();
      ctx.arc(mid, mid, 3, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        const x = mid + Math.cos(angle) * (mid - pad);
        const y = mid + Math.sin(angle) * (mid - pad);
        ctx.moveTo(mid, mid);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } 
    else if (cat.includes('food') || cat.includes('agri')) {
      // Food & Ag: Sprout
      ctx.beginPath();
      ctx.moveTo(mid, size - pad);
      ctx.lineTo(mid, mid);
      ctx.stroke();
      // Two symmetrical leaves
      ctx.beginPath();
      ctx.moveTo(mid, mid);
      ctx.quadraticCurveTo(size - pad, pad, mid, mid + 4);
      ctx.moveTo(mid, mid);
      ctx.quadraticCurveTo(pad, pad, mid, mid + 4);
      ctx.stroke();
      ctx.fill();
    } 
    else if (cat.includes('env') || cat.includes('nature')) {
      // Environment: Map Pin
      ctx.beginPath();
      ctx.arc(mid, mid - 2, mid - pad - 2, Math.PI, 0);
      ctx.lineTo(mid, size - pad);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(mid, mid - 2, 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    else if (cat.includes('security') || cat.includes('defense') || cat.includes('sec')) {
      // Security: Shield
      ctx.beginPath();
      ctx.moveTo(pad, pad);
      ctx.lineTo(size - pad, pad);
      ctx.lineTo(size - pad, mid + 2);
      ctx.quadraticCurveTo(size - pad, size - pad, mid, size - pad);
      ctx.quadraticCurveTo(pad, size - pad, pad, mid + 2);
      ctx.closePath();
      ctx.stroke();
    }
    else if (cat.includes('cyber')) {
      // Cybersecurity: Padlock
      ctx.strokeRect(pad + 2, mid, size - pad * 2 - 4, mid - pad);
      ctx.beginPath();
      ctx.arc(mid, mid, (mid - pad - 2), Math.PI, 0);
      ctx.stroke();
      ctx.fillRect(mid - 1, mid + 4, 2, 4);
    }
    else if (cat.includes('history') || cat.includes('past')) {
      // History: Hourglass
      ctx.beginPath();
      ctx.moveTo(pad, pad);
      ctx.lineTo(size - pad, pad);
      ctx.lineTo(pad, size - pad);
      ctx.lineTo(size - pad, size - pad);
      ctx.closePath();
      ctx.stroke();
      // Sand drip
      ctx.fillRect(mid - 0.5, pad + 2, 1, size - pad * 2 - 4);
    }
    else if (cat.includes('society') || cat.includes('culture') || cat.includes('people')) {
      // Society: Three silhouettes
      // Person 1 (Center)
      ctx.beginPath();
      ctx.arc(mid, pad + 2, 3, 0, Math.PI * 2);
      ctx.moveTo(pad + 4, mid + 10);
      ctx.arc(mid, mid + 10, mid - pad - 4, Math.PI, Math.PI * 2);
      ctx.stroke();
      // Person 2 (Left)
      ctx.beginPath();
      ctx.arc(pad + 4, mid + 2, 2.5, 0, Math.PI * 2);
      ctx.moveTo(pad, size - pad);
      ctx.arc(pad + 4, size - pad, 4, Math.PI, Math.PI * 2);
      ctx.stroke();
      // Person 3 (Right)
      ctx.beginPath();
      ctx.arc(size - pad - 4, mid + 2, 2.5, 0, Math.PI * 2);
      ctx.moveTo(size - pad - 8, size - pad);
      ctx.arc(size - pad - 4, size - pad, 4, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    else {
      // Opinion/General: Speech Bubble
      ctx.beginPath();
      ctx.moveTo(pad, pad);
      ctx.lineTo(size - pad, pad);
      ctx.lineTo(size - pad, size - pad - 4);
      ctx.lineTo(mid + 4, size - pad - 4);
      ctx.lineTo(mid, size - pad);
      ctx.lineTo(mid - 4, size - pad - 4);
      ctx.lineTo(pad, size - pad - 4);
      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();
  }, [category, size, color]);

  return (
    <canvas 
      ref={canvasRef} 
      width={size * 2} 
      height={size * 2} 
      style={{ width: size, height: size }}
      className={className}
    />
  );
};

export default CategoryIcon;
