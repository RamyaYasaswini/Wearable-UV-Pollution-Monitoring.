const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

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
let lastError = "Waiting for ESP32 upload";

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Wearable Monitoring System API is running",
    esp32Connected
  });
});

// Dashboard reads the latest uploaded sensor values here.
app.get("/api/sensor-data", (req, res) => {
  res.json({
    success: true,
    connected: esp32Connected,
    error: lastError,
    data: latestReading
  });
});

// ESP32 sends readings to this endpoint.
app.post("/api/sensor-data", (req, res) => {
  const body = req.body;

  const required = [
    "temperature",
    "humidity",
    "uvIndex",
    "pollution"
  ];

  for (const key of required) {
    if (
      typeof body[key] !== "number" ||
      !Number.isFinite(body[key])
    ) {
      return res.status(400).json({
        success: false,
        message: `Invalid or missing sensor value: ${key}`
      });
    }
  }

  if (
    body.temperature < -40 || body.temperature > 85 ||
    body.humidity < 0 || body.humidity > 100 ||
    body.uvIndex < 0 || body.pollution < 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Sensor readings are outside the allowed range"
    });
  }

  const optionalNumber = (key) =>
    typeof body[key] === "number" &&
    Number.isFinite(body[key])
      ? body[key]
      : null;

  latestReading = {
    temperature: body.temperature,
    humidity: body.humidity,
    uvIndex: body.uvIndex,
    pollution: body.pollution,
    dust: optionalNumber("dust"),
    uvRaw: optionalNumber("uvRaw"),
    uvVoltage: optionalNumber("uvVoltage"),
    pressure: optionalNumber("pressure"),
    altitude: optionalNumber("altitude"),
    acceleration: optionalNumber("acceleration"),
    alarm: body.alarm === true,
    reason: typeof body.reason === "string"
      ? body.reason
      : "NORMAL",
    wifi: body.wifi === true,
    timestamp: new Date().toISOString()
  };

  esp32Connected = true;
  lastError = null;

  console.log("[ESP32] Sensor data received:", latestReading);

  res.status(201).json({
    success: true,
    message: "Sensor data received successfully",
    data: latestReading
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sensor API running on port ${PORT}`);
});
