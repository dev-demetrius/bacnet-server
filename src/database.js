const { MongoClient } = require("mongodb");

const url = "mongodb://localhost:27017";
const client = new MongoClient(url);

async function connect() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
        return client.db("bacnet"); // specify the database name
    } catch (e) {
        console.error(e);
    }
}

module.exports = connect;
