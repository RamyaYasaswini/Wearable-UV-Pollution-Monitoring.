async function getSensorData() {
    try {
        const response = await fetch("http://localhost:3000/api/sensor-data");

        if (!response.ok) {
            throw new Error("Failed to get sensor data");
        }

        const result = await response.json();

        console.log("Latest Sensor Data:", result.data);
    } catch (error) {
        console.error("Could not connect to the API:", error.message);
    }
}

getSensorData();
setInterval(getSensorData, 5000);