/**
 * Rewrites
 *     import { Home, Bell as BellIcon } from 'lucide-react-native';
 * into
 *     import Home from 'lucide-react-native/icons/house';
 *     import BellIcon from 'lucide-react-native/icons/bell';
 *
 * Why: Metro does not tree-shake. Importing anything from the package root makes the bundle
 * include - and the app evaluate at startup - all ~1,800 icon modules, although the app uses a few
 * dozen. That was roughly half of all modules in the bundle and a large share of cold-start JS time
 * on low-end Android devices.
 *
 * The export-name -> file mapping is read from the installed package's own barrel file, so aliases
 * (e.g. `CheckCircle2` -> icons/circle-check) stay correct across lucide upgrades. Anything that is
 * not an icon (createLucideIcon, Icon, LucideProvider, ...) keeps importing from the package root.
 */
const fs = require('fs');
const path = require('path');

const PACKAGE = 'lucide-react-native';
const EXPORT_LINE = /^export \{([^}]+)\} from '\.\/icons\/([a-z0-9-]+)\.mjs';$/;

let iconFileByExport = null;

function loadIconMap() {
    if (iconFileByExport) return iconFileByExport;
    iconFileByExport = new Map();

    // The package's "exports" map hides package.json, so locate it from the project root instead
    const pkgDir = path.join(__dirname, '..', 'node_modules', PACKAGE);
    const barrel = fs.readFileSync(path.join(pkgDir, 'dist', 'esm', `${PACKAGE}.mjs`), 'utf8');

    for (const line of barrel.split('\n')) {
        const match = EXPORT_LINE.exec(line.trim());
        if (!match) continue;
        const file = match[2];
        for (const part of match[1].split(',')) {
            const named = /default as (\w+)/.exec(part);
            if (named) iconFileByExport.set(named[1], file);
        }
    }

    if (iconFileByExport.size === 0) {
        throw new Error(
            `[lucide-direct-imports] Could not read icon exports from ${PACKAGE}. ` +
                'Its file layout changed: update babel-plugins/lucide-direct-imports.js or remove the plugin from babel.config.js.'
        );
    }
    return iconFileByExport;
}

module.exports = function lucideDirectImports({ types: t }) {
    return {
        name: 'lucide-direct-imports',
        visitor: {
            ImportDeclaration(nodePath) {
                const node = nodePath.node;
                if (node.source.value !== PACKAGE || node.importKind === 'type') return;

                const icons = loadIconMap();
                const direct = [];
                const untouched = [];

                for (const specifier of node.specifiers) {
                    const importedName =
                        t.isImportSpecifier(specifier) && specifier.importKind !== 'type'
                            ? specifier.imported.name || specifier.imported.value
                            : null;
                    const file = importedName ? icons.get(importedName) : null;

                    if (file) {
                        direct.push(
                            t.importDeclaration(
                                [t.importDefaultSpecifier(t.identifier(specifier.local.name))],
                                t.stringLiteral(`${PACKAGE}/icons/${file}`)
                            )
                        );
                    } else {
                        untouched.push(specifier);
                    }
                }

                if (direct.length === 0) return;
                if (untouched.length > 0) {
                    direct.push(t.importDeclaration(untouched, t.stringLiteral(PACKAGE)));
                }
                nodePath.replaceWithMultiple(direct);
            },
        },
    };
};
