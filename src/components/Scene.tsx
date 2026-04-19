import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, Clouds, Cloud, OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

function Snow() {
  const flakeCount = 6000;
  const positions = useMemo(() => {
    const p = new Float32Array(flakeCount * 3);
    for (let i = 0; i < flakeCount; i++) {
        p[i * 3] = (Math.random() - 0.5) * 80;
        p[i * 3 + 1] = Math.random() * 30;
        p[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    return p;
  }, []);

  const ref = useRef<THREE.Points>(null);
  const time = useRef(0);
  
  useFrame((state, delta) => {
    if (!ref.current) return;
    const array = ref.current.geometry.attributes.position.array as Float32Array;
    time.current += delta;
    
    for (let i = 0; i < flakeCount; i++) {
      // Much slower descent for snow
      const speed = (2 + (i % 2)) * delta; 
      // Drift sideways
      const drift = Math.sin(time.current + i) * 0.02;

      array[i * 3] += drift;
      array[i * 3 + 1] -= speed;
      
      if (array[i * 3 + 1] < -2) {
        array[i * 3 + 1] = 25 + Math.random() * 10;
        array[i * 3] = (Math.random() - 0.5) * 40;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={flakeCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      {/* 2px size points for snow */}
      <pointsMaterial color="#ffffff" size={0.15} transparent opacity={0.6} />
    </points>
  );
}

function Rain({ heavy, drizzle }: { heavy?: boolean; drizzle?: boolean }) {
  const dropCount = drizzle ? 1000 : heavy ? 15000 : 5000;
  const positions = useMemo(() => {
    const p = new Float32Array(dropCount * 6); // 2 vertices per line (x,y,z, x,y,z)
    for (let i = 0; i < dropCount; i++) {
        const x = (Math.random() - 0.5) * 80;
        const y = Math.random() * 30;
        const z = (Math.random() - 0.5) * 80;
        
        const length = heavy ? 1.0 : drizzle ? 0.3 : 0.6;
        const windTilt = heavy ? 0.4 : drizzle ? 0.05 : 0.2;

        p[i * 6] = x;
        p[i * 6 + 1] = y;
        p[i * 6 + 2] = z;
        
        p[i * 6 + 3] = x - windTilt; 
        p[i * 6 + 4] = y - length;
        p[i * 6 + 5] = z;
    }
    return p;
  }, [dropCount, heavy, drizzle]);

  const ref = useRef<THREE.LineSegments>(null);
  useFrame((state, delta) => {
    if (!ref.current) return;
    const array = ref.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < dropCount; i++) {
      const speedBase = heavy ? 45 : drizzle ? 10 : 25;
      const speed = (speedBase + (i % 10)) * delta;
      const wind = (heavy ? 15 : drizzle ? 2 : 5) * delta;

      // move top vertex
      array[i * 6 + 1] -= speed;
      array[i * 6] -= wind;
      
      // move bottom vertex
      array[i * 6 + 4] -= speed;
      array[i * 6 + 3] -= wind;
      
      if (array[i * 6 + 4] < -2) {
        const newY = 25 + Math.random() * 10;
        const newX = (Math.random() - 0.5) * 80;
        
        const length = heavy ? 1.0 : drizzle ? 0.3 : 0.6;
        const windTilt = heavy ? 0.4 : drizzle ? 0.05 : 0.2;

        array[i * 6] = newX;
        array[i * 6 + 1] = newY;
        
        array[i * 6 + 3] = newX - windTilt;
        array[i * 6 + 4] = newY - length;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <lineSegments ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={dropCount * 2}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color={drizzle ? "#cce0ff" : "#aaddff"} transparent opacity={drizzle ? 0.15 : heavy ? 0.4 : 0.3} />
    </lineSegments>
  );
}

function CloudDrifter({ children, windSpeed }: { children: React.ReactNode, windSpeed?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (ref.current) {
      // Scale wind speed: default to 10mph if missing. 
      // Lowered multiplier from 0.002 to 0.0005 to make clouds feel heavier and slower
      const speed = windSpeed !== undefined ? windSpeed : 10;
      const rotationSpeed = speed * 0.0005;
      ref.current.rotation.y -= delta * Math.min(rotationSpeed, 0.05); // cap max rotation for sanity
    }
  });
  return <group ref={ref}>{children}</group>;
}

export default function Scene({ wmoCode, currentTime, sunriseTime, sunsetTime, windSpeedMph }: { wmoCode: number, currentTime?: number, sunriseTime?: number, sunsetTime?: number, windSpeedMph?: number }) {
  let isClear = wmoCode === 0 || wmoCode === 1;
  let isPartlyCloudy = wmoCode === 2;
  let isCloudy = wmoCode === 3;
  let isFog = wmoCode >= 45 && wmoCode <= 48;
  let isDrizzle = wmoCode >= 51 && wmoCode <= 57;
  let isRain = (wmoCode >= 61 && wmoCode <= 64) || (wmoCode >= 80 && wmoCode <= 81);
  let isHeavyRain = (wmoCode >= 65 && wmoCode <= 67) || (wmoCode >= 82 && wmoCode <= 83) || wmoCode >= 95;
  let isSnow = (wmoCode >= 71 && wmoCode <= 77) || (wmoCode >= 85 && wmoCode <= 86);
  let isStorm = wmoCode >= 95;

  let hasClouds = isCloudy || isPartlyCloudy || isDrizzle || isRain || isHeavyRain || isSnow || isStorm || isFog;

  // Day/Night and Sun Positioning
  let sunY = 20;
  let sunX = 100;
  let sunZ = 100;
  
  let isDay = true;
  let isDuskDawn = false;

  if (currentTime && sunriseTime && sunsetTime) {
      isDay = currentTime > sunriseTime && currentTime < sunsetTime;
      if (isDay) {
          const dayLength = sunsetTime - sunriseTime;
          const progress = (currentTime - sunriseTime) / dayLength; // 0.0 to 1.0 throughout the day
          const angle = Math.PI * progress; 
          sunX = 100 * Math.cos(angle);
          sunY = Math.max(-10, 100 * Math.sin(angle));
          
          if (sunY > 0 && sunY < 20) {
              isDuskDawn = true;
          }
      } else {
          sunY = -20;
          sunX = 0;
      }
  }

  // Base Aesthetics (Modified by Time)
  let skyParams = {
    turbidity: 1,
    rayleigh: isDuskDawn ? 2.5 : 0.5,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.7,
    sunPosition: new THREE.Vector3(sunX, sunY, sunZ),
  };

  let baseCloudColor = '#ffffff';
  let baseWorldLight = 1.0;

  if (isFog) {
      baseCloudColor = '#b0c4de';
      baseWorldLight = 0.5;
      skyParams.turbidity = 20;
      skyParams.rayleigh = 3;
  } else if (isStorm || isHeavyRain) {
      baseCloudColor = '#2b3036';
      baseWorldLight = 0.2;
      skyParams.turbidity = 15;
  } else if (isRain) {
      baseCloudColor = '#606e7a';
      baseWorldLight = 0.4;
      skyParams.turbidity = 8;
  } else if (isDrizzle) {
      baseCloudColor = '#a0aec0';
      baseWorldLight = 0.7;
      skyParams.turbidity = 4;
  } else if (isSnow) {
      baseCloudColor = '#e5ecf0';
      baseWorldLight = 0.8;
      skyParams.turbidity = 6;
  } else if (isCloudy) {
      baseCloudColor = '#a0aec0';
      baseWorldLight = 0.6;
      skyParams.turbidity = 6;
      skyParams.rayleigh = 1.5;
  } else if (isPartlyCloudy) {
      skyParams.turbidity = 2;
  } else {
      skyParams.turbidity = 0.2;
      skyParams.rayleigh = 0.1;
  }

  // Apply Time Modifiers
  let finalCloudColor = baseCloudColor;
  let finalDirLightColor = '#ffffff';
  let ambIntensity = 0.8 * baseWorldLight;
  let dirIntensity = 1.5 * baseWorldLight;

  if (!isDay) {
      finalCloudColor = '#0b111a'; // pitch dark blue/grey
      finalDirLightColor = '#507094'; // dim moonlight
      ambIntensity = 0.1 * baseWorldLight;
      dirIntensity = 0.2 * baseWorldLight;
  } else if (isDuskDawn) {
      finalDirLightColor = '#ff8a47'; // sunset orange
      ambIntensity = 0.5 * baseWorldLight;
      dirIntensity = 1.2 * baseWorldLight;
      if (!isStorm && !isHeavyRain && !isRain) {
          finalCloudColor = '#fceade'; // tint clouds warm
      }
  }

  const cloudElements = useMemo(() => {
    return (
      <Clouds material={THREE.MeshLambertMaterial} limit={2000}>
        {isClear && (
          <>
             <Cloud position={[5, 10, -20]} bounds={[15, 2, 10]} volume={5} color={finalCloudColor} speed={0.1} opacity={0.15} />
             <Cloud position={[-10, 12, -15]} bounds={[10, 1.5, 8]} volume={3} color={finalCloudColor} speed={0.15} opacity={0.1} />
          </>
        )}

        {isPartlyCloudy && (
          <>
            <Cloud position={[-6, 6, -15]} bounds={[10, 5, 10]} volume={10} color={finalCloudColor} speed={0.2} opacity={0.6} />
            <Cloud position={[6, 8, -20]} bounds={[10, 4, 10]} volume={10} color={finalCloudColor} speed={0.15} opacity={0.7} />
            <Cloud position={[0, 10, -25]} bounds={[15, 6, 15]} volume={15} color={finalCloudColor} speed={0.1} opacity={0.5} />
          </>
        )}

        {(hasClouds && !isPartlyCloudy && !isClear) && (
          <>
            <Cloud position={[0, 8, -10]} bounds={[25, 8, 25]} volume={25} color={finalCloudColor} speed={isHeavyRain ? 0.5 : 0.2} opacity={0.8} />
            <Cloud position={[-15, 10, -20]} bounds={[25, 8, 25]} volume={25} color={finalCloudColor} speed={isHeavyRain ? 0.6 : 0.25} opacity={isFog ? 0.3 : 0.85} />
            <Cloud position={[15, 10, -15]} bounds={[25, 8, 25]} volume={25} color={finalCloudColor} speed={isHeavyRain ? 0.4 : 0.15} opacity={isFog ? 0.2 : 0.8} />
            <Cloud position={[0, 12, -30]} bounds={[30, 10, 30]} volume={30} color={finalCloudColor} speed={isHeavyRain ? 0.3 : 0.1} opacity={0.9} />
            
            <Cloud position={[20, 10, 10]} bounds={[25, 8, 25]} volume={20} color={finalCloudColor} speed={isHeavyRain ? 0.4 : 0.1} opacity={0.8} />
            <Cloud position={[-20, 10, 10]} bounds={[25, 8, 25]} volume={20} color={finalCloudColor} speed={isHeavyRain ? 0.4 : 0.1} opacity={0.8} />
            <Cloud position={[0, 12, 15]} bounds={[30, 8, 30]} volume={20} color={finalCloudColor} speed={isHeavyRain ? 0.4 : 0.1} opacity={0.8} />
            
            {isHeavyRain && (
              <>
                <Cloud position={[5, 14, -5]} bounds={[35, 10, 35]} volume={40} color={finalCloudColor} speed={0.5} opacity={0.95} />
                <Cloud position={[-10, 16, 5]} bounds={[35, 10, 35]} volume={40} color={finalCloudColor} speed={0.45} opacity={0.95} />
              </>
            )}
          </>
        )}
      </Clouds>
    );
  }, [isClear, isPartlyCloudy, hasClouds, isHeavyRain, isFog, finalCloudColor]);

  return (
    <Canvas camera={{ position: [0, 2, 15], fov: 65 }}>
      {isFog && <fogExp2 attach="fog" color={!isDay ? '#060a10' : '#8a9cad'} density={0.06} />}
      {!isFog && <fogExp2 attach="fog" color={!isDay ? '#060a10' : '#8a9cad'} density={0.001} />}
      
      <Suspense fallback={null}>
        {(!isDay && (isClear || isPartlyCloudy)) && (
           <Stars radius={100} depth={50} count={isClear ? 4000 : 1500} factor={4} saturation={0} fade speed={1} />
        )}
        <Sky {...skyParams} />
        
        <ambientLight intensity={ambIntensity} />
        <directionalLight 
          position={[-100, Math.max(10, sunY), 100]} 
          intensity={dirIntensity} 
          color={finalDirLightColor} 
        />
        <directionalLight position={[10, 10, -10]} intensity={isDay ? 0.3 : 0.05} color={finalDirLightColor} />

        {/* Clouds container */}
        <CloudDrifter windSpeed={windSpeedMph}>
          {cloudElements}
        </CloudDrifter>

        {(isRain || isHeavyRain || isDrizzle) && <Rain heavy={isHeavyRain} drizzle={isDrizzle} />}
        {isSnow && <Snow />}

        <OrbitControls 
          makeDefault 
          minPolarAngle={Math.PI/3} 
          maxPolarAngle={Math.PI/2 - 0.05} 
          enableZoom={true}
          minDistance={5}
          maxDistance={40}
          enablePan={true}
          enableDamping={true} 
        />
      </Suspense>
    </Canvas>
  );
}
