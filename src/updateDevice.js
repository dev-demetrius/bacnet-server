// updateDevice.js
const { MongoClient } = require("mongodb");

async function connect() {
    const url = "mongodb://localhost:27017";
    const client = new MongoClient(url);
    await client.connect();
    console.log("Connected to MongoDB");
    return client.db("bacnet");
}

async function saveOrUpdateDevice(device) {
    const db = await connect();
    const collection = db.collection("devices");

    const result = await collection.updateOne(
        { deviceId: device.deviceId },
        { $set: device },
        { upsert: true }
    );

    console.log(
        `Processed device ${device.deviceId}. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}, Upserted: ${result.upsertedId}`
    );
    return result;
}

function updateDeviceProperties(device, results) {
    const updatedProperties = device.properties.map((property) => {
        const correspondingResult = results.find(
            (result) =>
                result.type === property.type &&
                result.instance === property.instance
        );
        // Ensure the value is updated only if the result is found, and preserve other attributes
        return {
            type: property.type,
            instance: property.instance,
            name: property.name, // Keep the original name
            value: correspondingResult
                ? correspondingResult.value
                : property.value, // Update the value if new data is available
            cov: property.cov || false, // Preserve the cov value, default to false if undefined
            meta: property.meta || {}, // Preserve the meta object, default to empty if undefined
        };
    });

    console.log(
        `Updated properties for device ${device.deviceId}:`,
        JSON.stringify(updatedProperties, null, 2)
    );
    return updatedProperties;
}

module.exports = { saveOrUpdateDevice, updateDeviceProperties };
