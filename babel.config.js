module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Must run before module transforms: imports only the icons actually used (see file header)
      "./babel-plugins/lucide-direct-imports.js",
      [
        "react-native-unistyles/plugin",
        {
          root: "./src"
        }
      ],
      "react-native-reanimated/plugin",
    ],
    env: {
      // Release bundles: drop console.log/info/debug. They serialize their arguments on the JS
      // thread even when nobody is listening. warn/error are kept for crash diagnostics.
      production: {
        plugins: [["transform-remove-console", { exclude: ["error", "warn"] }]],
      },
    },
  };
};
