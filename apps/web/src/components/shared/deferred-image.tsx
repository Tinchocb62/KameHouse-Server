import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/components/ui/core/styling';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageOff } from 'lucide-react';
import { getTinyResImage } from '@/lib/helpers/images';

interface DeferredImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "onDrag"> {
    src: string;
    alt: string;
    lowResSrc?: string;
    placeholderColor?: string;
    rootMargin?: string;
    threshold?: number | number[];
    priority?: boolean;
    aspectRatio?: string;
    showSkeleton?: boolean;
    fallback?: React.ReactNode;
}

const NO_COVER = "/no-cover.png"

const observers = new Map<string, IntersectionObserver>();
const observerCallbacks = new WeakMap<Element, () => void>();

function getObserver(rootMargin: string, threshold: string): IntersectionObserver {
    const key = `${rootMargin}_${threshold}`;
    let observer = observers.get(key);
    if (!observer) {
        const thresholdVal = threshold.includes(',') 
            ? threshold.split(',').map(Number) 
            : Number(threshold);
            
        observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const callback = observerCallbacks.get(entry.target);
                        if (callback) {
                            callback();
                            observerCallbacks.delete(entry.target);
                            observer?.unobserve(entry.target);
                        }
                    }
                });
            },
            { rootMargin, threshold: thresholdVal }
        );
        observers.set(key, observer);
    }
    return observer;
}

export function DeferredImage(props: DeferredImageProps) {
    const {
        src,
        alt,
        lowResSrc,
        className,
        placeholderColor = '#1A1A1A',
        rootMargin = '1000px',
        threshold = 0,
        priority = false,
        showSkeleton = true,
        fallback,
        onError,
        onLoad,
        ...restProps
    } = props;

    const [isIntersecting, setIsIntersecting] = useState(priority);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLowResLoaded, setIsLowResLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [showLqip, setShowLqip] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [prevSrc, setPrevSrc] = useState(src);
    const [prevPriority, setPrevPriority] = useState(priority);
    if (src !== prevSrc || priority !== prevPriority) {
        setPrevSrc(src);
        setPrevPriority(priority);
        setIsLoaded(false);
        setIsLowResLoaded(false);
        setHasError(false);
        setIsIntersecting(priority);
        setShowLqip(true);
    }

    const lqipSrc = lowResSrc || getTinyResImage(src);

    const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        setIsLoaded(true);
        onLoad?.(e);
        
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            setShowLqip(false);
        }, 600);
    }, [onLoad]);

    const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        setHasError(true);
        onError?.(e);
    }, [onError]);
    const thresholdStr = Array.isArray(threshold) ? threshold.join(',') : String(threshold);

    // Cancela el timer que oculta el LQIP cuando cambia src/priority (el reset de arriba
    // no puede tocar refs durante el render) y también al desmontar.
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [src, priority]);

    useEffect(() => {
        if (!src) {
            Promise.resolve().then(() => {
                setHasError(true);
                setIsLoaded(true);
                setIsIntersecting(true);
            });
            return;
        }

        if (priority) {
            Promise.resolve().then(() => {
                setIsIntersecting(true);
            });
            return;
        }

        const currentElement = containerRef.current;
        if (!currentElement) return;

        const observer = getObserver(rootMargin, thresholdStr);

        observerCallbacks.set(currentElement, () => {
            setIsIntersecting(true);
        });
        observer.observe(currentElement);

        return () => {
            if (currentElement) {
                observerCallbacks.delete(currentElement);
                observer.unobserve(currentElement);
            }
        };
    }, [src, rootMargin, thresholdStr, priority]);

    return (
        <div
            ref={containerRef}
            style={{ backgroundColor: isLoaded ? 'transparent' : placeholderColor }}
            className={cn("relative overflow-hidden", className)}
        >
            {/* Pulse Skeleton: shown only while low-res image is NOT loaded and high-res is NOT loaded */}
            {!isLoaded && !isLowResLoaded && !hasError && isIntersecting && showSkeleton && (
                <div className="absolute inset-0 z-10 overflow-hidden">
                    <div className="absolute inset-0 animate-pulse bg-zinc-800/80 backdrop-blur-md" />
                    <Skeleton className="h-full w-full rounded-none bg-transparent opacity-50" />
                </div>
            )}

            {/* Low-res blurred placeholder (LQIP) */}
            {!hasError && isIntersecting && lqipSrc && showLqip && (
                <img
                    src={lqipSrc}
                    alt=""
                    aria-hidden="true"
                    decoding="async"
                    onLoad={() => setIsLowResLoaded(true)}
                    className={cn(
                        "absolute inset-0 h-full w-full object-cover scale-[1.08] filter blur-[12px] transition-opacity duration-500 ease-out",
                        isLowResLoaded ? "opacity-100" : "opacity-0"
                    )}
                />
            )}

            {/* Main high-res image */}
            {!hasError && isIntersecting && (
                <img
                    src={src}
                    alt={alt}
                    loading={priority ? "eager" : "lazy"}
                    decoding="async"
                    onLoad={handleLoad}
                    onError={handleError}
                    className={cn(
                        "relative h-full w-full object-cover transition-opacity duration-500 ease-out",
                        !isLoaded && "will-change-[opacity]",  // Only hint GPU during the fade-in
                        isLoaded ? "opacity-100" : "opacity-0"
                    )}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    {...(restProps as any)}
                />
            )}

            {hasError && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-900 text-zinc-600">
                    {fallback ? (
                        fallback
                    ) : (
                        <>
                            <ImageOff className="mb-2 h-8 w-8 opacity-20" />
                            <img
                                src={NO_COVER}
                                alt=""
                                aria-hidden="true"
                                decoding="async"
                                className="absolute inset-0 h-full w-full object-cover opacity-10"
                            />
                            <span className="px-4 text-center text-[10px] font-medium uppercase tracking-wider opacity-40">
                                Imagen no disponible
                            </span>
                        </>
                    )}
                </div>
            )}

            {!isIntersecting && !priority && (
                <div className="absolute inset-0" />
            )}
        </div>
    );
}
