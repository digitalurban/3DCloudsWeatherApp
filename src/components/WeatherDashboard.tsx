import { CloudRain, Sun, Wind, Droplets, Cloud as CloudIcon, ThermometerSun, Eye, Gauge, SunDim, Sunrise, Navigation, TrendingUp, TrendingDown, Minus, CloudSun, CloudFog, CloudSnow, CloudLightning } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

function useContinuousRotation(targetDegree: number | undefined) {
  const [rotation, setRotation] = useState(targetDegree ?? 0);
  
  useEffect(() => {
    if (targetDegree === undefined) return;
    setRotation(prev => {
        // Find shortest path to target degree to prevent backwards spinning
        let delta = targetDegree - (prev % 360);
        // Adjust for negative modulo in JS
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        return prev + delta;
    });
  }, [targetDegree]);
  
  return rotation;
}

const CompassRose = ({ degree }: { degree: number | undefined }) => {
    const rotation = useContinuousRotation(degree);
    return (
        <div className="relative w-7 h-7 lg:w-9 lg:h-9 rounded-full border border-white/20 flex items-center justify-center ml-2 bg-black/20 shrink-0">
             <div className="absolute top-0 w-full text-center text-[5px] lg:text-[6px] font-sans text-white/40 leading-none pt-0.5">N</div>
             <div className="absolute right-0.5 h-full flex items-center text-[5px] lg:text-[6px] font-sans text-white/40 leading-none">E</div>
             <div className="absolute bottom-0 w-full text-center text-[5px] lg:text-[6px] font-sans text-white/40 leading-none pb-0.5">S</div>
             <div className="absolute left-0.5 h-full flex items-center text-[5px] lg:text-[6px] font-sans text-white/40 leading-none">W</div>
             <motion.div 
               animate={{ rotate: rotation }}
               transition={{ type: "spring", stiffness: 40, damping: 15 }}
               className="text-white z-10"
             >
                <Navigation className="w-3 h-3 lg:w-4 lg:h-4" fill="currentColor" />
             </motion.div>
        </div>
    );
};

export const getWmoIcon = (code: number) => {
  if (code === 0) return Sun;
  if (code === 1 || code === 2) return CloudSun;
  if (code === 3) return CloudIcon;
  if (code >= 45 && code <= 48) return CloudFog;
  if (code >= 51 && code <= 67) return CloudRain;
  if (code >= 71 && code <= 77) return CloudSnow;
  if (code >= 80 && code <= 82) return CloudRain;
  if (code >= 85 && code <= 86) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return CloudIcon;
};

export const getWmoDescription = (code: number) => {
  if (code === 0) return 'Clear skies';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Sunny spells';
  if (code === 3) return 'Overcast';
  if (code >= 45 && code <= 48) return 'Foggy';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 85 && code <= 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Unknown';
};

const Card = ({ title, icon: Icon, value, unit, sub, rightElement }: { title: string, icon: any, value: string | React.ReactNode, unit?: string, sub?: string | React.ReactNode, rightElement?: React.ReactNode }) => (
  <div className="backdrop-blur-xl bg-black/60 border border-white/20 p-1.5 md:p-2 lg:p-3 flex flex-col text-white shadow-2xl transition-all duration-300 hover:bg-black/80 flex-[0_0_auto] md:flex-1 min-w-[90px] md:min-w-0 snap-start justify-center">
    <div className="flex items-center justify-between mb-0.5 lg:mb-1 pb-1 border-b border-white/20">
      <span className="text-[8px] md:text-[10px] lg:text-[11px] font-sans uppercase tracking-[0.1em] lg:tracking-[0.2em] line-clamp-1 truncate mr-1">{title}</span>
      <Icon size={12} className="text-white opacity-80 shrink-0 lg:w-3.5 lg:h-3.5" />
    </div>
    <div className="flex items-center">
        <div className="text-xs md:text-sm lg:text-lg font-serif tracking-tight truncate flex items-baseline relative min-h-[1.2rem] gap-[0.2em]">
           <AnimatePresence mode="popLayout">
             <motion.span
               key={String(value)}
               initial={{ opacity: 0, y: 5, filter: 'blur(2px)' }}
               animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
               exit={{ opacity: 0, y: -5, filter: 'blur(2px)' }}
               transition={{ duration: 0.4, ease: "easeOut" }}
               className="inline-block"
             >
               {value}
             </motion.span>
           </AnimatePresence>
           {unit && <span className="inline-block">{unit.trim()}</span>}
        </div>
        {rightElement && (
            <div className="ml-auto">
                {rightElement}
            </div>
        )}
    </div>
    {sub && <div className="mt-0.5 lg:mt-1 text-[7px] md:text-[8px] lg:text-[9px] font-sans uppercase tracking-widest opacity-60 truncate relative min-h-[1.2em] flex items-center">{sub}</div>}
  </div>
);

