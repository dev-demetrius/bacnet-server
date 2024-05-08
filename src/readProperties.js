const { MongoClient } = require("mongodb");
const { readConfig } = require("./config");
const { readMultipleProperties } = require("./bacnetOperations");
const { saveOrUpdateDevice } = require("./updateDevice"); // Ensure this path is correct

async function fetchAndReadProperties() {
    const client = new MongoClient("mongodb://localhost:27017");
    let results = []; // Initialize an empty array to hold results

    try {
        await client.connect();
        const db = client.db("bacnet");
        const devices = await db.collection("devices").find().toArray();
        const config = readConfig(); // Ensure this properly fetches your needed configurations

        if (!config || !config.objects || !Array.isArray(config.objects)) {
            console.error(
                "Configuration is invalid or missing necessary 'objects' array"
            );
            return []; // Return an empty array if config is invalid
        }

        for (const device of devices) {
            if (
                !device.address ||
                !device.network ||
                device.mac === undefined
            ) {
                console.error(
                    `Missing address, network, or MAC for device ${device._id}. Skipping...`
                );
                continue;
            }

            const address = {
                address: device.address,
                net: device.network,
                adr: [device.mac],
            };
            const propertiesArray = config.objects.map((obj) => ({
                objectId: { type: obj.type, instance: obj.instance },
                properties: obj.properties.map((prop) => ({ id: prop.id })),
            }));

            try {
                const readResults = await readMultipleProperties(
                    address,
                    propertiesArray
                );
                device.properties = readResults; // Attach properties directly to the device object
                await saveOrUpdateDevice(device); // Save or update the device with new properties
                results.push(device); // Add the updated device to the results array
            } catch (error) {
                console.error(
                    `Error reading properties for device ${device._id}:`,
                    error
                );
            }
        }
        return results; // Return the results array containing all processed devices
    } finally {
        await client.close();
    }
}

module.exports = { fetchAndReadProperties };
