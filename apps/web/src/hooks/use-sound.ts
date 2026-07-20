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
    }, []);

    return { playSound };
}
