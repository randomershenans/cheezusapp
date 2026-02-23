export default {
  expo: {
    name: "Cheezus",
    slug: "cheezus",
    owner: "cheezus-group",
    scheme: "cheezus",
    version: "1.0.2",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/images/splash.png",
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
      ],
      infoPlist: {
        NSCameraUsageDescription: "Cheezus uses your camera to take photos of cheese for your cheese box entries and to scan cheese labels for automatic identification. For example, you can photograph a cheese wheel to add it to your collection or scan a label to auto-fill cheese details.",
        NSPhotoLibraryUsageDescription: "Cheezus accesses your photo library so you can select existing photos of cheese to add to your cheese box entries and set your profile picture. For example, you can choose a photo you took earlier at a cheese shop.",
        NSLocationWhenInUseUsageDescription: "Cheezus uses your location to show you cheese shops, producers, and cheese events near you. For example, you can discover local artisan cheese makers in your area.",
        NSMicrophoneUsageDescription: "Cheezus may use the microphone when recording video of cheese tastings to share with the community."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#FCD95B"
      },
      versionCode: 12,
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
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        },
        {
          action: "VIEW",
          data: [
            {
              scheme: "cheezus",
              host: "cheezus.co",
              pathPrefix: "/@"
            },
            {
              scheme: "cheezus",
              host: "cheezus.co",
              pathPrefix: "/profile"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    web: {
      favicon: "./assets/images/icon.png",
      bundler: "metro"
    },
    plugins: [
      "expo-font",
      "expo-router",
      "expo-web-browser",
      [
        "expo-notifications",
        {
          "icon": "./assets/images/notification-icon.png",
          "color": "#FCD95B"
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Cheezus accesses your photo library so you can select existing photos of cheese to add to your cheese box entries and set your profile picture. For example, you can choose a photo you took earlier at a cheese shop.",
          "cameraPermission": "Cheezus uses your camera to take photos of cheese for your cheese box entries and to scan cheese labels for automatic identification. For example, you can photograph a cheese wheel to add it to your collection or scan a label to auto-fill cheese details."
        }
      ],
      [
        "expo-location",
        {
          "locationWhenInUsePermission": "Cheezus uses your location to show you cheese shops, producers, and cheese events near you. For example, you can discover local artisan cheese makers in your area."
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": "Cheezus uses your camera to take photos of cheese for your cheese box entries and to scan cheese labels for automatic identification. For example, you can photograph a cheese wheel to add it to your collection or scan a label to auto-fill cheese details.",
          "microphonePermission": "Cheezus may use the microphone when recording video of cheese tastings to share with the community."
        }
      ],
      [
        "@rnmapbox/maps",
        {
          RNMapboxMapsDownloadToken: process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN,
        }
      ]
      "expo-video"
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
