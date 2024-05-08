// bacnetoperations.js

const bacnet = require("node-bacnet");
const client = new bacnet();
const {
    saveOrUpdateDevice,
    updateDeviceProperties,
} = require("./updateDevice");

/**
 * Polls a BACnet device at a specified interval to update the value of a specific property.
 * @param {Array} devices - An array of device information including network details and property IDs.
 * @param {number} interval - Polling interval in milliseconds.
 */

let pollingInterval;
let pollingResults = []; // Ensure this is globally accessible if it's used in multiple places

function startPolling(devices) {
    console.log("Starting polling for devices:", devices);
    if (pollingInterval) return;

    const intervalDuration = 30000; // 30 seconds

    pollingInterval = setInterval(async () => {
        console.log("Polling BACnet devices for updates...");
        for (const device of devices) {
            const requestArray = device.properties.map((prop) => ({
                objectId: { type: prop.type, instance: prop.instance },
                properties: [{ id: 85 }], // Assuming ID 85 is what you're interested in
            }));

            const address = {
                address: device.address,
                net: device.network,
                adr: [device.mac],
            };

            try {
                const results = await readMultipleProperties(
                    address,
                    requestArray
                );
                console.log(
                    "Polling results:",
                    JSON.stringify(results, null, 2)
                );
                updateDeviceProperties(device, results);
                await saveOrUpdateDevice(device); // Save the updated device to the database
            } catch (error) {
                console.error(
                    `Error during polling for device ${device.deviceId}:`,
                    error
                );
            }
        }
    }, intervalDuration);
}

/**
 * Reads multiple properties from multiple objects on a BACnet device.
 * @param {string} address - The IP address of the target BACnet device.
 * @param {Array} requestArray - Array of objects specifying the properties to read.
 * @returns {Promise} - A Promise that resolves with the read values or rejects with an error.
 */
async function readMultipleProperties(address, requestArray) {
    return new Promise((resolve, reject) => {
        client.readPropertyMultiple(address, requestArray, (err, data) => {
            if (err) {
                console.error("Error reading properties:", err);
                reject(err);
            } else {
                resolve(formatResponse(data));
            }
        });
    });
}

function formatResponse(data) {
    let results = [];
    data.values.forEach((obj) => {
        obj.values.forEach((prop) => {
            const result = {
                type: obj.objectId.type,
                instance: obj.objectId.instance,
                name: prop.value[0]?.value || "No Data", // Placeholder for name, update as needed
                value: null,
                cov: false,
                meta: {},
            };
            results.push(result);
        });
    });
    return results;
}

module.exports = { readMultipleProperties, startPolling, pollingResults };
