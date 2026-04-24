import express from "express";
import { createServer as createViteServer } from "vite";
import mqtt from "mqtt";
import path from "path";
import { fileURLToPath } from "url";

// Get directory name when using ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // 1. MQTT Connection to User's Server
  let latestMqttData: any = null;
  
  // Note: 1883 is the standard TCP port for MQTT. Because browsers cannot make direct TCP connections, 
  // setting up this NodeJS Express backend is the perfect architecture to stream the data to the UI!
  const client = mqtt.connect('mqtt://mqtt.cetools.org:1883');
  
  client.on('connect', () => {
    console.log('✅ Connected to TCP MQTT Broker at mqtt.cetools.org:1883');
    client.subscribe('personal/ucfnaps/downhamweather/loop', (err) => {
      if (!err) console.log('📡 Subscribed to loop topic');
    });
    client.subscribe('personal/ucfnaps/downhamweather/barotrend', (err) => {
      if (!err) console.log('📡 Subscribed to barotrend topic');
    });
    client.subscribe('personal/ucfnaps/downhamweather/windmax', (err) => {
      if (!err) console.log('📡 Subscribed to windmax topic');
    });
  });

  client.on('message', (topic, message) => {
    try {
      const payloadStr = message.toString();
      if (topic === 'personal/ucfnaps/downhamweather/loop') {
          // The loop sends a full JSON payload, merge it while keeping barotrend and windmax
          const parsed = JSON.parse(payloadStr);
          latestMqttData = { ...latestMqttData, ...parsed };
      } else if (topic === 'personal/ucfnaps/downhamweather/barotrend') {
          // Try to parse as JSON just in case, otherwise treat as string/number value
          let val = payloadStr;
          try {
              // some payloads are like '{"trend": -0.1}' but let's just assign direct if it's raw
              val = JSON.parse(payloadStr);
          } catch(e) {}
          
          if (!latestMqttData) latestMqttData = {};
          latestMqttData.barotrend = val;
      } else if (topic === 'personal/ucfnaps/downhamweather/windmax') {
          let val = payloadStr;
          try {
              val = JSON.parse(payloadStr);
          } catch(e) {}
          if (!latestMqttData) latestMqttData = {};
          latestMqttData.windmax = val;
      }
    } catch(e) {
      console.error(`Failed to handle MQTT message for ${topic}`, e);
    }
  });

  client.on('error', (err) => {
      console.error('MQTT Connection Error:', err);
  });

  // 2. Server-Sent Events (SSE) Endpoint for real-time Frontend updates
  app.get("/api/weather/live", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Immediately send the latest data if we have it
    if (latestMqttData) {
      res.write(`data: ${JSON.stringify(latestMqttData)}\n\n`);
    }

    // Ping the frontend every 2.5 seconds with latest data
    const interval = setInterval(() => {
      if (latestMqttData) {
        res.write(`data: ${JSON.stringify(latestMqttData)}\n\n`);
      }
    }, 2500);

    req.on("close", () => clearInterval(interval));
  });

  // 3. Mount Vite Middleware for UI
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Weather Engine Backend running on http://localhost:${PORT}`);
  });
}

startServer();