export default function WeatherDashboard({ condition, realData, mqttData }: { condition: string; realData: any; mqttData?: any }) {
  
  const [forecastView, setForecastView] = useState<'hourly'|'daily'>('hourly');
  
  // Extract from MQTT Data natively, or fallback to realData (Open-Meteo)
  const tempVal = mqttData?.outTemp_C ? parseFloat(mqttData.outTemp_C).toFixed(1) 
      : realData ? realData.current.temperature_2m : '--';
  
  // Use THSW index (Temperature, Humidity, Sun, Wind) for the feels like if available, fallback to windchill, fallback to high/low
  const feelsLike = mqttData?.THSW_C ? Math.round(parseFloat(mqttData.THSW_C)) 
      : mqttData?.windchill_C ? Math.round(parseFloat(mqttData.windchill_C)) : undefined;
      
  const tempMax = realData?.daily?.temperature_2m_max?.[0];
  const tempMin = realData?.daily?.temperature_2m_min?.[0];
  
  const tempSub = feelsLike !== undefined 
      ? `Feels ${feelsLike}°` 
      : (tempMax !== undefined && tempMin !== undefined) 
        ? `H:${Math.round(tempMax)}° L:${Math.round(tempMin)}°` 
        : 'Actual Temp';

  // Precipitation (Today's forecast vs current live rate)
  const precipDay = realData?.daily?.precipitation_sum?.[0];
  const precipVal = mqttData?.dayRain_mm !== undefined ? parseFloat(mqttData.dayRain_mm).toFixed(1) 
      : precipDay !== undefined ? precipDay : '--';
  
  const rainSub = mqttData?.rainRate_mm_per_hour && parseFloat(mqttData.rainRate_mm_per_hour) > 0 
      ? `Rate: ${mqttData.rainRate_mm_per_hour} mm/hr` : 'Today';

  const windDirDegree = mqttData?.windDir ? Math.round(parseFloat(mqttData.windDir)) : undefined;
  
  const windVal = mqttData?.windSpeed_mph ? mqttData.windSpeed_mph : realData ? Math.round(realData.current.wind_speed_10m) : '--';
      
  const gustStr = mqttData?.windGust10 && parseFloat(mqttData.windGust10) > 0 ? ` • Gust ${Math.round(parseFloat(mqttData.windGust10))}` : '';
  const windDir = mqttData?.windDir ? `DIR ${windDirDegree}°${gustStr}` : 'API Winds';

  const humidityVal = mqttData?.outHumidity ? Math.round(parseFloat(mqttData.outHumidity)) 
      : realData ? realData.current.relative_humidity_2m : '--';
      
  const uvVal = mqttData?.UV ? parseFloat(mqttData.UV).toFixed(1) 
      : realData && realData.daily ? Math.round(realData.daily.uv_index_max[0]) : '--';
      
  const radiationVal = mqttData?.radiation_Wpm2 ? parseFloat(mqttData.radiation_Wpm2) : undefined;
  
  let lightRightElement = undefined;
  if (radiationVal !== undefined) {
      lightRightElement = (
          <div className="flex items-baseline pl-2 border-l border-white/20 ml-1 h-full text-xs md:text-sm lg:text-lg font-serif">
              <span>{Math.round(radiationVal)}</span>
              <span className="inline-block ml-1">W/m²</span>
          </div>
      )
  }
      
  const cloudbaseVal = mqttData?.cloudbase_meter ? Math.round(parseFloat(mqttData.cloudbase_meter)) 
      : realData ? (realData.current.visibility / 1000).toFixed(1) : '--';
      
  const pressureVal = mqttData?.barometer_mbar ? Math.round(parseFloat(mqttData.barometer_mbar)) 
      : realData ? Math.round(realData.current.surface_pressure) : '--';
      
  let baroSub = "MSL";
  let baroRightElement = undefined;
  
  if (mqttData?.barotrend !== undefined) {
      let trendVal;
      // Handle the fact it might arrive as a JSON object like {"trend": -1} or a raw value
      if (typeof mqttData.barotrend === 'object' && mqttData.barotrend !== null) {
          trendVal = Object.values(mqttData.barotrend)[0] as number;
      } else {
          trendVal = parseFloat(mqttData.barotrend);
      }
      
      if (!isNaN(trendVal)) {
          baroSub = `Trend: ${trendVal > 0 ? '+' : ''}${trendVal.toFixed(1)}/h`;
          
          let TrendIcon = Minus;
          let trendColor = "text-white/60";
          
          if (trendVal >= 0.5) {
              TrendIcon = TrendingUp;
              trendColor = "text-emerald-400";
          } else if (trendVal <= -0.5) {
              TrendIcon = TrendingDown;
              trendColor = "text-red-400";
          }
          
          baroRightElement = (
              <motion.div 
                 initial={{ opacity: 0, scale: 0.5 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className={`ml-2 bg-black/20 p-1 lg:p-1.5 rounded-full border border-white/10 ${trendColor}`}
              >
                  <TrendIcon size={14} className="lg:w-4 lg:h-4" />
              </motion.div>
          );
      }
  }
  
  const description = realData ? getWmoDescription(realData.current.weather_code) : 'Loading...';
  
  // Format sunrise / sunset time
  let sunStr = '--:-- / --:--';
  if (realData?.daily?.sunrise?.[0] && realData?.daily?.sunset?.[0]) {
    const srDate = new Date(realData.daily.sunrise[0]);
    const ssDate = new Date(realData.daily.sunset[0]);
    sunStr = `${srDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${ssDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  // Parse Hourly Forecast (Next 24 hours)
  const hourlyData = [];
  const dailyData = [];
  
  if (realData?.hourly?.time) {
    const now = new Date().getTime();
    let startIndex = realData.hourly.time.findIndex((t: string) => new Date(t).getTime() > now);
    if (startIndex === -1) startIndex = 0; // Fallback
    
    // Grab the next 24 hours
    for (let i = startIndex; i < startIndex + 24; i++) {
        if (realData.hourly.time[i]) {
            const timeObj = new Date(realData.hourly.time[i]);
            hourlyData.push({
                time: timeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                temp: Math.round(realData.hourly.temperature_2m[i]),
                precipProb: realData.hourly.precipitation_probability[i],
                code: realData.hourly.weather_code[i]
            });
        }
    }
  }
  
  if (realData?.daily?.time) {
      for (let i = 0; i < Math.min(7, realData.daily.time.length); i++) {
          const dateObj = new Date(realData.daily.time[i]);
          const dayName = i === 0 ? 'Today' : dateObj.toLocaleDateString([], { weekday: 'short' });
          dailyData.push({
              day: dayName,
              tempMax: Math.round(realData.daily.temperature_2m_max[i]),
              tempMin: Math.round(realData.daily.temperature_2m_min[i]),
              precipProb: realData.daily.precipitation_probability_max?.[i] ?? 0,
              precipSum: realData.daily.precipitation_sum?.[i] ?? 0,
              code: realData.daily.weather_code?.[i] ?? 0
          });
      }
  }

  return (
    <div className="flex flex-col gap-1 lg:gap-4 pointer-events-auto w-full max-w-full mt-auto">
      {/* Top Row: Hourly/Daily Strip Only */}
      <div className="flex flex-col lg:flex-row gap-2 lg:gap-4 w-full justify-between lg:items-end">

        {/* Forecast Strip */}
        <div className="flex flex-col gap-0.5 lg:gap-2 overflow-hidden flex-1 min-w-0 w-full">
           <div className="flex items-center gap-2 ml-1">
             <button onClick={() => setForecastView('hourly')} className={`text-[7px] md:text-[9px] lg:text-[10px] font-sans uppercase tracking-[0.2em] transition-opacity ${forecastView === 'hourly' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}>Next 24 Hours</button>
             <span className="text-white/20 text-[8px]">|</span>
             <button onClick={() => setForecastView('daily')} className={`text-[7px] md:text-[9px] lg:text-[10px] font-sans uppercase tracking-[0.2em] transition-opacity ${forecastView === 'daily' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}>7 Days</button>
           </div>
           
           <div className="flex flex-nowrap overflow-x-auto gap-[1px] bg-white/20 p-[1px] w-full shadow-2xl scrollbar-hide snap-x scroll-smooth">
              {forecastView === 'hourly' ? (
                  hourlyData.length > 0 ? hourlyData.map((hr, idx) => {
                     const WmoIcon = getWmoIcon(hr.code);
                     return (
                     <div key={idx} className="backdrop-blur-xl bg-black/60 hover:bg-black/80 transition-all border border-white/20 p-1.5 lg:p-2.5 flex flex-col items-center justify-center text-white flex-[0_0_auto] min-w-[55px] snap-start">
                         <span className="text-[8px] lg:text-[10px] uppercase font-sans tracking-widest text-white/80">{hr.time}</span>
                         <WmoIcon className="w-3 h-3 lg:w-4 lg:h-4 mt-1 text-white opacity-80" />
                         <span className="text-sm lg:text-lg font-serif mt-0.5 lg:mt-1">{hr.temp}°</span>
                         <span className="text-[7px] lg:text-[9px] text-blue-300 mt-0.5 font-sans">{hr.precipProb}% </span>
                     </div>
                  )}) : (
                     <div className="backdrop-blur-xl bg-black/60 p-2 lg:p-3 text-white text-[10px] font-sans text-center w-full">Loading hourly forecast...</div>
                  )
              ) : (
                  dailyData.length > 0 ? dailyData.map((day, idx) => {
                      const WmoIcon = getWmoIcon(day.code);
                      return (
                      <div key={idx} className="backdrop-blur-xl bg-black/60 hover:bg-black/80 transition-all border border-white/20 p-1.5 lg:p-2.5 flex flex-col items-center justify-center text-white flex-1 min-w-[75px] snap-start">
                          <span className="text-[8px] lg:text-[10px] uppercase font-sans tracking-widest text-white/80">{day.day}</span>
                          <WmoIcon className="w-3.5 h-3.5 lg:w-5 lg:h-5 mt-1 text-white opacity-90" />
                          <div className="flex items-baseline gap-1 mt-0.5 lg:mt-1">
                              <span className="text-sm lg:text-lg font-serif text-white">{day.tempMax}°</span>
                              <span className="text-[9px] lg:text-xs font-serif text-white/50">{day.tempMin}°</span>
                          </div>
                          <span className="text-[7px] lg:text-[9px] text-blue-300 mt-0.5 font-sans whitespace-nowrap">
                            {day.precipProb}% <span className="text-white/40 ml-0.5">• {Number(day.precipSum).toFixed(1)}mm</span>
                          </span>
                      </div>
                  )}) : (
                     <div className="backdrop-blur-xl bg-black/60 p-2 lg:p-3 text-white text-[10px] font-sans text-center w-full">Loading daily forecast...</div>
                  )
              )}
           </div>
        </div>

      </div>

      {/* Cards flush to bottom, flex wrap, extending across the screen */}
      <div className="flex flex-nowrap overflow-x-auto gap-[1px] bg-white/20 p-[1px] w-full shadow-2xl scrollbar-hide snap-x scroll-smooth">
        <Card title="Temperature" icon={ThermometerSun} value={tempVal} unit="°C" sub={tempSub} />
        <Card title="Precipitation" icon={Droplets} value={precipVal} unit=" mm" sub={rainSub} />
        <Card title="Wind" icon={Wind} value={windVal} unit=" mph" sub={windDir} rightElement={<CompassRose degree={windDirDegree} />} />
        <Card title="Humidity" icon={CloudIcon} value={humidityVal} unit="%" sub="Relative" />
        <Card title="Light" icon={SunDim} value={uvVal} sub="UV" rightElement={lightRightElement} />
        <Card title={mqttData ? "Cloudbase" : "Visibility"} icon={Eye} value={cloudbaseVal} unit={mqttData ? " m" : " km"} sub="Above ground" />
        <Card title="Pressure" icon={Gauge} value={pressureVal} unit=" hPa" sub={baroSub} rightElement={baroRightElement} />
        <Card title="Sun" icon={Sunrise} value={sunStr} sub="Rise • Set" />
      </div>
    </div>
  );
}
