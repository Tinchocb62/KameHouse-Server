import { Variants } from "framer-motion";

export const EASE_SMOOTH_OUT: [number, number, number, number] = [0.2, 1, 0.2, 1];
export const DUR_FAST_S = 0.15;
export const DUR_BASE_S = 0.25;

export const staggerList: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
        }
    }
};

export const staggerItem: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: DUR_BASE_S,
            ease: EASE_SMOOTH_OUT,
        }
    }
};

export const staggerAvatar: Variants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: DUR_BASE_S,
            ease: EASE_SMOOTH_OUT,
        }
    }
};
