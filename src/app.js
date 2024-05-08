const express = require("express");
const bodyParser = require("body-parser");
const DeviceDiscovery = require("./deviceManager");
const { saveOrUpdateDevice } = require("./updateDevice");
const {
    readMultipleProperties,
    startPolling,
    pollingResults,
} = require("./bacnetOperations");

const { fetchAndReadProperties, fetchAllDevices } = require("./readProperties");

const app = express();
const discovery = new DeviceDiscovery();

app.use(bodyParser.json());
app.use(express.static("public"));

app.get("/devices", (req, res) => {
    res.json(discovery.devices);
});

app.post("/config", async (req, res) => {
    try {
        const {
            broadcastAddress,
            port,
            startNetwork,
            endNetwork,
            adpuTimeout,
            startMac,
            endMac,
        } = req.body;
        await discovery.updateConfig({
            // Use the updateConfig method
            broadcastAddress,
            port,
            startNetwork,
            endNetwork,
            adpuTimeout,
            startMac,
            endMac,
        });
        discovery.initializeClient();
        await discovery.discoverDevices(
            startNetwork,
            endNetwork,
            startMac,
            endMac
        );
        res.send("Configuration updated and device discovery initiated.");
    } catch (error) {
        console.error("Error in /config route:", error);
        res.status(500).send(error.message);
    }
});

app.post("/save-device", async (req, res) => {
    try {
        const devices = req.body; // Expecting an array of devices
        if (!Array.isArray(devices)) {
            return res
                .status(400)
                .send("Invalid input, expected an array of devices");
        }

        for (const device of devices) {
            await saveOrUpdateDevice(device);
        }

        res.json({ message: "All devices processed successfully" });
    } catch (error) {
        console.error("Error saving devices:", error);
        res.status(500).send("Failed to save devices");
    }
});

app.post("/read-properties", async (req, res) => {
    const { address, properties } = req.body;
    try {
        const results = await readMultipleProperties(address, properties);
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to read properties",
            error: error.toString(),
        });
    }
});

app.get("/properties", async (req, res) => {
    try {
        const propertiesResults = await fetchAndReadProperties();
        if (propertiesResults.length === 0) {
            return res
                .status(404)
                .json({ success: false, message: "No properties found." });
        }
        res.json({ success: true, data: propertiesResults });
    } catch (error) {
        console.error("Failed to fetch and save properties:", error);
        res.status(500).json({
            success: false,
            message: "Failed to read and save properties",
            error: error.toString(),
        });
    }
});

let isPollingStarted = false;

app.get("/poll-devices", async (req, res) => {
    if (!isPollingStarted) {
        const devices = await fetchAndReadProperties();
        startPolling(devices);
        isPollingStarted = true;
    }
    res.json({
        success: true,
        message: "Polling started",
        data: pollingResults,
    });
});

function sendProgressUpdate(progress) {
    currentProgress = progress; // Update global variable
}

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
