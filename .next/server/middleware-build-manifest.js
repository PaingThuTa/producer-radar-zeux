self.__BUILD_MANIFEST = {
  "polyfillFiles": [
    "static/chunks/polyfills.js"
  ],
  "devFiles": [
    "static/chunks/react-refresh.js"
  ],
  "ampDevFiles": [],
  "lowPriorityFiles": [],
  "rootMainFiles": [],
  "pages": {
    "/": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/index.js"
    ],
    "/Connections": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/Connections.js"
    ],
    "/DailyContacts": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/DailyContacts.js"
    ],
    "/Dashboard": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/Dashboard.js"
    ],
    "/Discovery": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/Discovery.js"
    ],
    "/PlacementProducers": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/PlacementProducers.js"
    ],
    "/YouTubeProducers": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/YouTubeProducers.js"
    ],
    "/_app": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/_app.js"
    ],
    "/_error": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/_error.js"
    ]
  },
  "ampFirstPages": []
};
self.__BUILD_MANIFEST.lowPriorityFiles = [
"/static/" + process.env.__NEXT_BUILD_ID + "/_buildManifest.js",
,"/static/" + process.env.__NEXT_BUILD_ID + "/_ssgManifest.js",

];