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
        bg: "linear-gradient(to bottom, #42a5f5 0%, #1565c0 50%, #0d47a1 100%)",
        text: "#ffffff",
        accent: "#ffd54f",
        vol: "1",
        subtitle: "DB ORIGINAL",
        borderColor: "#0d47a1",
        colIndex: 0,
        rawImg: "/icons/series-icons/goku-raw-db.webp",
        colors: ["#42a5f5", "#1565c0", "#0d47a1"]
    },
    "dragon_ball_z": {
        bg: "linear-gradient(to bottom, #ff7043 0%, #d84315 50%, #b71c1c 100%)",
        text: "#ffffff",
        accent: "#ffd54f",
        vol: "2",
        subtitle: "DRAGON BALL Z",
        borderColor: "#b71c1c",
        colIndex: 1,
        rawImg: "/icons/series-icons/goku-raw-dbz.webp",
        colors: ["#ff7043", "#d84315", "#b71c1c"]
    },
    "dragon_ball_gt": {
        bg: "linear-gradient(to bottom, #7e57c2 0%, #4a148c 50%, #1a237e 100%)",
        text: "#ffffff",
        accent: "#ffb74d",
        vol: "3",
        subtitle: "SAGA GT",
        borderColor: "#1a237e",
        colIndex: 2,
        rawImg: "/icons/series-icons/goku-raw-dbgt.webp",
        colors: ["#7e57c2", "#4a148c", "#1a237e"]
    },
    "dragon_ball_super": {
        bg: "linear-gradient(to bottom, #26c6da 0%, #00838f 50%, #004d40 100%)",
        text: "#ffffff",
        accent: "#ffd54f",
        vol: "4",
        subtitle: "SUPER",
        borderColor: "#004d40",
        colIndex: 3,
        rawImg: "/icons/series-icons/goku-raw-dbs.webp",
        colors: ["#26c6da", "#00838f", "#004d40"]
    },
    "dragon_ball_daima": {
        bg: "linear-gradient(to bottom, #ffca28 0%, #f57f17 50%, #e65100 100%)",
        text: "#ffffff",
        accent: "#ffffff",
        vol: "5",
        subtitle: "DAIMA",
        borderColor: "#e65100",
        colIndex: 4,
        rawImg: "/icons/series-icons/goku-raw-daima.webp",
        colors: ["#ffca28", "#f57f17", "#e65100"]
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
