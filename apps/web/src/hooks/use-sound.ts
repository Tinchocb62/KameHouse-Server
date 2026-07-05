import { useCallback } from "react";
import { useAppStore } from "@/lib/store";

// Static global pool to cache HTMLAudioElement instances and prevent GC thrashing
const sfxPool: Record<string, HTMLAudioElement> = {};

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

// Helper function to manage cache without mutating global state inside render/callbacks of hook
function getOrAddAudio(path: string): HTMLAudioElement {
    let audio = sfxPool[path];
    if (!audio) {
        audio = new Audio(path);
        sfxPool[path] = audio;
    }
    return audio;
}

export function useSound() {
    const uiSoundsEnabled = useAppStore((state) => state.uiSoundsEnabled);
    const uiSoundsVolume = useAppStore((state) => state.uiSoundsVolume);
    const isGlobalMuted = useAppStore((state) => state.isGlobalMuted);

    const playSound = useCallback((type: SfxType, volume = 0.15) => {
        if (!uiSoundsEnabled || isGlobalMuted) return;
        try {
            const path = SFX_PATHS[type];
            if (!path) return;

            const audio = getOrAddAudio(path);

            // If already playing, rewind to the start
            if (!audio.paused) {
                audio.currentTime = 0;
            }

            audio.volume = volume * uiSoundsVolume;
            
            // Play safely handling the promise returned by modern browsers
            audio.play().catch(() => {
                // Ignore autoplay/user interaction errors silently
            });
        } catch (e) {
            console.warn("Could not play UI sound effect:", e);
        }
    }, [uiSoundsEnabled, isGlobalMuted, uiSoundsVolume]);

    return { playSound };
}
