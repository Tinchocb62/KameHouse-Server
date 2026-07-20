const fs = require('fs');
const path = require('path');

const dirPath1 = path.join('apps', 'web', 'src', 'routes', 'series', '$seriesId');
const dirPath2 = path.join(dirPath1, '-components');

const replacements = [
  { search: /duration-300/g, replace: 'duration-base' },
  { search: /duration-500/g, replace: 'duration-slow' },
  { search: /duration-700/g, replace: 'duration-slower' },
  { search: /text-\[9px\]/g, replace: 'text-label-sm' },
  { search: /text-\[10px\]/g, replace: 'text-label-sm' },
  { search: /text-\[11px\]/g, replace: 'text-badge' },
  { search: /text-white\/([0-9]+)/g, replace: 'text-on-surface/$1' },
  { search: /text-white/g, replace: 'text-on-surface' },
  { search: /bg-black\/([0-9]+)/g, replace: 'bg-surface-container/$1' },
  { search: /bg-black(?![a-zA-Z0-9\-\/])/g, replace: 'bg-ui-surface' },
  { search: /shadow-lg/g, replace: 'shadow-card' },
  { search: /shadow-xl/g, replace: 'shadow-elevated' }
];

function processDir(directory) {
    if (!fs.existsSync(directory)) return;
    const files = fs.readdirSync(directory);
    for (const file of files) {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isFile() && (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts'))) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;
            for (const { search, replace } of replacements) {
                if (search.test(content)) {
                    content = content.replace(search, replace);
                    modified = true;
                }
            }
            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Modified: ${fullPath}`);
            }
        }
    }
}

processDir(dirPath1);
processDir(dirPath2);
