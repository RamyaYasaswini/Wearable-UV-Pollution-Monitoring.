const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

let latestReading = {
  temperature: null,
  humidity: null,
  uvIndex: null,
  pollution: null,
  timestamp: null
};

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Wearable Monitoring System API is running"
  });
});

app.get("/api/sensor-data", (req, res) => {
  res.json({
    success: true,
    data: latestReading
  });
});

app.post("/api/sensor-data", (req, res) => {
  const { temperature, humidity, uvIndex, pollution, timestamp } = req.body;

  const values = [temperature, humidity, uvIndex, pollution];
  if (temperature < -40 || temperature > 85 ||
    humidity < 0 || humidity > 100 ||
    uvIndex < 0 || pollution < 0) {
  return res.status(400).json({
    success: false,
    message: "Sensor readings are outside the allowed range"
  });
}

  if (!values.every(value => typeof value === "number" && Number.isFinite(value))) {
    return res.status(400).json({
      success: false,
      message: "All sensor readings must be valid numbers"
    });
  }

  const date = new Date(timestamp);

  if (typeof timestamp !== "string" || !Number.isFinite(date.getTime())) {
    return res.status(400).json({
      success: false,
      message: "A valid timestamp is required"
    });
  }

  latestReading = {
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

app.listen(PORT, () => {
  console.log(`Sensor API running at http://localhost:${PORT}`);
});