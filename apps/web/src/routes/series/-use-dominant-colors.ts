import { useState, useEffect, useRef } from "react";

function rgbToHex(r: number, g: number, b: number): string {
    return "#" + [r, g, b].map(x => Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0")).join("");
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h /= 360;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h * 12) % 12;
        return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function boostColor(r: number, g: number, b: number): [number, number, number] {
    const [h, sOrig, lOrig] = rgbToHsl(r, g, b);
    const s = Math.min(1, sOrig * 1.3 + 0.1);
    const l = Math.max(0.25, Math.min(0.65, lOrig));
    return hslToRgb(h, s, l);
}

function colorDistance(a: [number, number, number], b: [number, number, number]): number {
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

function isUsefulPixel(r: number, g: number, b: number, a: number): boolean {
    if (a < 200) return false;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max - min < 15 && max < 60) return false;
    if (max - min < 10 && max > 230) return false;
    if (r > 240 && g > 240 && b > 240) return false;
    if (r < 15 && g < 15 && b < 15) return false;
    return true;
}

function quantize(pixels: [number, number, number][], k: number, iterations = 20): [number, number, number][] {
    if (pixels.length === 0) return Array(k).fill([30, 30, 40]);

    const sorted = [...pixels].sort((a, b) => {
        const sa = a[0] + a[1] + a[2];
        const sb = b[0] + b[1] + b[2];
        return sa - sb;
    });

    const centroids: [number, number, number][] = [];
    for (let i = 0; i < k; i++) {
        const idx = Math.floor((i / k) * sorted.length);
        centroids.push([...sorted[Math.min(idx, sorted.length - 1)]]);
    }

    for (let iter = 0; iter < iterations; iter++) {
        const buckets: [number, number, number][][] = Array.from({ length: k }, () => []);

        for (const px of pixels) {
            let minDist = Infinity;
            let minIdx = 0;
            for (let c = 0; c < centroids.length; c++) {
                const d = colorDistance(px, centroids[c]);
                if (d < minDist) {
                    minDist = d;
                    minIdx = c;
                }
            }
            buckets[minIdx].push(px);
        }

        for (let c = 0; c < k; c++) {
            if (buckets[c].length === 0) continue;
            const sum = [0, 0, 0];
            for (const px of buckets[c]) {
                sum[0] += px[0];
                sum[1] += px[1];
                sum[2] += px[2];
            }
            const n = buckets[c].length;
            centroids[c] = [Math.round(sum[0] / n), Math.round(sum[1] / n), Math.round(sum[2] / n)];
        }
    }

    return centroids;
}

function extractColors(imageSrc: string, numColors = 3): Promise<string[]> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const size = 80;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(["#1a1a2e", "#16213e", "#0f3460"]);

            ctx.drawImage(img, 0, 0, size, size);
            const data = ctx.getImageData(0, 0, size, size).data;

            const pixels: [number, number, number][] = [];
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
                if (!isUsefulPixel(r, g, b, a)) continue;
                pixels.push(boostColor(r, g, b));
            }

            if (pixels.length < 10) return resolve(["#1a1a2e", "#16213e", "#0f3460"]);

            const k = numColors + 3;
            const centroids = quantize(pixels, k);

            const scored = centroids.map(c => {
                let count = 0;
                for (const px of pixels) {
                    if (colorDistance(px, c) < 2500) count++;
                }
                const [h, s, l] = rgbToHsl(c[0], c[1], c[2]);
                return { color: c, count, saturation: s, hue: h };
            });

            scored.sort((a, b) => {
                if (Math.abs(a.saturation - b.saturation) > 0.15) return b.saturation - a.saturation;
                return b.count - a.count;
            });

            const picked: typeof scored = [];
            for (const s of scored) {
                if (picked.length >= numColors) break;
                const tooClose = picked.some(p => Math.abs(p.hue - s.hue) < 30 && Math.abs(p.saturation - s.saturation) < 0.1);
                if (!tooClose) picked.push(s);
            }

            while (picked.length < numColors && scored.length > 0) {
                const next = scored.find(s => !picked.includes(s));
                if (next) picked.push(next);
                else break;
            }

            const result = picked.map(s => rgbToHex(...s.color));
            while (result.length < numColors) result.push(result[result.length - 1] || "#1a1a2e");
            resolve(result);
        };
        img.onerror = () => resolve(["#1a1a2e", "#16213e", "#0f3460"]);
        img.src = imageSrc;
    });
}

const cache = new Map<string, string[]>();

export function useDominantColors(imageSrc: string | undefined, numColors = 3): string[] {
    const [colors, setColors] = useState<string[]>(["#1a1a2e", "#16213e", "#0f3460"]);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    useEffect(() => {
        if (!imageSrc) return;

        if (cache.has(imageSrc)) {
            setColors(cache.get(imageSrc)!);
            return;
        }

        extractColors(imageSrc, numColors).then(result => {
            cache.set(imageSrc, result);
            if (mountedRef.current) setColors(result);
        });
    }, [imageSrc, numColors]);

    return colors;
}
