const fs = require('fs');
const path = require('path');

const filePaths = [
    'src/components/ui/app-layout/random-play-button.tsx',
    'src/components/ui/app-layout/tv-nav-bar.tsx',
    'src/components/ui/combobox/combobox.tsx',
    'src/components/ui/form/fields.tsx',
    'src/components/ui/loading-spinner/loading-spinner.tsx',
    'src/components/ui/switch/switch.tsx',
    'src/components/ui/text-input/text-input.tsx',
    'src/components/video/player-error-boundary.tsx',
    'src/components/ui/button/button.stories.tsx'
];

const iconMap = {
    'Clapperboard': 'Icons.media.clapperboard',
    'Tv': 'Icons.device.tv',
    'Loader2': 'Icons.status.loader2', // usually Loader2 is a status icon
    'Home': 'Icons.navigation.home',
    'Film': 'Icons.navigation.film',
    'Settings': 'Icons.navigation.settings',
    'Search': 'Icons.ui.search',
    'Mail': 'Icons.communication.mail',
    'Play': 'Icons.media.play',
    'X': 'Icons.ui.close',
    'Plus': 'Icons.ui.plus',
    'Trash2': 'Icons.ui.trash',
    'AlertCircle': 'Icons.status.alertCircle',
    'EyeOff': 'Icons.ui.eyeOff',
    'Eye': 'Icons.ui.eye',
    'RefreshCw': 'Icons.ui.refresh',
    'AlertTriangle': 'Icons.status.alertTriangle'
};

filePaths.forEach(relPath => {
    const fullPath = path.join(__dirname, relPath);
    if (!fs.existsSync(fullPath)) return;

    let content = fs.readFileSync(fullPath, 'utf8');
    let original = content;

    // Remove lucide-react import and add Icons import if it doesn't exist
    if (content.includes('lucide-react')) {
        content = content.replace(/import\s+\{([^}]+)\}\s+from\s+["']lucide-react["'];?/, '');
        if (!content.includes('import { Icons }')) {
            content = 'import { Icons } from "@/components/ui/icons"\n' + content;
        }
    }

    // Replace icons in JSX
    for (const [lucideName, iconName] of Object.entries(iconMap)) {
        const regex = new RegExp(`<${lucideName}\\b`, 'g');
        content = content.replace(regex, `<${iconName}`);
        
        // Also if they are passed as references e.g. icon={LucideIcon}
        const refRegex = new RegExp(`\\b${lucideName}\\b`, 'g');
        // We have to be careful with refRegex, but let's just do it for now
        // wait, we only want to replace JSX tags or explicit usages
        // Let's just do the JSX tags first.
    }

    // specific manual replace for non-jsx usages (if any)
    for (const [lucideName, iconName] of Object.entries(iconMap)) {
        // e.g. icon: Film
        const regex2 = new RegExp(`icon:\\s*${lucideName}\\b`, 'g');
        content = content.replace(regex2, `icon: ${iconName}`);
    }

    if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Fixed', relPath);
    }
});
console.log('Done');
