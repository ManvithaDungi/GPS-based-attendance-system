const appJson = require('./app.json');



module.exports = () => ({
  ...appJson.expo,
  owner: "manvithadungi",
  slug: "gpsattendancesystem",
  extra: {
    ...appJson.expo.extra,
    apiUrl: process.env.EXPO_PUBLIC_API_URL || appJson.expo.extra?.apiUrl,
  },
});
