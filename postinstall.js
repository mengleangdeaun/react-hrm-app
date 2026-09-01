/**
 * postinstall.js
 * 
 * WORKAROUND CONTEXT:
 * Affected Versions: react-native-unistyles 3.3.0 + React Native 0.81.x
 * Problem: React Native 0.81 removed `parseUnprocessedTransformOriginString` and `TransformOrigin`
 *          from the `facebook::react` C++ namespace. Unistyles 3.3.0's TransformOriginConverter.cpp
 *          checks `__has_include(<react/renderer/components/view/conversions.h>)` which is true,
 *          causing a C++ compilation error when compiling with NDK on Android or Clang on iOS.
 * Solution: Disables `UNISTYLES_HAS_RN_TRANSFORM_ORIGIN_PARSER` so the safe fallback (`return std::nullopt`) is used.
 * 
 * REMOVAL CONDITION:
 * This script can be safely removed when upgrading `react-native-unistyles` to an upstream version (>= 3.4.0)
 * that natively supports React Native 0.81+ New Architecture APIs.
 */

const fs = require('fs');
const path = require('path');

function getPackageVersion(packageName) {
  try {
    const pkgPath = path.join(__dirname, 'node_modules', packageName, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const data = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      return data.version;
    }
  } catch {
    return null;
  }
  return null;
}

const unistylesVersion = getPackageVersion('react-native-unistyles');
const rnVersion = getPackageVersion('react-native');

console.log(`[postinstall] Detected react-native-unistyles: ${unistylesVersion || 'unknown'}, react-native: ${rnVersion || 'unknown'}`);

const filePath = path.join(
  __dirname,
  'node_modules',
  'react-native-unistyles',
  'cxx',
  'converters',
  'TransformOriginConverter.cpp'
);

if (!fs.existsSync(filePath)) {
  console.log('[postinstall] TransformOriginConverter.cpp not present, skipping patch.');
  process.exit(0);
}

let content = fs.readFileSync(filePath, 'utf8');

// 1. Idempotency Check: if already patched, exit cleanly
if (
  content.includes('#if 0 // Disabled for RN 0.81') ||
  (content.includes('// #define UNISTYLES_HAS_RN_TRANSFORM_ORIGIN_PARSER 1') &&
   content.includes('// #include <react/renderer/components/view/conversions.h>'))
) {
  console.log('[postinstall] ✅ react-native-unistyles RN 0.81 patch is already applied.');
  process.exit(0);
}

// 2. Primary Patch: Replace block with `#if 0`
const originalBlock = `#if defined(RN_SERIALIZABLE_STATE) &&                                          \\
    __has_include(<react/renderer/components/view/conversions.h>)
#include <react/renderer/components/view/conversions.h>
#define UNISTYLES_HAS_RN_TRANSFORM_ORIGIN_PARSER 1
#endif`;

const disabledBlock = `#if 0 // Disabled for RN 0.81: parseUnprocessedTransformOriginString removed
#include <react/renderer/components/view/conversions.h>
#define UNISTYLES_HAS_RN_TRANSFORM_ORIGIN_PARSER 1
#endif`;

if (content.includes(originalBlock)) {
  content = content.replace(originalBlock, disabledBlock);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[postinstall] ✅ Applied #if 0 patch to TransformOriginConverter.cpp');
  process.exit(0);
}

// 3. Fallback: Line-by-line comment out if formatting varies
let modified = false;

if (content.includes('#define UNISTYLES_HAS_RN_TRANSFORM_ORIGIN_PARSER 1')) {
  content = content.replace(
    '#define UNISTYLES_HAS_RN_TRANSFORM_ORIGIN_PARSER 1',
    '// #define UNISTYLES_HAS_RN_TRANSFORM_ORIGIN_PARSER 1'
  );
  modified = true;
}

if (content.includes('#include <react/renderer/components/view/conversions.h>')) {
  content = content.replace(
    '#include <react/renderer/components/view/conversions.h>',
    '// #include <react/renderer/components/view/conversions.h>'
  );
  modified = true;
}

if (modified) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[postinstall] ✅ Applied line-by-line fallback patch to TransformOriginConverter.cpp');
} else {
  console.log('[postinstall] ℹ️ TransformOriginConverter.cpp is either already patched upstream or structure differs.');
}
