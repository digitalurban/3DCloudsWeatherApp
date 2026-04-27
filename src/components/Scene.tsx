import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, Clouds, Cloud, OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

function Snow() {
  const flakeCount = 2000;
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

function Rain({ heavy, drizzle, windSpeed = 0 }: { heavy?: boolean; drizzle?: boolean, windSpeed?: number }) {
  const dropCount = drizzle ? 500 : heavy ? 6000 : 2000;
  
  // Calculate a wind multiplier. Cap it so the rain doesn't travel horizontally too crazily.
  // Assuming a max reasonable visual wind speed scalar around 30mph -> 30/10 = 3x multiplier
  const safeWind = Math.min(Math.max(windSpeed, 0), 40);
  const windTiltModifier = (safeWind / 10) || 1;

  const positions = useMemo(() => {
    const p = new Float32Array(dropCount * 6); // 2 vertices per line (x,y,z, x,y,z)
    for (let i = 0; i < dropCount; i++) {
        const x = (Math.random() - 0.5) * 80;
        const y = Math.random() * 30;
        const z = (Math.random() - 0.5) * 80;
        
        const length = heavy ? 1.0 : drizzle ? 0.3 : 0.6;
        const baseWindTilt = heavy ? 0.4 : drizzle ? 0.05 : 0.2;
        const windTilt = baseWindTilt * windTiltModifier;

        p[i * 6] = x;
        p[i * 6 + 1] = y;
        p[i * 6 + 2] = z;
        
        p[i * 6 + 3] = x - windTilt; 
        p[i * 6 + 4] = y - length;
        p[i * 6 + 5] = z;
    }
    return p;
  }, [dropCount, heavy, drizzle, windTiltModifier]);

  const ref = useRef<THREE.LineSegments>(null);
  useFrame((state, delta) => {
    if (!ref.current) return;
    const array = ref.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < dropCount; i++) {
      const speedBase = heavy ? 45 : drizzle ? 10 : 25;
      const speed = (speedBase + (i % 10)) * delta;
      
      const baseWind = (heavy ? 15 : drizzle ? 2 : 5) * delta;
      const wind = baseWind * windTiltModifier;

      // move top vertex
      array[i * 6 + 1] -= speed;
      array[i * 6] -= wind;
      
      // move bottom vertex
      array[i * 6 + 4] -= speed;
      array[i * 6 + 3] -= wind;
      
      if (array[i * 6 + 4] < -2) {
        const newY = 25 + Math.random() * 10;
        const newX = (Math.random() - 0.5) * 80 + (20 * Math.random()); // spawn further back on x depending on wind
        
        const length = heavy ? 1.0 : drizzle ? 0.3 : 0.6;
        const baseWindTilt = heavy ? 0.4 : drizzle ? 0.05 : 0.2;
        const windTilt = baseWindTilt * windTiltModifier;

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
      // Lowered multiplier from 0.0005 to 0.00008 to make clouds drift much slower and realistically
      const speed = windSpeed !== undefined ? windSpeed : 10;
      const rotationSpeed = speed *   0.00008;
      ref.current.rotation.y -= delta * Math.min(rotationSpeed, 0.02); // cap max rotation for sanity
    }
  });
  return <group ref={ref}>{children}</group>;
}

function Lightning() {
  const lightRef = useRef<THREE.PointLight>(null);
  
  useFrame((state, delta) => {
    if (!lightRef.current) return;
    
    // 2% chance per frame to strike (roughly 1 strike per second at 60fps)
    if (Math.random() > 0.98) {
       // Massive burst of lightning energy to pierce the Lambert clouds
       lightRef.current.intensity = Math.random() * 5000 + 2000; 
       
       // Move the flash randomly within the cloud ceiling layer
       lightRef.current.position.set(
           (Math.random() - 0.5) * 100, // wider spread
           10 + Math.random() * 15,
           (Math.random() - 0.5) * 100
       );
    } else {
       // Fast immediate decay simulating the pop of lightning
       lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, 0, 20 * delta);
    }
  });

  return (
    <pointLight 
      ref={lightRef} 
      color="#dbe7ff" 
      distance={400} 
      decay={2} 
      intensity={0} 
    />
  );
}

