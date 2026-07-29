export interface SpineTheme {
    bg: string;
    text: string;
    accent: string;
    vol: string;
    subtitle: string;
    borderColor: string;
    colIndex: number;
    rawImg: string;
    colors: string[];
}

const spineThemes: Record<string, SpineTheme> = {
    "dragon_ball": {
        bg: "linear-gradient(to bottom, #2b74d9 0%, #1557ad 55%, #0a3066 100%)",
        text: "#ffffff",
        accent: "#ffd54f",
        vol: "1",
        subtitle: "DRAGON BALL",
        borderColor: "#0d47a1",
        colIndex: 0,
        rawImg: "/icons/series-icons/goku-raw-db.webp",
        colors: ["#2b74d9", "#1557ad", "#0a3066"]
    },
    "dragon_ball_z": {
        bg: "linear-gradient(to bottom, #f57c00 0%, #d84315 55%, #900c0c 100%)",
        text: "#ffffff",
        accent: "#ffd54f",
        vol: "2",
        subtitle: "DRAGON BALL Z",
        borderColor: "#b71c1c",
        colIndex: 1,
        rawImg: "/icons/series-icons/goku-raw-dbz.webp",
        colors: ["#f57c00", "#d84315", "#900c0c"]
    },
    "dragon_ball_gt": {
        bg: "linear-gradient(to bottom, #c62828 0%, #8e24aa 55%, #2a0845 100%)",
        text: "#ffffff",
        accent: "#ffb74d",
        vol: "3",
        subtitle: "DRAGON BALL GT",
        borderColor: "#1a237e",
        colIndex: 2,
        rawImg: "/icons/series-icons/goku-raw-dbgt.webp",
        colors: ["#c62828", "#8e24aa", "#2a0845"]
    },
    "dragon_ball_super": {
        bg: "linear-gradient(to bottom, #00b4d8 0%, #0077b6 55%, #03045e 100%)",
        text: "#ffffff",
        accent: "#ffd54f",
        vol: "4",
        subtitle: "DB SUPER",
        borderColor: "#004d40",
        colIndex: 3,
        rawImg: "/icons/series-icons/goku-raw-dbs.webp",
        colors: ["#00b4d8", "#0077b6", "#03045e"]
    },
    "dragon_ball_daima": {
        bg: "linear-gradient(to bottom, #ffb703 0%, #fb8500 55%, #d84315 100%)",
        text: "#ffffff",
        accent: "#ffffff",
        vol: "5",
        subtitle: "DB DAIMA",
        borderColor: "#e65100",
        colIndex: 4,
        rawImg: "/icons/series-icons/goku-raw-daima.webp",
        colors: ["#ffb703", "#fb8500", "#d84315"]
    }
};

export const getSpineConfig = (seriesId: string, id: number): SpineTheme => {
    const theme = spineThemes[seriesId];
    if (theme) return theme;

    const colors = [
        { bg: "linear-gradient(to bottom, #ff7043, #d84315, #bf360c)", colors: ["#ff7043", "#d84315", "#bf360c"], borderColor: "#bf360c" },
        { bg: "linear-gradient(to bottom, #ab47bc, #7b1fa2, #4a148c)", colors: ["#ab47bc", "#7b1fa2", "#4a148c"], borderColor: "#4a148c" },
        { bg: "linear-gradient(to bottom, #66bb6a, #388e3c, #1b5e20)", colors: ["#66bb6a", "#388e3c", "#1b5e20"], borderColor: "#1b5e20" },
        { bg: "linear-gradient(to bottom, #42a5f5, #1976d2, #0d47a1)", colors: ["#42a5f5", "#1976d2", "#0d47a1"], borderColor: "#0d47a1" }
    ];
    const cfg = colors[id % colors.length];
    return {
        bg: cfg.bg,
        text: "#ffffff",
        accent: "#ff6e3a",
        vol: String((id % 5) + 1),
        subtitle: "SERIE",
        borderColor: cfg.borderColor,
        colIndex: id % 5,
        // No hardcoded character art for series outside the known Dragon
        // Ball themes — showing Goku on an unrelated scanned series would
        // be wrong. The card falls back to its poster/gradient instead.
        rawImg: "",
        colors: cfg.colors
    };
};
