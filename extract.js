const fs = require('fs');
const path = require('path');
const indexFile = path.join('apps', 'web', 'src', 'routes', 'series', '$seriesId', 'index.tsx');
const lines = fs.readFileSync(indexFile, 'utf8').split('\n');

const loreConfigContent = 'export ' + lines.slice(908, 948).join('\n') + '\n\n' + 'export ' + lines.slice(949, 990).join('\n') + '\n\n' + 'export ' + lines.slice(991, 1124).join('\n');

const loreHeaderContent = 'import React, { useState, useCallback } from "react";\n' +
'import { motion, AnimatePresence } from "framer-motion";\n' +
'import { cn } from "@/components/ui/core/styling";\n' +
'import { Icons } from "@/components/ui/icons";\n' +
'import { SagaPosterCard } from "./saga-poster-card";\n' +
'import sagaSynopsisTags from "@/lib/config/saga_synopsis_tags.json";\n' +
'import { resolveSeriesSagas } from "@/lib/config/dragonball.config";\n' +
'import type { SagaDTO } from "@/api/types/series.types";\n' +
'import { SAGA_LORE_MAPPING, getSagaCharacters } from "@/lib/config/dragonball-lore.config";\n\n' +
'export ' + lines.slice(1125, 1554).join('\n');

const posterCardContent = 'import React, { useState } from "react";\n' +
'import { motion, AnimatePresence } from "framer-motion";\n' +
'import { Icons } from "@/components/ui/icons";\n\n' +
'export ' + lines.slice(1555, 1632).join('\n');

fs.writeFileSync(path.join('apps', 'web', 'src', 'lib', 'config', 'dragonball-lore.config.ts'), loreConfigContent);
fs.writeFileSync(path.join('apps', 'web', 'src', 'routes', 'series', '$seriesId', '-components', 'saga-lore-header.tsx'), loreHeaderContent);
fs.writeFileSync(path.join('apps', 'web', 'src', 'routes', 'series', '$seriesId', '-components', 'saga-poster-card.tsx'), posterCardContent);

const importStatements = 'import { SagaLoreHeader } from "./-components/saga-lore-header";\n' +
'import { SagaPosterCard } from "./-components/saga-poster-card";\n' +
'import { SAGA_CHARACTER_MAPPING, SAGA_LORE_MAPPING, getSagaCharacters } from "@/lib/config/dragonball-lore.config";\n';

const newLines = [...lines.slice(0, 41), importStatements, ...lines.slice(41, 908)];
fs.writeFileSync(indexFile, newLines.join('\n'));
