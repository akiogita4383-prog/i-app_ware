// expo-sharing の共有エクステンションは表示名がターゲット名（expo-sharing-extension）になるため、
// 共有シートで「my coordy」と表示されるようにアプリ名へ置き換える。
const fs = require('fs');
const path = require('path');
const { withFinalizedMod } = require('expo/config-plugins');

module.exports = function withShareExtensionName(config) {
  return withFinalizedMod(config, [
    'ios',
    async (cfg) => {
      const plistPath = path.join(cfg.modRequest.platformProjectRoot, 'expo-sharing-extension', 'Info.plist');
      if (fs.existsSync(plistPath)) {
        const xml = fs.readFileSync(plistPath, 'utf8');
        const name = cfg.name.replace(/&/g, '&amp;').replace(/</g, '&lt;');
        fs.writeFileSync(
          plistPath,
          xml.replace(/(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/, `$1${name}$2`),
        );
      }
      return cfg;
    },
  ]);
};
