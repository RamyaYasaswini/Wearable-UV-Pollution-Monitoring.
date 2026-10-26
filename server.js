
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

// ESP32 access-point address.
// If using your router instead, change this to the ESP32's router IP.
const ESP32_URL = process.env.ESP32_URL || "http://192.168.4.1";

app.use(cors());
app.use(express.json());

let latestReading = {
  temperature: null,
  humidity: null,
  uvIndex: null,
  pollution: null,
  dust: null,
  uvRaw: null,
  uvVoltage: null,
  pressure: null,
  altitude: null,
  acceleration: null,
  alarm: false,
  reason: "WAITING FOR ESP32",
  wifi: false,
  timestamp: null
};

let esp32Connected = false;
let lastError = null;
let polling = false;

// API home
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Wearable Monitoring System API is running",
    esp32Connected,
    esp32Url: ESP32_URL
  });
});

// Existing dashboard API
app.get("/api/sensor-data", (req, res) => {
  res.json({
    success: true,
    connected: esp32Connected,
    error: lastError,
    data: latestReading
  });
});

// Fetch live data directly from the ESP32
async function readESP32() {
  if (polling) return;
  polling = true;

  try {
    const response = await fetch(`${ESP32_URL}/data`, {
      signal: AbortSignal.timeout(4000)
    });

    if (!response.ok) {
      throw new Error(`ESP32 returned HTTP ${response.status}`);
    }

    const d = await response.json();

    // Preserve the original dashboard field names.
    latestReading = {
      temperature: d.temperature ?? null,
      humidity: d.humidity ?? null,
      uvIndex: d.uvIndex ?? null,

      // ESP32 dust value is raw ADC, not calibrated pollution.
      pollution: d.dust ?? null,
      dust: d.dust ?? null,

      uvRaw: d.uvRaw ?? null,
      uvVoltage: d.uvVoltage ?? null,
      pressure: d.pressure ?? null,
      altitude: d.altitude ?? null,
      acceleration: d.acceleration ?? null,

      alarm: d.alarm ?? false,
      reason: d.reason ?? "NORMAL",
      wifi: d.wifi ?? false,
      timestamp: new Date().toISOString()
    };

    esp32Connected = true;
    lastError = null;

    console.log(
      `[ESP32] Temp: ${latestReading.temperature}, ` +
      `Humidity: ${latestReading.humidity}, ` +
      `UV: ${latestReading.uvIndex}, ` +
      `Dust ADC: ${latestReading.dust}`
    );
  } catch (error) {
    esp32Connected = false;
    lastError = error.message;
    console.error("[ESP32] Connection failed:", error.message);
  } finally {
    polling = false;
  }
}

// Keep readings fresh
readESP32();
setInterval(readESP32, 2000);

// Preserve the existing POST endpoint for other data senders.
app.post("/api/sensor-data", (req, res) => {
  const { temperature, humidity, uvIndex, pollution, timestamp } = req.body;

  const values = [temperature, humidity, uvIndex, pollution];

  if (!values.every(
    value => typeof value === "number" && Number.isFinite(value)
  )) {
    return res.status(400).json({
      success: false,
      message: "All original sensor readings must be valid numbers"
    });
  }

  if (
    temperature < -40 || temperature > 85 ||
    humidity < 0 || humidity > 100 ||
    uvIndex < 0 || pollution < 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Sensor readings are outside the allowed range"
    });
  }

  const date = new Date(timestamp);

  if (
    typeof timestamp !== "string" ||
    !Number.isFinite(date.getTime())
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid timestamp is required"
    });
  }

  latestReading = {
    ...latestReading,
    temperature,
    humidity,
    uvIndex,
    pollution,
    timestamp: date.toISOString()
  };

  res.status(201).json({
    success: true,
    message: "Sensor data received successfully",
    data: latestReading
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sensor API running at http://localhost:${PORT}`);
  console.log(`Reading ESP32 from ${ESP32_URL}/data`);
});
