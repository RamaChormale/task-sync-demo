const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongod;

// Start in-memory MongoDB before the test suite
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

// Clear all collections between tests so state doesn't bleed
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Stop server and disconnect after the suite
afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