function SmoothLighting({ 
  ambIntensity, 
  dirIntensity, 
  sunX, 
  sunY, 
  sunZ,
  finalDirLightColor,
  isDay
}: { 
  ambIntensity: number, 
  dirIntensity: number, 
  sunX: number, 
  sunY: number, 
  sunZ: number,
  finalDirLightColor: string,
  isDay: boolean 
}) {
  const ambRef = useRef<THREE.AmbientLight>(null);
  const dirRef = useRef<THREE.DirectionalLight>(null);
  const initRef = useRef(false);

  useFrame((state, delta) => {
    // Smoother, slower lerp factor for gentle lighting shifts (e.g. 0.5 * delta)
    const factor = 1.0 * delta;
    
    if (ambRef.current) {
        if (!initRef.current) ambRef.current.intensity = ambIntensity;
        else ambRef.current.intensity = THREE.MathUtils.lerp(ambRef.current.intensity, ambIntensity, factor);
    }
    
    if (dirRef.current) {
        const targetPos = new THREE.Vector3(sunX, sunY, sunZ);
        if (!initRef.current) {
            dirRef.current.intensity = dirIntensity;
            dirRef.current.position.copy(targetPos);
        } else {
            dirRef.current.intensity = THREE.MathUtils.lerp(dirRef.current.intensity, dirIntensity, factor);
            dirRef.current.position.lerp(targetPos, factor);
        }
    }
    
    initRef.current = true;
  });

  return (
    <>
      <ambientLight ref={ambRef} />
      <directionalLight 
        ref={dirRef}
        color={finalDirLightColor} 
      />
      <directionalLight position={[10, 10, -10]} intensity={isDay ? 0.3 : 0.05} color={finalDirLightColor} />
    </>
  );
}

