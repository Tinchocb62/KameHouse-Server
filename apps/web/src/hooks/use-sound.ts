import { useCallback } from "react";
import { useAppStore } from "@/lib/store";


export type SfxType = 
    | "hover"    // /sounds/seleccion de hover.wav
    | "series"   // /sounds/serie.wav
    | "detail"   // /sounds/entrar detalle serie-peliculas.wav
    | "random"   // /sounds/serie-pelicula random.wav
    | "category"; // /sounds/cambiar categoria.wav

const SFX_PATHS: Record<SfxType, string> = {
    hover: "/sounds/seleccion de hover.wav",
    series: "/sounds/serie.wav",
    detail: "/sounds/entrar detalle serie-peliculas.wav",
    random: "/sounds/serie-pelicula random.wav",
    category: "/sounds/cambiar categoria.wav"
};

// Static pool of audio elements to reuse instances and prevent GC / cloneNode() thread stalls
const POOL_SIZE = 3;
const sfxPool: Record<string, HTMLAudioElement[]> = {};
const poolIndex: Record<string, number> = {};

function getPooledAudio(path: string): HTMLAudioElement {
    if (!sfxPool[path]) {
        const a = new Audio(path);
        a.preload = "auto";
        sfxPool[path] = [a];
        poolIndex[path] = 0;
    }
    const pool = sfxPool[path];
    const idx = poolIndex[path];
    const audio = pool[idx];
    if (audio.paused || audio.ended) {
        audio.currentTime = 0;
        return audio;
    }
    if (pool.length < POOL_SIZE) {
        const newAudio = new Audio(path);
        newAudio.preload = "auto";
        pool.push(newAudio);
        return newAudio;
    }
    poolIndex[path] = (idx + 1) % pool.length;
    const nextAudio = pool[poolIndex[path]];
    nextAudio.currentTime = 0;
    return nextAudio;
}

export function useSound() {
    // Leemos el estado al momento de reproducir (getState) en vez de capturar
    // `uiSoundsEnabled` en el closure. Así el gate siempre refleja el toggle
    // actual aunque el consumidor memoice `playSound` con un valor viejo: de lo
    // contrario los efectos "no se apagan" al desactivar el audio, porque el
    // closure sigue viendo el valor con el que se creó.
    const playSound = useCallback((type: SfxType, volume = 0.15) => {
        const { uiSoundsEnabled, uiSoundsVolume } = useAppStore.getState();
        if (!uiSoundsEnabled) return;
        try {
            const path = SFX_PATHS[type];
            if (!path) return;

            const audio = getPooledAudio(path);
            audio.volume = Math.min(1, Math.max(0, volume * uiSoundsVolume));

            // Play safely handling the promise returned by modern browsers
            audio.play().catch(() => {
                // Ignore autoplay/user interaction errors silently
            });
        } catch (e) {
            console.warn("Could not play UI sound effect:", e);
        }
    }, []);

    return { playSound };
}
