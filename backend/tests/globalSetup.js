const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Runs once for the whole test run, in a separate process/context from the
// actual test files — so the only way to hand the connection URI to them is
// to write it somewhere the (synchronous) per-file setup can read it back.
// The server instance itself is stashed on `global` for globalTeardown,
// which Jest guarantees shares that global with globalSetup.
module.exports = async function globalSetup() {
  const mongod = await MongoMemoryServer.create();
  global.__MONGOD__ = mongod;
  fs.writeFileSync(path.join(__dirname, '.mongo-uri'), mongod.getUri());
};
