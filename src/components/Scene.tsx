import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, Clouds, Cloud, OrbitControls } from '@react-three/drei';
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

function Rain() {
  const dropCount = 5000;
  const positions = useMemo(() => {
    const p = new Float32Array(dropCount * 6); // 2 vertices per line (x,y,z, x,y,z)
    for (let i = 0; i < dropCount; i++) {
        const x = (Math.random() - 0.5) * 80;
        const y = Math.random() * 30;
        const z = (Math.random() - 0.5) * 80;
        
        p[i * 6] = x;
        p[i * 6 + 1] = y;
        p[i * 6 + 2] = z;
        
        // bottom point of raindrop streak (offset to show wind direction)
        p[i * 6 + 3] = x - 0.2; 
        p[i * 6 + 4] = y - 0.6;
        p[i * 6 + 5] = z;
    }
    return p;
  }, []);

  const ref = useRef<THREE.LineSegments>(null);
  useFrame((state, delta) => {
    if (!ref.current) return;
    const array = ref.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < dropCount; i++) {
      const speed = (25 + (i % 10)) * delta;
      const wind = 5 * delta;

      // move top vertex
      array[i * 6 + 1] -= speed;
      array[i * 6] -= wind;
      
      // move bottom vertex
      array[i * 6 + 4] -= speed;
      array[i * 6 + 3] -= wind;
      
      if (array[i * 6 + 4] < -2) {
        const newY = 25 + Math.random() * 10;
        const newX = (Math.random() - 0.5) * 40;
        
        array[i * 6] = newX;
        array[i * 6 + 1] = newY;
        
        array[i * 6 + 3] = newX - 0.2;
        array[i * 6 + 4] = newY - 0.6;
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
      <lineBasicMaterial color="#aaddff" transparent opacity={0.3} />
    </lineSegments>
  );
}

function CloudDrifter({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (ref.current) {
      // Very slow atmospheric rotation to make clouds sweep across the scene
      ref.current.rotation.y -= delta * 0.02; 
    }
  });
  return <group ref={ref}>{children}</group>;
}

export default function Scene({ condition }: { condition: string }) {
  const isStorm = condition === 'storm';
  const isShowers = condition === 'showers';
  const isRain = condition === 'rain' || isShowers;
  const isPartlyCloudy = condition === 'partly_cloudy';
  const isClear = condition === 'clear';
  const isSnow = condition === 'snow';
  
  // Cloudy lumps both regular cloudy and snowy/rainy clouds
  const isCloudy = condition === 'cloudy' || isRain || isSnow || isStorm;

  let skyParams = {
    turbidity: 1,
    rayleigh: 0.5,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.7,
    sunPosition: new THREE.Vector3(100, 20, 100),
  };

  let cloudColor = '#ffffff';
  let ambientLightIntensity = 0.8;
  let directionalLightIntensity = 1.5;

  if (isStorm) {
    skyParams.turbidity = 20;
    skyParams.rayleigh = 0.5;
    skyParams.sunPosition = new THREE.Vector3(100, 10, 100); 
    cloudColor = '#2b3036'; // deep dark thunder gray
    ambientLightIntensity = 0.2;
    directionalLightIntensity = 0.1;
  } else if (isRain) {
    skyParams.turbidity = isShowers ? 6 : 10;
    skyParams.rayleigh = 0.8;
    skyParams.sunPosition = new THREE.Vector3(100, 10, 100);
    cloudColor = isShowers ? '#8a9ba8' : '#606e7a'; 
    ambientLightIntensity = isShowers ? 0.6 : 0.5;
    directionalLightIntensity = isShowers ? 0.5 : 0.3;
  } else if (isSnow) {
    skyParams.turbidity = 8;
    skyParams.rayleigh = 0.5;
    skyParams.sunPosition = new THREE.Vector3(100, 15, 100);
    cloudColor = '#e5ecf0'; // bright flat winter white
    ambientLightIntensity = 0.7;
    directionalLightIntensity = 0.6;
  } else if (isCloudy && condition === 'cloudy') {
    skyParams.turbidity = 6;
    skyParams.rayleigh = 1.5;
    skyParams.sunPosition = new THREE.Vector3(100, 8, 100);
    cloudColor = '#a0aec0'; // soft gray
    ambientLightIntensity = 0.6;
    directionalLightIntensity = 0.8;
  } else if (isPartlyCloudy) {
    skyParams.turbidity = 2;
    skyParams.rayleigh = 0.5;
    skyParams.sunPosition = new THREE.Vector3(100, 20, 100);
    cloudColor = '#ffffff';
  } else {
    // clear
    skyParams.turbidity = 0.5;
    skyParams.rayleigh = 0.2;
    skyParams.sunPosition = new THREE.Vector3(100, 50, 100);
    cloudColor = '#ffffff';
  }

  return (
    <Canvas camera={{ position: [0, 2, 15], fov: 65 }}>
      <Suspense fallback={null}>
        <Sky {...skyParams} />
        
        <ambientLight intensity={ambientLightIntensity} />
        <directionalLight 
          position={[-100, Math.max(10, skyParams.sunPosition.y), 100]} 
          intensity={directionalLightIntensity} 
          color={cloudColor} 
        />
        <directionalLight position={[10, 10, -10]} intensity={0.5} />

        {/* Clouds container */}
        <CloudDrifter>
          <Clouds material={THREE.MeshLambertMaterial} limit={2000}>
            
            {isClear && (
              // As requested: clear should be 90% and a small wispy cloud
              <>
                 <Cloud 
                   position={[5, 10, -20]} 
                   bounds={[15, 2, 10]} 
                   volume={5} 
                   color={cloudColor} 
                   speed={0.1} 
                   opacity={0.15} 
                 />
                 <Cloud 
                   position={[-10, 12, -15]} 
                   bounds={[10, 1.5, 8]} 
                   volume={3} 
                   color={cloudColor} 
                   speed={0.15} 
                   opacity={0.1} 
                 />
              </>
            )}

            {isPartlyCloudy && (
              <>
                <Cloud position={[-6, 6, -15]} bounds={[10, 5, 10]} volume={10} color={cloudColor} speed={0.2} opacity={0.6} />
                <Cloud position={[6, 8, -20]} bounds={[10, 4, 10]} volume={10} color={cloudColor} speed={0.15} opacity={0.7} />
                <Cloud position={[0, 10, -25]} bounds={[15, 6, 15]} volume={15} color={cloudColor} speed={0.1} opacity={0.5} />
              </>
            )}

            {isCloudy && (
              <>
                <Cloud position={[0, 8, -10]} bounds={[25, 8, 25]} volume={25} color={cloudColor} speed={isRain || isStorm ? 0.4 : 0.2} opacity={0.8} />
                <Cloud position={[-15, 10, -20]} bounds={[25, 8, 25]} volume={25} color={cloudColor} speed={isRain || isStorm ? 0.5 : 0.25} opacity={0.85} />
                <Cloud position={[15, 10, -15]} bounds={[25, 8, 25]} volume={25} color={cloudColor} speed={isRain || isStorm ? 0.3 : 0.15} opacity={0.8} />
                <Cloud position={[0, 12, -30]} bounds={[30, 10, 30]} volume={30} color={cloudColor} speed={isRain || isStorm ? 0.2 : 0.1} opacity={0.9} />
                
                <Cloud position={[20, 10, 10]} bounds={[25, 8, 25]} volume={20} color={cloudColor} speed={isRain || isStorm ? 0.3 : 0.1} opacity={0.8} />
                <Cloud position={[-20, 10, 10]} bounds={[25, 8, 25]} volume={20} color={cloudColor} speed={isRain || isStorm ? 0.3 : 0.1} opacity={0.8} />
                <Cloud position={[0, 12, 15]} bounds={[30, 8, 30]} volume={20} color={cloudColor} speed={isRain || isStorm ? 0.3 : 0.1} opacity={0.8} />
              </>
            )}

          </Clouds>
        </CloudDrifter>

        {(isRain || isStorm) && <Rain />}
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
