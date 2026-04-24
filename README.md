# 3D Weather Station Dashboard

A highly immersive, real-time weather dashboard that beautifully visualizes live weather conditions through an interactive 3D environment and a sleek, glassmorphism UI.

## Features

- **Live 3D Weather Environment:** Built with React Three Fiber (`@react-three/fiber`) and Three.js, the background scene dynamically changes to reflect the current weather:
  - **Dynamic Time of Day:** The Sun and Moon follow realistic trajectories based on actual sunrise and sunset times. Enjoy vibrant, colorful sunsets and sunrises.
  - **Procedural Clouds:** Volumetric clouds scale, tint, and change density depending on whether it's clear, overcast, or storming.
  - **Weather FX:** Real-time particle systems for rain and snow. Fog effects scale in thickness based on visibility data.
  - **Lightning:** Dynamic lightning flashes trigger during thunderstorms.
- **On-Screen Rain Drops:** Screen-space rain droplets dynamically appear, streak, and fade when it's raining in the app.
- **Live Sensor Integration (MQTT):** Connects to local weather station sensors via MQTT for instant parameter updates (Temperature, Wind, Pressure, etc.).
- **Weather API Fallback:** Seamlessly supplements missing data or acts as the primary data source using the Open-Meteo API (Current, Hourly, Daily forecasts & Air Quality).
- **Responsive Glass UI:** A responsive, elegant dashboard built with Tailwind CSS and Framer Motion, displaying:
  - Temperature & Feels Like
  - Precipitation
  - Wind Speed & Direction (with compass dial)
  - Relative Humidity
  - Air Quality (AQI and PM2.5)
  - Light / UV Index
  - Cloudbase / Visibility
  - Barometric Pressure & Trend

## Technology Stack

- **Framework:** React + Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Lucide Icons
- **Animation:** Motion (`motion/react`)
- **3D Graphics:** Three.js, `@react-three/fiber`, `@react-three/drei`
- **Data Sources:** 
  - Open-Meteo API (Weather & AQI)
  - MQTT via `mqtt` package (WebSocket)

## Setup & Running

This project uses standard Vite environment configuration.

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Build for production
npm run build
```

## How It Works

1. **Location & Time API:** The app fetches the local weather for "Downham Market, Fincham". It extracts precise sunrise and sunset times.
2. **3D Scene Orchestration (`Scene.tsx`):** The sun traverses its arc based on the progress of the day relative to sunrise and sunset. Weather codes govern cloud density, particle emitters (rain, snow), and ambient lighting hues.
3. **MQTT (`App.tsx`):** If an MQTT broker is provided, the dashboard updates on every payload received, achieving sub-second latency for local weather sensors. If unavailable, it periodically polls the Open-Meteo API.
4. **UI Updates (`WeatherDashboard.tsx`):** The data is parsed into easily understandable metric cards which are mapped responsive to screen size.
