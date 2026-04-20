import { CloudRain, Sun, Wind, Droplets, Cloud as CloudIcon, ThermometerSun, Eye, Gauge, SunDim, Sunrise } from 'lucide-react';
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

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

const Card = ({ title, icon: Icon, value, unit, sub }: { title: string, icon: any, value: string | React.ReactNode, unit?: string, sub?: string }) => (
  <div className="backdrop-blur-xl bg-black/60 border border-white/20 p-2 md:p-3 lg:p-4 flex flex-col text-white shadow-2xl transition-all duration-300 hover:bg-black/80 flex-[0_0_auto] md:flex-1 min-w-[90px] md:min-w-0 snap-start">
    <div className="flex items-center justify-between mb-1 lg:mb-2 pb-1 border-b border-white/20">
      <span className="text-[8px] md:text-[10px] lg:text-[11px] font-sans uppercase tracking-[0.1em] lg:tracking-[0.2em] line-clamp-1 truncate mr-1">{title}</span>
      <Icon size={12} className="text-[#10b981] opacity-90 shrink-0 lg:w-3.5 lg:h-3.5" />
    </div>
    <div className="text-xs md:text-base lg:text-xl font-serif tracking-tight truncate flex items-baseline relative min-h-[1.2rem] gap-[0.2em]">
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
    {sub && <div className="mt-0.5 lg:mt-1 text-[7px] md:text-[8px] lg:text-[9px] font-sans uppercase tracking-widest opacity-60 truncate relative min-h-[1.2em]">{sub}</div>}
  </div>
);

export default function WeatherDashboard({ condition, realData, mqttData }: { condition: string; realData: any; mqttData?: any }) {
  
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

  const windVal = mqttData?.windSpeed_mph ? mqttData.windSpeed_mph 
      : realData ? Math.round(realData.current.wind_speed_10m) : '--';
      
  const gustStr = mqttData?.windGust10 && parseFloat(mqttData.windGust10) > 0 ? ` • Gust ${Math.round(parseFloat(mqttData.windGust10))}` : '';
  const windDir = mqttData?.windDir ? `DIR ${Math.round(parseFloat(mqttData.windDir))}°${gustStr}` 
      : 'API Winds';

  const humidityVal = mqttData?.outHumidity ? Math.round(parseFloat(mqttData.outHumidity)) 
      : realData ? realData.current.relative_humidity_2m : '--';
      
  const uvVal = mqttData?.UV ? parseFloat(mqttData.UV).toFixed(1) 
      : realData && realData.daily ? Math.round(realData.daily.uv_index_max[0]) : '--';
      
  const cloudbaseVal = mqttData?.cloudbase_meter ? Math.round(parseFloat(mqttData.cloudbase_meter)) 
      : realData ? (realData.current.visibility / 1000).toFixed(1) : '--';
      
  const pressureVal = mqttData?.barometer_mbar ? Math.round(parseFloat(mqttData.barometer_mbar)) 
      : realData ? Math.round(realData.current.surface_pressure) : '--';
  
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

  return (
    <div className="flex flex-col gap-1 lg:gap-4 pointer-events-auto w-full max-w-full mt-auto">
      {/* Top Row: Hourly Strip Only */}
      <div className="flex flex-col lg:flex-row gap-2 lg:gap-4 w-full justify-between lg:items-end">

        {/* Hourly Forecast Strip */}
        <div className="flex flex-col gap-0.5 lg:gap-2 overflow-hidden flex-1 min-w-0 w-full">
           <span className="text-[7px] md:text-[9px] lg:text-[10px] font-sans uppercase tracking-[0.2em] text-white/60 ml-1">Next 24 Hours</span>
           <div className="flex flex-nowrap overflow-x-auto gap-[1px] bg-white/20 p-[1px] w-full shadow-2xl scrollbar-hide snap-x scroll-smooth">
              {hourlyData.length > 0 ? hourlyData.map((hr, idx) => (
                 <div key={idx} className="backdrop-blur-xl bg-black/60 hover:bg-black/80 transition-all border border-white/20 p-2 lg:p-3 flex flex-col items-center justify-center text-white flex-1 min-w-[55px] lg:min-w-[0] snap-start">
                     <span className="text-[8px] lg:text-[10px] uppercase font-sans tracking-widest text-white/80">{hr.time}</span>
                     <span className="text-sm lg:text-xl font-serif mt-1 lg:mt-2">{hr.temp}°</span>
                     <span className="text-[7px] lg:text-[9px] text-blue-300 mt-0.5 lg:mt-1 font-sans">{hr.precipProb}% </span>
                 </div>
              )) : (
                 <div className="backdrop-blur-xl bg-black/60 p-2 lg:p-3 text-white text-[10px] font-sans text-center w-full">Loading hourly forecast...</div>
              )}
           </div>
        </div>

      </div>

      {/* Cards flush to bottom, flex wrap, extending across the screen */}
      <div className="flex flex-nowrap overflow-x-auto gap-[1px] bg-white/20 p-[1px] w-full shadow-2xl scrollbar-hide snap-x scroll-smooth">
        <Card title="Temperature" icon={ThermometerSun} value={tempVal} unit="°C" sub={tempSub} />
        <Card title="Precipitation" icon={Droplets} value={precipVal} unit=" mm" sub={rainSub} />
        <Card title="Wind" icon={Wind} value={windVal} unit=" mph" sub={windDir} />
        <Card title="Humidity" icon={CloudIcon} value={humidityVal} unit="%" sub="Relative" />
        <Card title="UV Index" icon={SunDim} value={uvVal} sub="Live" />
        <Card title={mqttData ? "Cloudbase" : "Visibility"} icon={Eye} value={cloudbaseVal} unit={mqttData ? " m" : " km"} sub="Above ground" />
        <Card title="Pressure" icon={Gauge} value={pressureVal} unit=" hPa" sub="MSL" />
        <Card title="Sun" icon={Sunrise} value={sunStr} sub="Rise • Set" />
      </div>
    </div>
  );
}
