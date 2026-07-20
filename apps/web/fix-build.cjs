const fs = require('fs');
const path = require('path');

const replacements = [
    {
        file: 'src/components/settings/local-device-section.tsx',
        search: /Icons\.device\.monitorSmartphone/g,
        replace: 'Icons.status.monitorSmartphone'
    },
    {
        file: 'src/components/settings/secret-field.tsx',
        search: /import \{ useState \}/g,
        replace: 'import React, { useState }'
    },
    {
        file: 'src/components/shared/directory-selector.tsx',
        search: /<Folder/g,
        replace: '<Icons.status.folder'
    },
    {
        file: 'src/components/shared/directory-selector.tsx',
        search: /<ChevronsUpDown/g,
        replace: '<Icons.ui.chevronsUpDown'
    },
    {
        file: 'src/components/shared/loading-overlay-with-logo.tsx',
        search: /<RefreshCw/g,
        replace: '<Icons.ui.refresh'
    },
    {
        file: 'src/components/ui/app-layout/random-play-button.tsx',
        search: /Icons\.status\.loader2/g,
        replace: 'Icons.ui.spinner'
    },
    {
        file: 'src/components/ui/app-layout/random-play-button.tsx',
        search: /Icons\.device\.tv/g,
        replace: 'Icons.navigation.tv'
    },
    {
        file: 'src/components/ui/app-layout/random-play-button.tsx',
        search: /Icons\.device\.home/g,
        replace: 'Icons.navigation.home'
    },
    {
        file: 'src/components/ui/app-layout/random-play-button.tsx',
        search: /Icons\.media\.clapperboard/g,
        replace: 'Icons.media.clapperboard' // I'll add clapperboard to index.ts
    },
    {
        file: 'src/components/ui/app-layout/tv-nav-bar.tsx',
        search: /icon: Home/g,
        replace: 'icon: Icons.navigation.home'
    },
    {
        file: 'src/components/ui/app-layout/tv-nav-bar.tsx',
        search: /icon: Tv/g,
        replace: 'icon: Icons.navigation.tv'
    },
    {
        file: 'src/components/ui/app-layout/tv-nav-bar.tsx',
        search: /icon: Film/g,
        replace: 'icon: Icons.navigation.film'
    },
    {
        file: 'src/components/ui/app-layout/tv-nav-bar.tsx',
        search: /icon: Settings/g,
        replace: 'icon: Icons.navigation.settings'
    },
    {
        file: 'src/components/ui/button/button.stories.tsx',
        search: /Icons\.communication\.mail/g,
        replace: 'Icons.ui.mail'
    },
    {
        file: 'src/components/ui/button/button.stories.tsx',
        search: /Icons\.ui\.search/g,
        replace: 'Icons.navigation.search'
    },
    {
        file: 'src/components/ui/core/motion.ts',
        search: /export const EASE_OUT: number\[\] = \[0\.0, 0\.0, 0\.2, 1\]/g,
        replace: 'export const EASE_OUT = [0.0, 0.0, 0.2, 1] as any'
    },
    {
        file: 'src/components/ui/core/motion.ts',
        search: /export const EASE_IN_OUT: number\[\] = \[0\.4, 0\.0, 0\.2, 1\]/g,
        replace: 'export const EASE_IN_OUT = [0.4, 0.0, 0.2, 1] as any'
    },
    {
        file: 'src/components/ui/loading-spinner/loading-spinner.tsx',
        search: /Icons\.status\.loader2/g,
        replace: 'Icons.ui.spinner'
    },
    {
        file: 'src/components/ui/media-spotlight.tsx',
        search: /Icons\.ui\.sparkles/g,
        replace: 'Icons.status.sparkles'
    },
    {
        file: 'src/components/ui/search/command-palette.tsx',
        search: /Icons\.media\.movie/g,
        replace: 'Icons.navigation.film'
    },
    {
        file: 'src/components/ui/switch/switch.tsx',
        search: /Icons\.status\.alertCircle/g,
        replace: 'Icons.ui.alertCircle'
    },
    {
        file: 'src/components/video/player-error-boundary.tsx',
        search: /Icons\.status\.alertTriangle/g,
        replace: 'Icons.ui.alert'
    },
    {
        file: 'src/routes/collections/$id.tsx',
        search: /Icons\.ui\.calendar/g,
        replace: 'Icons.time.calendar'
    },
    {
        file: 'src/routes/collections/$id.tsx',
        search: /Icons\.ui\.tag/g,
        replace: 'Icons.ui.tag' // I will add tag to index.ts
    },
    {
        file: 'src/routes/collections/index.tsx',
        search: /<Layers/g,
        replace: '<Icons.navigation.layers'
    },
    {
        file: 'src/routes/settings/components.tsx',
        search: /<RefreshIcon/g,
        replace: '<Icons.ui.refresh'
    },
    {
        file: 'src/routes/settings/components.tsx',
        search: /<WifiIcon/g,
        replace: '<Icons.status.wifi'
    },
    {
        file: 'src/routes/settings/components.tsx',
        search: /<WifiOffIcon/g,
        replace: '<Icons.status.wifiOff'
    },
    {
        file: 'src/routes/settings/index.tsx',
        search: /Icons\.ui\.palette/g,
        replace: 'Icons.ui.palette' // I will add palette
    },
    {
        file: 'src/routes/settings/index.tsx',
        search: /Icons\.status\.radar/g,
        replace: 'Icons.status.radar' // I will add radar
    },
    {
        file: 'src/routes/settings/index.tsx',
        search: /Icons\.ui\.cloud/g,
        replace: 'Icons.status.cloud'
    }
];

for (const rep of replacements) {
    const p = path.join(__dirname, rep.file);
    if (!fs.existsSync(p)) {
        console.log(`File not found: ${p}`);
        continue;
    }
    const c = fs.readFileSync(p, 'utf8');
    const modified = c.replace(rep.search, rep.replace);
    if (c !== modified) {
        fs.writeFileSync(p, modified, 'utf8');
        console.log(`Fixed ${rep.file}`);
    }
}