function AnimatedSun({ sunX, sunY, sunZ, hasClouds }: { sunX: number, sunY: number, sunZ: number, hasClouds: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const shaderMatRef = useRef<THREE.ShaderMaterial>(null);
  const initRef = useRef(false);

  const uniforms = useMemo(() => ({
    color: { value: new THREE.Color('#ffe1b3') }, // Warm golden sunlight
    opacity: { value: 0.0 }, // Start at 0 and let useFrame lerp it up to the correct value
    worldY: { value: 0.0 }
  }), []);

  useFrame((state, delta) => {
      const factor = 1.0 * delta;
      
      const targetPos = new THREE.Vector3(sunX, sunY, sunZ);
      const targetOpacityMod = hasClouds ? 0.02 : 0.6; // We can go a bit higher on opacity because it's additive and radial
      
      if (groupRef.current) {
          if (!initRef.current) groupRef.current.position.copy(targetPos);
          else groupRef.current.position.lerp(targetPos, factor);
      }
      
      if (shaderMatRef.current) {
          shaderMatRef.current.uniforms.worldY.value = groupRef.current ? groupRef.current.position.y : 0;
          if (!initRef.current) shaderMatRef.current.uniforms.opacity.value = targetOpacityMod;
          else shaderMatRef.current.uniforms.opacity.value = THREE.MathUtils.lerp(shaderMatRef.current.uniforms.opacity.value, targetOpacityMod, factor);
      }
      
      initRef.current = true;
  });

  return (
    <group ref={groupRef}>
       <mesh>
         <planeGeometry args={[30, 30]} />
         <shaderMaterial 
            ref={shaderMatRef}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            uniforms={uniforms}
            vertexShader={`
              varying vec2 vUv;
              varying float vLocalY;
              void main() {
                vUv = uv;
                vLocalY = position.y;
                // Simple billboard logic so it always faces camera
                vec4 mvPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
                mvPosition.xy += position.xy;
                gl_Position = projectionMatrix * mvPosition;
              }
            `}
            fragmentShader={`
              uniform vec3 color;
              uniform float opacity;
              uniform float worldY;
              varying vec2 vUv;
              varying float vLocalY;
              void main() {
                float dist = distance(vUv, vec2(0.5));
                
                // Defined inner core (solid until 0.1, fades shortly after)
                float core = smoothstep(0.12, 0.05, dist);
                
                // Soft outer glow extending to the edge
                float glow = smoothstep(0.5, 0.0, dist);
                glow = pow(glow, 2.5); // Steep power curve to keep it mostly atmospheric bloom
                
                // Combine into an alpha mask
                float alpha = clamp(core + glow, 0.0, 1.0) * opacity;
                
                // Physical horizon clip (fades out as it crosses Y=0 to Y=-2)
                float fragY = worldY + vLocalY;
                float horizonFade = smoothstep(-2.0, 2.0, fragY);
                alpha *= horizonFade;
                
                // Add a very slight white hot-center to make the core pop
                vec3 finalColor = mix(color, vec3(1.0), core * 0.4);
                
                gl_FragColor = vec4(finalColor, alpha);
              }
            `}
         />
       </mesh>
    </group>
  );
}

function AnimatedMoon({ sunX, sunY, sunZ, hasClouds, phase }: { sunX: number, sunY: number, sunZ: number, hasClouds: boolean, phase: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const shaderMatRef = useRef<THREE.ShaderMaterial>(null);
  const initRef = useRef(false);

  const uniforms = useMemo(() => ({
    color: { value: new THREE.Color('#e0e8ff') }, // Cool silver/blue moonlight
    opacity: { value: 0.0 }, // Start at 0 and let useFrame lerp it up
    phase: { value: phase },
    worldY: { value: 0.0 }
  }), []);

  // Make sure phase updates softly without recreating the entire uniform object
  useFrame((state, delta) => {
      const factor = 1.0 * delta;
      
      const targetPos = new THREE.Vector3(sunX, sunY, sunZ);
      const targetOpacityMod = hasClouds ? 0.01 : 0.8; // Boost opacity as phase masks dim the output
      
      if (groupRef.current) {
          if (!initRef.current) groupRef.current.position.copy(targetPos);
          else groupRef.current.position.lerp(targetPos, factor);
      }
      
      if (shaderMatRef.current) {
          shaderMatRef.current.uniforms.phase.value = phase;
          shaderMatRef.current.uniforms.worldY.value = groupRef.current ? groupRef.current.position.y : 0;
          
          if (!initRef.current) shaderMatRef.current.uniforms.opacity.value = targetOpacityMod;
          else shaderMatRef.current.uniforms.opacity.value = THREE.MathUtils.lerp(shaderMatRef.current.uniforms.opacity.value, targetOpacityMod, factor);
      }
      
      initRef.current = true;
  });

  return (
    <group ref={groupRef}>
       <mesh>
         <planeGeometry args={[20, 20]} />
         <shaderMaterial 
            ref={shaderMatRef}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            uniforms={uniforms}
            vertexShader={`
              varying vec2 vUv;
              varying float vLocalY;
              void main() {
                vUv = uv;
                vLocalY = position.y;
                vec4 mvPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
                mvPosition.xy += position.xy;
                gl_Position = projectionMatrix * mvPosition;
              }
            `}
            fragmentShader={`
              uniform vec3 color;
              uniform float opacity;
              uniform float phase;
              uniform float worldY;
              varying vec2 vUv;
              varying float vLocalY;
              void main() {
                vec2 p = vUv * 2.0 - 1.0; 
                float dist = length(p);
                
                // Base moon radius
                float radius = 0.25; 
                float moonMask = smoothstep(radius + 0.01, radius - 0.01, dist);
                
                // Calculate pseudo-3D normal for a sphere in 2D space
                float z = sqrt(max(0.0, radius*radius - dist*dist));
                vec3 normal = normalize(vec3(p.x, p.y, z));
                
                // Map the 0.0-1.0 phase to an angle around the sphere
                // Phase 0.0 = New, 0.5 = Full, 1.0 = New
                float theta = phase * 3.14159265 * 2.0;
                vec3 lightDir = normalize(vec3(-sin(theta), 0.0, cos(theta)));
                
                // Compute Lambertian diffuse illumination for the terminator
                float diffuse = dot(normal, lightDir);
                
                // Sharp terminator (realistic for no lunar atmosphere)
                float lit = smoothstep(0.02, 0.1, diffuse) * moonMask;
                
                // Earthshine (extremely faint visibility of the shadowed side)
                float earthshine = moonMask * 0.05;
                float finalMoon = max(lit, earthshine);
                
                // Dynamic outer atmospheric bloom radiating outward
                float glow = smoothstep(0.6, 0.0, dist) * 0.6;
                // Dim the atmospheric bloom when it's a new moon
                float phaseGlowScalar = max(0.1, (1.0 + cos(theta)) * 0.5); 
                
                float alpha = clamp(finalMoon + glow * phaseGlowScalar, 0.0, 1.0) * opacity;
                
                // Physical horizon clip (fades out as it crosses Y=0 to Y=-2)
                float fragY = worldY + vLocalY;
                float horizonFade = smoothstep(-2.0, 2.0, fragY);
                alpha *= horizonFade;
                
                vec3 finalColor = mix(color, vec3(1.0), finalMoon * 0.4);
                gl_FragColor = vec4(finalColor, alpha);
              }
            `}
         />
       </mesh>
    </group>
  );
}

// Calculate the precise lunar synodic phase (0.0 to 1.0)
function getMoonPhase(timeMs: number): number {
    // Known new moon epoch: Jan 6, 2000, 18:14 UTC
    const knownNewMoon = new Date('2000-01-06T18:14:00Z').getTime();
    const synodicMonth = 29.53058770576 * 24 * 60 * 60 * 1000;
    const diff = timeMs - knownNewMoon;
    const phase = (diff % synodicMonth) / synodicMonth;
    return phase < 0 ? phase + 1 : phase;
}

export default function Scene({ wmoCode, currentTime, sunriseTime, sunsetTime, windSpeedMph, solarRadiation, rainRate }: { wmoCode: number, currentTime?: number, sunriseTime?: number, sunsetTime?: number, windSpeedMph?: number, solarRadiation?: number, rainRate?: number }) {
  
  // Calculate current moon phase based on the simulated or live time
  const currentMoonPhase = useMemo(() => getMoonPhase(currentTime || Date.now()), [currentTime]);
  let isClear = wmoCode === 0 || wmoCode === 1;
  let isPartlyCloudy = wmoCode === 2;
  let isCloudy = wmoCode === 3;
  let isFog = wmoCode >= 45 && wmoCode <= 48;
  let isDrizzle = wmoCode >= 51 && wmoCode <= 57;
  let isRain = (wmoCode >= 61 && wmoCode <= 64) || (wmoCode >= 80 && wmoCode <= 81);
  let isHeavyRain = (wmoCode >= 65 && wmoCode <= 67) || (wmoCode >= 82 && wmoCode <= 83) || wmoCode >= 95;
  let isSnow = (wmoCode >= 71 && wmoCode <= 77) || (wmoCode >= 85 && wmoCode <= 86);
  let isStorm = wmoCode >= 95;

  // Use local station rain rate to override WMO codes if there is an active local rain event
  if (rainRate !== undefined && rainRate > 0) {
      isClear = false;
      isPartlyCloudy = false;
      isRain = true; // force rendering of rain mesh
      if (rainRate > 8) {
          isHeavyRain = true;
          isDrizzle = false;
      } else if (rainRate < 2.5 && !isHeavyRain) {
          isDrizzle = true;
      }
  }

  let hasClouds = isCloudy || isPartlyCloudy || isDrizzle || isRain || isHeavyRain || isSnow || isStorm || isFog;

  // Day/Night and Sun Positioning
  let sunY = -20;
  let sunX = 0;
  let sunZ = -120; // Anchor it deep into the scene background
  
  let moonY = -20;
  let moonX = -80; // Default offscreen
  let moonZ = -120; // Anchor it in the exact same Z plane as the sun so the user doesn't have to rotate the camera 180 degrees
  
  let isDay = true;

  if (currentTime && sunriseTime && sunsetTime) {
      isDay = currentTime >= sunriseTime && currentTime < sunsetTime;
      const msPerDay = 24 * 60 * 60 * 1000;
      
      // Calculate continuous Sun Position
      if (isDay) {
          const dayLength = sunsetTime - sunriseTime;
          const progress = (currentTime - sunriseTime) / dayLength; // 0.0 to 1.0 throughout the day
          const angle = Math.PI * progress; 
          sunX = 140 * Math.cos(angle); // 140 -> -140
          sunY = 70 * Math.sin(angle); // 0 -> 70 -> 0
          
          moonX = -sunX;
          moonY = -sunY; // Sunk beneath the floor
      } else {
          let nightProgress;
          if (currentTime >= sunsetTime) {
              const nextSunrise = sunriseTime + msPerDay;
              const nightLength = nextSunrise - sunsetTime;
              nightProgress = (currentTime - sunsetTime) / nightLength;
          } else {
              const prevSunset = sunsetTime - msPerDay;
              const nightLength = sunriseTime - prevSunset;
              nightProgress = (currentTime - prevSunset) / nightLength;
          }
          
          const nightAngle = Math.PI * nightProgress; 
          
          // Full Moon visual parity: as Sun sets at -140 (West), Moon rises at 140 (East)
          moonX = 140 * Math.cos(nightAngle); 
          moonY = 70 * Math.sin(nightAngle); 
          
          sunX = -moonX;
          sunY = -moonY; // Sun travels backwards underground
      }
  }

  // Base Weather Aesthetics
  let baseCloudColor = '#ffffff';
  let baseWorldLight = 1.0;
  let weatherRayleigh = 0.5;
  let weatherTurbidity = 0.1;
  let weatherMie = 0.005;

  if (isFog) {
      baseCloudColor = '#b0c4de';
      baseWorldLight = 0.5;
      weatherTurbidity = 15;
      weatherRayleigh = 2.5;
      weatherMie = 0.03;
  } else if (isStorm || isHeavyRain) {
      baseCloudColor = '#2b3036';
      baseWorldLight = 0.2;
      weatherTurbidity = 10;
      weatherRayleigh = 1.0;
      weatherMie = 0.01;
  } else if (isRain) {
      baseCloudColor = '#606e7a';
      baseWorldLight = 0.4;
      weatherTurbidity = 5;
      weatherRayleigh = 0.8;
  } else if (isDrizzle) {
      baseCloudColor = '#a0aec0';
      baseWorldLight = 0.7;
      weatherTurbidity = 2;
      weatherRayleigh = 0.5;
  } else if (isSnow) {
      baseCloudColor = '#e5ecf0';
      baseWorldLight = 0.8;
      weatherTurbidity = 3;
      weatherRayleigh = 0.5;
  } else if (isCloudy) {
      baseCloudColor = '#a0aec0';
      baseWorldLight = 0.6;
      weatherTurbidity = 4;
      weatherRayleigh = 1.0;
  } else if (isPartlyCloudy) {
      weatherTurbidity = 0.8;
      weatherRayleigh = 0.4;
  } else {
      weatherTurbidity = 0.1;
      weatherRayleigh = 0.2;
  }

  // Real-time Solar Radiation Integration
  if (isDay && solarRadiation !== undefined) {
      const radScalar = Math.max(0.2, Math.min(1.5, solarRadiation / 800));
      baseWorldLight = (baseWorldLight * 0.4) + (radScalar * 0.6);
  }

  // 1. Calculate general day/night intensity multiplier based on sunY (-20 to +10)
  let timeOfDayLightBlend = 1.0;
  if (sunY > 10) timeOfDayLightBlend = 1.0;
  else if (sunY < -15) timeOfDayLightBlend = 0.0;
  else {
      timeOfDayLightBlend = (sunY + 15) / 25; 
      timeOfDayLightBlend = THREE.MathUtils.clamp(timeOfDayLightBlend, 0, 1);
  }

  // 2. Sunset/Sunrise factor (Peaks exactly at horizon Y=0 to Y=10)
  let sunsetFactor = 0;
  if (sunY > -15 && sunY < 25) {
      if (sunY >= 5) sunsetFactor = 1.0 - ((sunY - 5) / 20);
      else sunsetFactor = 1.0 - ((5 - sunY) / 20);
      
      sunsetFactor = THREE.MathUtils.clamp(sunsetFactor, 0, 1);
      sunsetFactor = sunsetFactor * sunsetFactor * (3 - 2 * sunsetFactor); // smoothstep
  }

  // Set Lighting Intensities
  let ambIntensity = THREE.MathUtils.lerp(0.1, 0.8, timeOfDayLightBlend) * baseWorldLight;
  let dirIntensity = THREE.MathUtils.lerp(0.2, 1.5, timeOfDayLightBlend) * baseWorldLight;

  // Set Colors (Base Day vs Deep Night)
  const currentCloudColor = new THREE.Color('#0b111a').lerp(new THREE.Color(baseCloudColor), timeOfDayLightBlend);
  const currentLightColor = new THREE.Color('#507094').lerp(new THREE.Color('#ffffff'), timeOfDayLightBlend);

  // Inject Vibrant Sunset/Sunrise Hues
  if (sunsetFactor > 0) {
      const sunsetOrangeLight = new THREE.Color('#ff7b00');
      currentLightColor.lerp(sunsetOrangeLight, sunsetFactor * 0.8);

      // Only tint clouds pink/orange if it's not raining/storming
      if (!isStorm && !isHeavyRain && !isRain && !isSnow) {
          const sunsetPinkCloud = new THREE.Color('#ff8fa3');
          // Add a touch of deep golden to the white mix for an epic sky fire
          const goldenMix = new THREE.Color('#ffa700').lerp(sunsetPinkCloud, 0.5);
          currentCloudColor.lerp(goldenMix, sunsetFactor * 0.7);
      }
  }

  const finalCloudColor = currentCloudColor.getStyle();
  const finalDirLightColor = currentLightColor.getStyle();

  // Majestic Sky Shader Parameters
  let skyParams = {
    turbidity: weatherTurbidity + (sunsetFactor * 0.3),
    rayleigh: THREE.MathUtils.lerp(0.05, weatherRayleigh, timeOfDayLightBlend) + (sunsetFactor * 2.5), 
    mieCoefficient: weatherMie + (sunsetFactor * 0.005),
    mieDirectionalG: 0.8,
    sunPosition: new THREE.Vector3(sunX, sunY, sunZ),
  };

  const cloudElements = useMemo(() => {
    return (
      <Clouds material={THREE.MeshLambertMaterial} limit={2000}>
        {isClear && (
          <>
             <Cloud position={[5, 16, -20]} bounds={[15, 2, 10]} volume={5} color={finalCloudColor} speed={0.02} opacity={0.15} />
             <Cloud position={[-10, 18, -15]} bounds={[10, 1.5, 8]} volume={3} color={finalCloudColor} speed={0.03} opacity={0.1} />
          </>
        )}

        {isPartlyCloudy && (
          <>
            <Cloud position={[-6, 12, -15]} bounds={[10, 5, 10]} volume={10} color={finalCloudColor} speed={0.04} opacity={0.6} />
            <Cloud position={[6, 14, -20]} bounds={[10, 4, 10]} volume={10} color={finalCloudColor} speed={0.03} opacity={0.7} />
            <Cloud position={[0, 16, -25]} bounds={[15, 6, 15]} volume={15} color={finalCloudColor} speed={0.02} opacity={0.5} />
          </>
        )}

        {(hasClouds && !isPartlyCloudy && !isClear) && (
          <>
            <Cloud position={[0, 14, -10]} bounds={[25, 8, 25]} volume={25} color={finalCloudColor} speed={isHeavyRain ? 0.1 : 0.04} opacity={0.8} />
            <Cloud position={[-15, 16, -20]} bounds={[25, 8, 25]} volume={25} color={finalCloudColor} speed={isHeavyRain ? 0.12 : 0.05} opacity={isFog ? 0.3 : 0.85} />
            <Cloud position={[15, 16, -15]} bounds={[25, 8, 25]} volume={25} color={finalCloudColor} speed={isHeavyRain ? 0.08 : 0.03} opacity={isFog ? 0.2 : 0.8} />
            <Cloud position={[0, 18, -30]} bounds={[30, 10, 30]} volume={30} color={finalCloudColor} speed={isHeavyRain ? 0.06 : 0.02} opacity={0.9} />
            
            <Cloud position={[20, 16, 10]} bounds={[25, 8, 25]} volume={20} color={finalCloudColor} speed={isHeavyRain ? 0.08 : 0.02} opacity={0.8} />
            <Cloud position={[-20, 16, 10]} bounds={[25, 8, 25]} volume={20} color={finalCloudColor} speed={isHeavyRain ? 0.08 : 0.02} opacity={0.8} />
            <Cloud position={[0, 18, 15]} bounds={[30, 8, 30]} volume={20} color={finalCloudColor} speed={isHeavyRain ? 0.08 : 0.02} opacity={0.8} />
            
            {isHeavyRain && (
              <>
                <Cloud position={[5, 20, -5]} bounds={[35, 10, 35]} volume={40} color={finalCloudColor} speed={0.1} opacity={0.95} />
                <Cloud position={[-10, 22, 5]} bounds={[35, 10, 35]} volume={40} color={finalCloudColor} speed={0.09} opacity={0.95} />
              </>
            )}
          </>
        )}
      </Clouds>
    );
  }, [isClear, isPartlyCloudy, hasClouds, isHeavyRain, isFog, finalCloudColor]);

  return (
    <Canvas camera={{ position: [0, 8, 20], fov: 65 }} dpr={[1, 1.5]} frameloop="always">
      {isFog ? <fogExp2 attach="fog" color={!isDay ? '#060a10' : '#8a9cad'} density={0.06} /> : null}
      
      <Suspense fallback={null}>
        {(!isDay && (isClear || isPartlyCloudy)) && (
           <Stars radius={100} depth={50} count={isClear ? 4000 : 1500} factor={4} saturation={0} fade speed={1} />
        )}

        {/* By adding a massive drop on the Y axis, we maintain the beautiful zenith blue but physically push the grey shader horizon mist down beneath the floor */}
        <group position={[0, -50000, 0]}>
            <Sky {...skyParams} />
        </group>
        
        <SmoothLighting 
          ambIntensity={ambIntensity} 
          dirIntensity={dirIntensity} 
          sunX={sunX}
          sunY={Math.max(10, sunY)} 
          sunZ={sunZ}
          finalDirLightColor={finalDirLightColor} 
          isDay={isDay} 
        />

        {/* Clouds container */}
        <CloudDrifter windSpeed={windSpeedMph}>
          {cloudElements}
        </CloudDrifter>

        {/* Physical Celestial Bodies */}
        <AnimatedSun 
          sunX={sunX} 
          sunY={sunY} 
          sunZ={sunZ} 
          hasClouds={hasClouds && !isPartlyCloudy}
        />
        <AnimatedMoon 
          sunX={moonX} 
          sunY={moonY} 
          sunZ={moonZ} 
          hasClouds={hasClouds && !isPartlyCloudy}
          phase={currentMoonPhase}
        />

        {isStorm && <Lightning />}

        {(isRain || isHeavyRain || isDrizzle) && <Rain heavy={isHeavyRain} drizzle={isDrizzle} windSpeed={windSpeedMph} />}
        {isSnow && <Snow />}

        <OrbitControls 
          makeDefault 
          target={[0, 9, 0]}
          minPolarAngle={0} 
          maxPolarAngle={Math.PI / 2} 
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
