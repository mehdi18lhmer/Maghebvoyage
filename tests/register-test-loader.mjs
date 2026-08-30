import { createRequire, register } from "node:module";

const require = createRequire(import.meta.url);
const Module = require("node:module");
const originalLoad = Module._load;

Module._extensions[".css"] = (module) => module._compile("module.exports = {};", module.filename);
Module._load = function loadForTests(request, parent, isMain) {
  if (request === "next/font/google") {
    return {
      Geist: () => ({ variable: "--font-geist-sans" }),
      Geist_Mono: () => ({ variable: "--font-geist-mono" }),
      Plus_Jakarta_Sans: () => ({ variable: "--font-display" }),
    };
  }

  if (request === "next-intl/server") {
    return {
      getLocale: async () => "fr",
      getMessages: async () => ({ StatusBadge: {} }),
      getTimeZone: async () => "Africa/Casablanca",
      setRequestLocale: () => undefined,
    };
  }

  return originalLoad.call(this, request, parent, isMain);
};

register("./test-loader.mjs", import.meta.url);
