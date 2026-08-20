const fs = require('fs');
const path = require('path');

module.exports = async function globalTeardown() {
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();
  }
  const uriFile = path.join(__dirname, '.mongo-uri');
  if (fs.existsSync(uriFile)) fs.unlinkSync(uriFile);
};
