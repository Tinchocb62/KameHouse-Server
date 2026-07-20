const fs = require('fs');
const path = require('path');

const TARGET_DIRS = [
    path.join(process.cwd(), 'src/components/shared'),
    path.join(process.cwd(), 'src/components/video'),
    path.join(process.cwd(), 'src/components/settings'),
    path.join(process.cwd(), 'src/components/ui'),
    path.join(process.cwd(), 'src/routes')
];

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const REPLACEMENTS = [
    // Text sizes
    { regex: /text-\[8px\]/g, replacement: 'text-xs' }, // 8px is too small, use xs or caption
    { regex: /text-\[9px\]/g, replacement: 'text-caption' },
    { regex: /text-\[10px\]/g, replacement: 'text-label-sm' },
    { regex: /text-\[11px\]/g, replacement: 'text-label-sm' },
    { regex: /text-\[12px\]/g, replacement: 'text-xs' },
    { regex: /text-\[13px\]/g, replacement: 'text-sm' },
    
    // Radii
    { regex: /rounded-2xl/g, replacement: 'rounded-xl' },
    { regex: /rounded-3xl/g, replacement: 'rounded-container' },
    { regex: /rounded-\[22px\]/g, replacement: 'rounded-modal' },
    { regex: /rounded-\[32px\]/g, replacement: 'rounded-hero' },
    
    // Durations
    { regex: /duration-300/g, replacement: 'duration-base' },
    { regex: /duration-500/g, replacement: 'duration-slow' },
    { regex: /duration-700/g, replacement: 'duration-slower' },
    { regex: /duration-1000/g, replacement: 'duration-slower' },
];

let totalFixed = 0;

TARGET_DIRS.forEach(targetDir => {
    const files = walk(targetDir);
    files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        let newContent = content;

        REPLACEMENTS.forEach(({ regex, replacement }) => {
            newContent = newContent.replace(regex, replacement);
        });

        if (content !== newContent) {
            fs.writeFileSync(file, newContent, 'utf8');
            console.log(`Fixed: ${file}`);
            totalFixed++;
        }
    });
});

console.log(`Done. Fixed ${totalFixed} files.`);
