module.exports = {
  extends: ["next/core-web-vitals"],
  plugins: ["boundaries"],
  settings: {
    "boundaries/include": ["src"],
    "boundaries/elements": [
      { type: "shared", pattern: "shared/*" },
      { type: "features", pattern: "features/*" },
    ],
  },
  rules: {
    "react-hooks/exhaustive-deps": "off",

    // 1. forbid deep imports
    "boundaries/no-private": [
      "error",
      {
        allowUncles: false,
      },
    ],

    // 2. enforce public API only
    "boundaries/element-types": [
      "error",
      {
        default: "disallow",
        rules: [
          {
            from: ["features"],
            allow: ["shared", "features"],
          },
        ],
      },
    ],
  },
}
