// jest.config.js
// Sync object
/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  verbose: true,
};

// module.exports = config;

// Or async function
module.exports = async () => {
  return {
    setupFiles: ["jest-webgl-canvas-mock"],
    testEnvironment: "jsdom",
    transform: {
      "\\.(js|ts|jsx|tsx)$": "babel-jest",
    },
    verbose: true,
  };
};
