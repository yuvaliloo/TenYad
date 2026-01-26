//this file for the UI testing framework jest
module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|firebase|@firebase)"
  ],
  transform: {
    "^.+\\.(js|jsx|ts|tsx|mjs)$": "babel-jest"
  },
  setupFiles: ["./jest.setup.js"]
};
