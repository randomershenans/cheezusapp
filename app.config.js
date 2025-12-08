export default {
  expo: {
    name: "Cheezus",
    slug: "cheezus",
    owner: "cheezus-group",
    scheme: "cheezus",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#FCD95B"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.cheezus.app",
      associatedDomains: [
        "applinks:cheezus.co"
      ]
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FCD95B"
      },
      package: "com.cheezus.app",
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "cheezus.co",
              pathPrefix: "/@"
            },
            {
              scheme: "https",
              host: "cheezus.co",
              pathPrefix: "/profile"
            },
            {
              scheme: "cheezus",
              host: "profile"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro"
    },
    plugins: [
      "expo-font",
      "expo-router",
      "expo-web-browser",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#FCD95B"
        }
      ]
    ],
    extra: {
      router: {
        origin: false
      },
      eas: {
        projectId: "b1055361-e496-4341-9552-538cbfce7804"
      }
    }
  }
};
