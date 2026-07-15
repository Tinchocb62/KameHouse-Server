import { useState, useEffect } from "react";

export interface ResponsiveBreakpoints {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isWide: boolean;
}

function getBreakpoints(): ResponsiveBreakpoints {
    const w = typeof window !== "undefined" ? window.innerWidth : 1920;
    return {
        isMobile: w <= 767,
        isTablet: w >= 768 && w <= 1023,
        isDesktop: w >= 1024,
        isWide: w >= 1280,
    };
}

export function useResponsive(): ResponsiveBreakpoints {
    const [breakpoints, setBreakpoints] = useState<ResponsiveBreakpoints>(getBreakpoints);

    useEffect(() => {
        const mobileQuery = window.matchMedia("(max-width: 767px)");
        const tabletQuery = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
        const desktopQuery = window.matchMedia("(min-width: 1024px)");
        const wideQuery = window.matchMedia("(min-width: 1280px)");

        const update = () => {
            setBreakpoints(getBreakpoints());
        };

        // Initial trigger (redundant but safe)
        update();

        // matchMedia change listeners
        if (typeof mobileQuery.addEventListener === "function") {
            mobileQuery.addEventListener("change", update);
            tabletQuery.addEventListener("change", update);
            desktopQuery.addEventListener("change", update);
            wideQuery.addEventListener("change", update);
        } else {
            mobileQuery.addListener(update);
            tabletQuery.addListener(update);
            desktopQuery.addListener(update);
            wideQuery.addListener(update);
        }

        // Backup: resize event — catches cases where matchMedia change
        // doesn't fire (e.g. Electron window maximized while hidden)
        const onResize = () => update();
        window.addEventListener("resize", onResize, { passive: true });

        return () => {
            if (typeof mobileQuery.removeEventListener === "function") {
                mobileQuery.removeEventListener("change", update);
                tabletQuery.removeEventListener("change", update);
                desktopQuery.removeEventListener("change", update);
                wideQuery.removeEventListener("change", update);
            } else {
                mobileQuery.removeListener(update);
                tabletQuery.removeListener(update);
                desktopQuery.removeListener(update);
                wideQuery.removeListener(update);
            }
            window.removeEventListener("resize", onResize);
        };
    }, []);

    return breakpoints;
}
