const MODULE_STUBS = {
  "server-only": "export default {};",
  "next/font/google": `
    export const Geist = () => ({variable: "--font-geist-sans"});
    export const Geist_Mono = () => ({variable: "--font-geist-mono"});
    export const Plus_Jakarta_Sans = () => ({variable: "--font-display"});
  `,
  "next-intl/server": `
    export const getLocale = async () => "fr";
    export const getMessages = async () => ({StatusBadge: {}});
    export const getTimeZone = async () => "Africa/Casablanca";
    export const setRequestLocale = () => undefined;
  `,
};

export async function resolve(specifier, context, nextResolve) {
  const source = MODULE_STUBS[specifier];
  if (source) {
    return {
      shortCircuit: true,
      url: `data:text/javascript,${encodeURIComponent(source)}`,
    };
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".css")) {
    return { format: "module", shortCircuit: true, source: "export default {};" };
  }

  return nextLoad(url, context);
}
