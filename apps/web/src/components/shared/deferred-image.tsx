import { useState, useEffect, useRef, useCallback } from 'react';

interface DeferredImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    placeholderColor?: string;
    rootMargin?: string;
    threshold?: number | number[];
    priority?: boolean;
    aspectRatio?: string;
}

const BLUR_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='%231a1a1b'/%3E%3C/svg%3E"

export function DeferredImage(props: DeferredImageProps) {
    const {
        src,
        alt,
        className,
        placeholderColor = '#1A1A1A',
        rootMargin = '200px',
        threshold = 0,
        priority = false,
        onError,
        ...restProps
    } = props;

    const [isIntersecting, setIsIntersecting] = useState(priority);
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    const handleLoad = useCallback(() => {
        setIsLoaded(true);
    }, []);

    const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        setHasError(true);
        onError?.(e);
    }, [onError]);

    useEffect(() => {
        if (priority) {
            setIsIntersecting(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsIntersecting(true);
                    if (containerRef.current) {
                        observer.unobserve(containerRef.current);
                    }
                }
            },
            {
                rootMargin,
                threshold,
            }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            if (containerRef.current) {
                observer.unobserve(containerRef.current);
            }
        };
    }, [rootMargin, threshold, priority]);

    const generateSrcSet = useCallback((url: string): string | undefined => {
        if (!url || url.startsWith('data:') || url.startsWith('http') === false) {
            return undefined;
        }

        const widths = [320, 480, 640, 960, 1280, 1920];
        return widths
            .map(w => `${url}?w=${w}&q=80 ${w}w`)
            .join(', ');
    }, []);

    return (
        <div
            ref={containerRef}
            style={{ backgroundColor: placeholderColor }}
            className={`relative overflow-hidden ${className || ''}`}
        >
            {!hasError && isIntersecting && (
                <img
                    ref={imgRef}
                    src={priority ? src : undefined}
                    srcSet={!priority ? generateSrcSet(src) : undefined}
                    alt={alt}
                    loading={priority ? "eager" : "lazy"}
                    onLoad={handleLoad}
                    onError={handleError}
                    className={`
                        w-full h-full object-cover
                        transition-opacity duration-500
                        ${isLoaded ? 'opacity-100' : 'opacity-0'}
                    `}
                    {...restProps}
                />
            )}

            {!isIntersecting && (
                <div className="absolute inset-0" />
            )}

            {isIntersecting && !isLoaded && !hasError && (
                <img
                    src={BLUR_PLACEHOLDER}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover opacity-50"
                />
            )}

            {hasError && (
                <img
                    src={`data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300'%3E%3Crect width='200' height='300' fill='%2318181b'/%3E%3C/svg%3E`}
                    alt={alt}
                    className="absolute inset-0 h-full w-full object-cover"
                />
            )}
        </div>
    );
}
