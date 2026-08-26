/**
 * postinstall.js
 * Fixes react-native-unistyles 3.3.0 incompatibility with React Native 0.81.
 *
 * RN 0.81 removed `parseUnprocessedTransformOriginString` and `TransformOrigin`
 * from the `facebook::react` namespace.
 * This script disables `UNISTYLES_HAS_RN_TRANSFORM_ORIGIN_PARSER` completely
 * in `TransformOriginConverter.cpp` so the safe fallback (`return std::nullopt`) is used.
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
  console.log('[postinstall] TransformOriginConverter.cpp not found, skipping.');
  process.exit(0);
}

let content = fs.readFileSync(filePath, 'utf8');

// If already completely disabled with #if 0 or comments, do nothing
if (content.includes('#if 0 // Disabled for RN 0.81') || (content.includes('// #define UNISTYLES_HAS_RN_TRANSFORM_ORIGIN_PARSER 1') && content.includes('// #include <react/renderer/components/view/conversions.h>'))) {
  console.log('[postinstall] react-native-unistyles RN 0.81 patch is already applied.');
  process.exit(0);
}

// 1. Disable with #if 0 if original block is found
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

// 2. Individual line replacement fallback
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
  console.log('[postinstall] ✅ Applied line-by-line patch to TransformOriginConverter.cpp');
} else {
  console.log('[postinstall] TransformOriginConverter.cpp structure unrecognized or already patched.');
}
