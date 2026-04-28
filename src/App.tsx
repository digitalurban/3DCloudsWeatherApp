import { useState, Suspense, useEffect } from 'react';
import Scene from './components/Scene';
import WeatherDashboard, { getWmoDescription } from './components/WeatherDashboard';
import ScreenDrops from './components/ScreenDrops';
import { MapPin, Clock, Loader2, Sunrise, Search, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type AppLocation = { name: string, lat: number, lon: number, isDefault: boolean };
const DEFAULT_LOCATION: AppLocation = { name: "Downham Market, Fincham", lat: 52.6075, lon: 0.3831, isDefault: true };

export default function App() {
  const [location, setLocation] = useState<AppLocation | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [weatherCondition, setWeatherCondition] = useState('clear');
  const [weatherData, setWeatherData] = useState<any>(null);
  const [mqttData, setMqttData] = useState<any>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState('');
  const [sceneTime, setSceneTime] = useState(() => new Date().getTime());
  
  const [initialLoading, setInitialLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery.trim()) return;
      
      setIsSearching(true);
      try {
          const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=en&format=json`);
          const data = await res.json();
          setSearchResults(data.results || []);
      } catch(err) {
          console.error("Geocoding failed", err);
          setSearchResults([]);
      } finally {
          setIsSearching(false);
      }
  };

  const handleSelectLocation = (result: any) => {
      setLocation({
          name: `${result.name}, ${result.country}`,
          lat: result.latitude,
          lon: result.longitude,
          isDefault: false
      });
  };

  // 1. Fetch OpenMeteo Data whenever location changes
  useEffect(() => {
    if (!location) return;

    setInitialLoading(true);
    setInitError(null);
    setWeatherData(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        setInitError((prev) => {
            if (!prev && !weatherData) return "Network timeout. The atmosphere API is taking too long to respond.";
            return prev;
        });
        setInitialLoading(false);
    }, 15000);

    const fetchWeather = async () => {
      try {
        const [res, airRes] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,weather_code,surface_pressure,wind_speed_10m,precipitation,visibility&hourly=temperature_2m,weather_code,precipitation_probability&daily=uv_index_max,sunrise,sunset,temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,precipitation_probability_max&wind_speed_unit=mph&timezone=auto`, { signal: controller.signal }),
            fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.lat}&longitude=${location.lon}&current=european_aqi,pm10,pm2_5&timezone=auto`, { signal: controller.signal }).catch(() => null)
        ]);
        
        if (!res.ok) throw new Error("API returned an error code.");
        const data = await res.json();
        
        let airData = null;
        if (airRes && airRes.ok) {
            airData = await airRes.json();
        }
        
        data.airQuality = airData;
        setWeatherData(data);
        const now = new Date();
        setLastUpdateTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setSceneTime(now.getTime());
        
        // Map WMO code to our internal 3D scene condition
        const code = data.current.weather_code;
        let cond = 'clear';
        if (code === 1 || code === 2) cond = 'partly_cloudy'; // this maps to our "Sunny Spells"
        else if (code === 3 || (code >= 45 && code <= 48)) cond = 'cloudy';
        else if (code >= 51 && code <= 67) cond = 'rain'; 
        else if (code >= 71 && code <= 77) cond = 'snow';
        else if (code >= 80 && code <= 82) cond = 'showers'; // Showers
        else if (code >= 85 && code <= 86) cond = 'snow';
        else if (code >= 95) cond = 'storm';
        
        setWeatherCondition(cond);
        setInitialLoading(false);
        setInitError(null);
      } catch(err: any) {
        if (err.name !== 'AbortError') {
            console.error("Failed to fetch weather", err);
            setInitError(err.message || "Failed to load atmospheric conditions.");
            setInitialLoading(false);
        }
      }
    };
    
    fetchWeather();
    
    // Auto update every 15 mins (15 * 60 * 1000 ms)
    const interval = setInterval(fetchWeather, 900000);
    return () => {
        clearInterval(interval);
        controller.abort();
        clearTimeout(timeoutId);
    };
  }, [location]);

  // 2. Open Server-Sent Events stream for MQTT Loop ONLY if default location
  useEffect(() => {
     if (!location || !location.isDefault) {
         setMqttData(null);
         return;
     }

     const evtSource = new EventSource('/api/weather/live');
     
     evtSource.onmessage = (event) => {
        try {
           const parsed = JSON.parse(event.data);
           setMqttData(parsed);
        } catch(e) {}
     };
     
     evtSource.onerror = (err) => {
        console.error("SSE Error:", err);
     }
     
     return () => evtSource.close();
  }, [location]);
  
  const liveDesc = weatherData ? getWmoDescription(weatherData.current.weather_code) : 'Loading...';

  // Rendering blocks
  const renderLocationScreen = () => (
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-sky-950/80 backdrop-blur-xl">
       <div className="w-full max-w-md bg-black/60 border border-white/20 shadow-2xl p-6 lg:p-10 flex flex-col items-center">
            <h1 className="text-xl lg:text-3xl font-serif text-white tracking-tight mb-2 text-center">Atmosphere</h1>
            <p className="text-[10px] lg:text-xs font-sans uppercase tracking-[0.2em] text-white/50 mb-8 text-center">Global Weather Simulation</p>
            
            <form onSubmit={handleSearch} className="w-full relative mb-6">
                <input 
                   type="text" 
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   placeholder="Enter a city..."
                   className="w-full bg-white/10 border border-white/20 text-white placeholder-white/40 px-4 py-3 pl-11 focus:outline-none focus:border-white/50 focus:bg-white/20 transition-colors font-sans text-sm rounded-none"
                />
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 transition-colors opacity-80 hover:opacity-100">
                    {isSearching ? <Loader2 size={16} className="animate-spin text-white" /> : <Navigation size={16} className="text-white" />}
                </button>
            </form>

            <div className="w-full h-48 overflow-y-auto pr-2 scrollbar-hide flex flex-col gap-2">
                {searchResults.map((res: any) => (
                    <button 
                        key={res.id} 
                        onClick={() => handleSelectLocation(res)}
                        className="text-left w-full p-3 bg-white/5 hover:bg-white/15 border border-transparent hover:border-white/20 transition-all flex flex-col"
                    >
                        <span className="text-sm font-sans text-white">{res.name}</span>
                        <span className="text-[10px] font-sans uppercase tracking-widest text-white/50 mt-1">{res.admin1 ? `${res.admin1}, ` : ''}{res.country}</span>
                    </button>
                ))}
            </div>

            <div className="w-full mt-6 pt-4 border-t border-white/10 flex flex-col items-center">
               <button 
                  onClick={() => setLocation(DEFAULT_LOCATION)}
                  className="text-xs font-sans uppercase tracking-[0.1em] text-white/60 hover:text-white transition-colors border-b border-white/20 pb-0.5 inline-flex items-center gap-1.5"
               >
                   <MapPin size={10} />
                   Or use default local station sensor
               </button>
            </div>
       </div>
    </div>
  );

  return (
    <div className="relative w-[100dvw] h-[100dvh] overflow-hidden bg-sky-900 font-sans text-white overscroll-none" style={{ touchAction: 'none' }}>
      {/* 3D Background - ALWAYS rendered to provide a beautiful backdrop even during location selection */}
      <div className="absolute inset-0 z-0 cursor-move touch-none" style={{ touchAction: 'none' }}>
         <Scene 
           wmoCode={weatherData?.current?.weather_code ?? 0}
           currentTime={sceneTime}
           sunriseTime={weatherData?.daily?.sunrise?.[0] ? new Date(weatherData.daily.sunrise[0]).getTime() : undefined}
           sunsetTime={weatherData?.daily?.sunset?.[0] ? new Date(weatherData.daily.sunset[0]).getTime() : undefined}
           windSpeedMph={mqttData ? parseFloat(mqttData.windSpeed_mph) : weatherData?.current?.wind_speed_10m}
           solarRadiation={mqttData?.radiation_Wpm2 ? parseFloat(mqttData.radiation_Wpm2) : undefined}
           rainRate={mqttData?.rainRate_mm_per_hour ? parseFloat(mqttData.rainRate_mm_per_hour) : undefined}
         />
      </div>

      {/* Screen Rain Splashes */}
      {location && !initialLoading && (
        <ScreenDrops 
          wmoCode={weatherData?.current?.weather_code ?? 0} 
          rainRate={mqttData?.rainRate_mm_per_hour ? parseFloat(mqttData.rainRate_mm_per_hour) : undefined} 
        />
      )}

      {/* Conditional Overlays */}
      {!location ? renderLocationScreen() : null}

      {initialLoading && location ? (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white z-50">
            <Loader2 className="w-8 h-8 md:w-12 md:h-12 animate-spin text-white/30" />
            <motion.span 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 text-xs md:text-sm font-sans uppercase tracking-[0.3em] text-white/60"
            >
               Gathering Conditions for {location.name}
            </motion.span>
        </div>
      ) : null}

      {initError && !weatherData && location ? (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white z-50 p-6 text-center">
            <div className="text-red-400 mb-4 border border-red-900/50 bg-red-950/40 backdrop-blur-md p-4 shadow-xl">
              <span className="block text-sm font-sans uppercase tracking-widest text-red-500 mb-2">Atmospheric Link Failed</span>
              <span className="block font-serif text-lg">{initError}</span>
            </div>
            <button onClick={() => setLocation(null)} className="px-6 py-2 border border-white/20 uppercase tracking-widest text-xs hover:bg-white/10 transition-colors">
               Select Another Location
            </button>
        </div>
      ) : null}

      {/* UI Overlay - Using flex col to push Dashboard to bottom, add pt- safe area for iOS notch */}
      {location && !initialLoading && weatherData && (
          <div 
            className="absolute inset-0 z-10 flex flex-col justify-between p-2 lg:p-6 pointer-events-none"
            style={{ 
              paddingTop: 'calc(env(safe-area-inset-top, 8px) + 20px)',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 8px)',
              paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 20px)',
              paddingRight: 'calc(env(safe-area-inset-right, 0px) + 20px)'
            }}
          >
            
            {/* Top Header */}
            <header className="pointer-events-auto flex flex-row items-start justify-between gap-1 w-full shrink-0">
              <div className="backdrop-blur-xl bg-black/60 p-2 lg:p-4 rounded-none border-l-2 border-white/20 shadow-2xl transition-all">
                <div className="flex flex-col gap-0.5 lg:gap-1.5 opacity-80">
                  <div className="flex items-center gap-1 text-white text-[8px] lg:text-sm font-sans uppercase tracking-widest cursor-pointer group" onClick={() => setLocation(null)}>
                    <MapPin size={10} className="group-hover:text-white/70 transition-colors" />
                    <span className="group-hover:text-white/70 transition-colors line-clamp-1 max-w-[200px] sm:max-w-[300px]">{location.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex items-center gap-1 text-white/80 text-[6px] lg:text-[9px] font-sans uppercase tracking-widest">
                      <Clock size={8} />
                      <span>{location.isDefault && mqttData ? 'Live' : 'API Data'}</span>
                    </div>
                    {weatherData?.daily?.sunrise?.[0] && weatherData?.daily?.sunset?.[0] && (
                        <div className="flex items-center gap-1 text-white/80 text-[6px] lg:text-[9px] font-sans uppercase tracking-widest pl-2 border-l border-white/20">
                          <Sunrise size={8} />
                          <span>
                            {new Date(weatherData.daily.sunrise[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • 
                            {new Date(weatherData.daily.sunset[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-1">
                <div className="backdrop-blur-xl bg-black/60 p-1 lg:p-3 shadow-2xl text-right shrink-0 border-r-2 border-white/20 flex flex-col items-end">
                     <span className="block text-[7px] lg:text-[10px] font-sans uppercase tracking-[0.2em] text-white/60 mb-0.5">Live Weather</span>
                     <span className="block text-[10px] lg:text-base font-serif italic whitespace-nowrap">{liveDesc}</span>
                     {lastUpdateTime && (
                       <span className="block text-[6px] lg:text-[9px] font-sans uppercase tracking-widest text-slate-300 mt-1 opacity-80 h-[1.2em] overflow-hidden whitespace-nowrap">
                         <AnimatePresence mode="popLayout">
                           <motion.div
                             key={lastUpdateTime}
                             initial={{ opacity: 0, y: 5 }}
                             animate={{ opacity: 1, y: 0 }}
                             exit={{ opacity: 0, y: -5 }}
                             transition={{ duration: 0.3 }}
                           >
                             API Updated: {lastUpdateTime}
                           </motion.div>
                         </AnimatePresence>
                       </span>
                     )}
                     <div className="hidden md:block text-[5px] lg:text-[7px] font-sans uppercase tracking-[0.3em] text-white/40 mt-1.5 pt-1.5 border-t border-white/10 select-none">
                       Drag & Pinch to explore
                     </div>
                </div>
              </div>
            </header>

            {/* Bottom UI Dashboard row */}
            <WeatherDashboard condition={weatherCondition} realData={weatherData} mqttData={location.isDefault ? mqttData : undefined} />
          </div>
      )}
    </div>
  );
}
