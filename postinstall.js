/**
 * postinstall.js
 * Fixes react-native-unistyles 3.3.0 incompatibility with React Native 0.81.
 *
 * RN 0.81 removed `parseUnprocessedTransformOriginString` from the
 * `facebook::react` namespace. This script comments out the include of
 * `conversions.h` in TransformOriginConverter.cpp so the fallback
 * `return std::nullopt` branch is used instead.
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  'node_modules',
  'react-native-unistyles',
  'cxx',
  'converters',
  'TransformOriginConverter.cpp'
);

if (!fs.existsSync(filePath)) {
  console.log('[postinstall] TransformOriginConverter.cpp not found, skipping patch.');
  process.exit(0);
}

let content = fs.readFileSync(filePath, 'utf8');

const originalLine = '#include <react/renderer/components/view/conversions.h>';
const patchedLine  = '// #include <react/renderer/components/view/conversions.h> // Disabled: RN 0.81 removed parseUnprocessedTransformOriginString';

if (content.includes(patchedLine)) {
  console.log('[postinstall] react-native-unistyles RN 0.81 patch already applied.');
  process.exit(0);
}

if (!content.includes(originalLine)) {
  console.log('[postinstall] TransformOriginConverter.cpp already patched or changed, skipping.');
  process.exit(0);
}

content = content.replace(originalLine, patchedLine);
fs.writeFileSync(filePath, content, 'utf8');
console.log('[postinstall] ✅ Applied react-native-unistyles RN 0.81 patch to TransformOriginConverter.cpp');
