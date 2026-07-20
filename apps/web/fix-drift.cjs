const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walk(dirPath, callback);
        } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
            callback(dirPath);
        }
    });
}

function fixDrift(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // text sizes
    content = content.replace(/text-\[8px\]/g, 'text-caption');
    content = content.replace(/text-\[9px\]/g, 'text-caption');
    content = content.replace(/text-\[10px\]/g, 'text-label-sm');
    content = content.replace(/text-\[11px\]/g, 'text-label-sm');
    content = content.replace(/text-\[12px\]/g, 'text-xs');

    // rounded
    content = content.replace(/rounded-2xl/g, 'rounded-xl');
    content = content.replace(/rounded-3xl/g, 'rounded-container');
    
    // durations
    content = content.replace(/duration-200/g, 'duration-fast');
    content = content.replace(/duration-300/g, 'duration-base');
    content = content.replace(/duration-500/g, 'duration-slow');
    content = content.replace(/duration-700/g, 'duration-slow');
    content = content.replace(/duration-1000/g, 'duration-slow');
    
    // we won't fix lucide-react imports automatically with this regex since it requires specific icon mapping
    // we can fix them manually in a few files.

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed: ${filePath}`);
    }
}

walk(path.join(__dirname, 'src', 'components'), fixDrift);
console.log("Done");
