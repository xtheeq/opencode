const { getDefaultConfig } = require("expo/metro-config");
const fs = require("fs");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Workspace packages are TypeScript sources, imported through NodeNext `.js`
// specifiers that Metro resolves literally. Strip the extension when no
// `.js` file exists so the `.ts` sibling is found.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isSource =
    moduleName.startsWith("./") ||
    moduleName.startsWith("../") ||
    path.isAbsolute(moduleName);
  if (isSource && moduleName.endsWith(".js")) {
    const absolute = path.resolve(
      path.dirname(context.originModulePath),
      moduleName,
    );
    if (!fs.existsSync(absolute)) {
      moduleName = moduleName.replace(/\.js$/, "");
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
