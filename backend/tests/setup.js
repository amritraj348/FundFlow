const mongoose = require('mongoose');

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
});

// Every test starts from a clean slate — no test should depend on data left
// behind by another, and none of this ever touches the real dev database
// (MONGO_URI here always points at the in-memory server from globalSetup).
afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.close();
});
