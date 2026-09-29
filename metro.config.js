// Sentry's Metro setup: lets crash reports point at the real lines of code.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
