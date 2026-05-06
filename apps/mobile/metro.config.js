const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

config.resolver.alias = {
  'react-native': 'react-native-web',
};

module.exports = config;
