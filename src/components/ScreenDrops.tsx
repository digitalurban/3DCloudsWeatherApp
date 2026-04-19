import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

export default function ScreenDrops({ wmoCode }: { wmoCode: number }) {
  const isDrizzle = wmoCode >= 51 && wmoCode <= 57;
  const isRain = (wmoCode >= 61 && wmoCode <= 64) || (wmoCode >= 80 && wmoCode <= 81);
  const isHeavyRain = (wmoCode >= 65 && wmoCode <= 67) || (wmoCode >= 82 && wmoCode <= 83) || wmoCode >= 95;
  
  const isActive = isDrizzle || isRain || isHeavyRain;
  const [drops, setDrops] = useState<{id: number, left: number, top: number, scale: number, duration: number}[]>([]);

  useEffect(() => {
    if (!isActive) {
       setDrops([]);
       return;
    }
    
    let count = 0;
    // Faster spawning for heavy rain
    const intervalTime = isHeavyRain ? 60 : isRain ? 150 : 400;
    
    const interval = setInterval(() => {
      setDrops(current => {
        const newDrop = {
          id: count++,
          left: Math.random() * 100,
          top: Math.random() * 80, // mostly hit the top 80% to give room to streak down
          scale: Math.random() * 0.6 + 0.4,
          duration: Math.random() * 1.5 + 0.8,
        };
        // prune old drops to prevent memory leaks
        const maxDrops = isHeavyRain ? 60 : isRain ? 30 : 10;
        const updated = [...current, newDrop];
        if (updated.length > maxDrops) return updated.slice(updated.length - maxDrops);
        return updated;
      });
    }, intervalTime);
    
    return () => clearInterval(interval);
  }, [isActive, isHeavyRain, isRain]);

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-[5] pointer-events-none overflow-hidden mix-blend-overlay opacity-80">
      {drops.map(d => (
        <motion.div
          key={d.id}
          initial={{ opacity: 0, scale: 0, y: 0 }}
          animate={{ 
            opacity: [0, 1, 0.8, 0], 
            scale: [0, d.scale, d.scale, d.scale * 0.7], 
            y: [0, 0, Math.random() * 50 + 50, Math.random() * 100 + 100] 
          }}
          transition={{ duration: d.duration, ease: "easeIn" }}
          className="absolute rounded-[50%] bg-white/30 backdrop-blur-md shadow-[inset_0_-2px_4px_rgba(255,255,255,0.6)]"
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: 14,
            height: 22,
          }}
        />
      ))}
    </div>
  );
}
