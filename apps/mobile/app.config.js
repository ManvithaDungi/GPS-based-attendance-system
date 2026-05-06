const appJson = require('./app.json');

const LOCAL_API_URL_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?\/api\/v1\/?$/i;
const PRODUCTION_API_URL = 'https://gps-attendance-api.onrender.com/api/v1';

const resolveApiUrl = () => {
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
  const isProductionBuild = process.env.NODE_ENV === 'production' || process.env.EAS_BUILD_PROFILE === 'production';

  if (envApiUrl && (!isProductionBuild || !LOCAL_API_URL_PATTERN.test(envApiUrl))) {
    return envApiUrl;
  }

  if (isProductionBuild) {
    return PRODUCTION_API_URL;
  }

  return appJson.expo.extra?.apiUrl;
};

module.exports = () => ({
  ...appJson.expo,
  owner: 'manvithadungi',
  slug: 'gpsattendancesystem',
  extra: {
    ...appJson.expo.extra,
    apiUrl: resolveApiUrl(),
  },
});
