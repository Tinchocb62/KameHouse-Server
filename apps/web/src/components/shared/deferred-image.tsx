import React, { useState, useEffect, useRef } from 'react';

interface DeferredImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    placeholderColor?: string;
    rootMargin?: string;
    threshold?: number | number[];
}

export function DeferredImage({
    src,
    alt,
    className,
    placeholderColor = '#1A1A1A',
    rootMargin = '200px',
    threshold = 0,
    ...props
}: DeferredImageProps) {
    const [isIntersecting, setIsIntersecting] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsIntersecting(true);
                    if (imgRef.current) {
                        observer.unobserve(imgRef.current);
                    }
                }
            },
            {
                rootMargin,
                threshold,
            }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => {
            if (imgRef.current) {
                observer.unobserve(imgRef.current);
            }
        };
    }, [rootMargin, threshold]);

    return (
        <div style={{ backgroundColor: placeholderColor }} className={`relative overflow-hidden ${className || ''}`}>
            {isIntersecting && (
                <img
                    ref={imgRef}
                    src={src}
                    alt={alt}
                    loading="lazy"
                    onLoad={() => setIsLoaded(true)}
                    className={`transition-opacity duration-500 w-full h-full object-cover ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className || ''}`}
                    {...props}
                />
            )}
            {!isIntersecting && <div ref={imgRef} className="absolute inset-0" />}
        </div>
    );
}
