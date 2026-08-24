export interface SpineTheme {
    bg: string;
    text: string;
    accent: string;
    vol: string;
    subtitle: string;
    borderColor: string;
    colIndex: number;
    rawImg: string;
    baseImg: string;
    attackImg: string;
    kanji: string;
    eraYears: string;
    auraColor: string;
    sliceImg: string;
    colors: string[];
    expandedTopImg?: string;
    expandedBottomImg?: string;
}

const spineThemes: Record<string, SpineTheme> = {
    "dragon_ball": {
        bg: "linear-gradient(to bottom, #0284c7 0%, #0369a1 45%, #075985 80%, #0c4a6e 100%)",
        text: "#ffffff",
        accent: "#38bdf8",
        vol: "1",
        subtitle: "DRAGON BALL",
        borderColor: "#0284c7",
        colIndex: 0,
        rawImg: "/icons/series-icons/evolution/db-kid-goku.png",
        baseImg: "/icons/series-icons/evolution/db-kid-goku.png",
        attackImg: "/icons/series-icons/evolution/01-kid-goku-db.png",
        kanji: "亀",
        eraYears: "1986–1989",
        auraColor: "rgba(56, 189, 248, 0.6)",
        sliceImg: "/icons/series-icons/evolution/spine-db-kid.png",
        colors: ["#38bdf8", "#0284c7", "#0c4a6e"],
        expandedTopImg: "/icons/series-icons/db-kid-top.png",
        expandedBottomImg: "/icons/series-icons/db-kid-bottom.png"
    },
    "dragon_ball_z": {
        bg: "linear-gradient(to bottom, #d97706 0%, #b45309 45%, #92400e 75%, #78350f 100%)",
        text: "#ffffff",
        accent: "#f59e0b",
        vol: "2",
        subtitle: "DRAGON BALL Z",
        borderColor: "#d97706",
        colIndex: 1,
        rawImg: "/icons/series-icons/evolution/02-base-dbz.png",
        baseImg: "/icons/series-icons/evolution/02-base-dbz.png",
        attackImg: "/icons/series-icons/evolution/03-ssj1-dbz.png",
        kanji: "界",
        eraYears: "1989–1996",
        auraColor: "rgba(245, 158, 11, 0.6)",
        sliceImg: "/icons/series-icons/evolution/spine-dbz-ssj1.png",
        colors: ["#fbbf24", "#f59e0b", "#9a3412"]
    },
    "dragon_ball_gt": {
        bg: "linear-gradient(to bottom, #ea580c 0%, #c2410c 45%, #9a3412 75%, #7c2d12 100%)",
        text: "#ffffff",
        accent: "#ea580c",
        vol: "3",
        subtitle: "DRAGON BALL GT",
        borderColor: "#ea580c",
        colIndex: 2,
        rawImg: "/icons/series-icons/posterior/goku-raw-dbgt.png",
        baseImg: "/icons/series-icons/posterior/goku-raw-dbgt.png",
        attackImg: "/icons/series-icons/evolution/06-ssj4-gt.png",
        kanji: "GT",
        eraYears: "1996–1997",
        auraColor: "rgba(234, 88, 12, 0.6)",
        sliceImg: "/icons/series-icons/evolution/spine-dbgt-ssj4.png",
        colors: ["#f97316", "#ea580c", "#7f1d1d"]
    },
    "dragon_ball_kai": {
        bg: "linear-gradient(to bottom, #334155 0%, #1e293b 45%, #0f172a 75%, #020617 100%)",
        text: "#ffffff",
        accent: "#38bdf8",
        vol: "4",
        subtitle: "DB KAI",
        borderColor: "#334155",
        colIndex: 3,
        rawImg: "/icons/series-icons/evolution/02-base-dbz.png",
        baseImg: "/icons/series-icons/evolution/02-base-dbz.png",
        attackImg: "/icons/series-icons/evolution/04-ssj2-halo-dbkai.png",
        kanji: "改",
        eraYears: "2009–2015",
        auraColor: "rgba(56, 189, 248, 0.6)",
        sliceImg: "/icons/series-icons/evolution/spine-dbkai-halo.png",
        colors: ["#475569", "#334155", "#0f172a"]
    },
    "dragon_ball_super": {
        bg: "linear-gradient(to bottom, #0891b2 0%, #0e7490 45%, #155e75 75%, #083344 100%)",
        text: "#ffffff",
        accent: "#06b6d4",
        vol: "5",
        subtitle: "DB SUPER",
        borderColor: "#0891b2",
        colIndex: 4,
        rawImg: "/icons/series-icons/goku-raw-dbs.webp",
        baseImg: "/icons/series-icons/goku-raw-dbs.webp",
        attackImg: "/icons/series-icons/evolution/09-ui-super.png",
        kanji: "超",
        eraYears: "2015–2018",
        auraColor: "rgba(6, 182, 212, 0.6)",
        sliceImg: "/icons/series-icons/evolution/spine-dbs-ui.png",
        colors: ["#06b6d4", "#0891b2", "#0f172a"]
    },
    "dragon_ball_daima": {
        bg: "linear-gradient(to bottom, #b45309 0%, #92400e 45%, #78350f 75%, #451a03 100%)",
        text: "#ffffff",
        accent: "#f59e0b",
        vol: "6",
        subtitle: "DB DAIMA",
        borderColor: "#ea580c",
        colIndex: 5,
        rawImg: "/icons/series-icons/goku-raw-daima.webp",
        baseImg: "/icons/series-icons/goku-raw-daima.webp",
        attackImg: "/icons/series-icons/evolution/10-daima.png",
        kanji: "魔",
        eraYears: "2024–PRESENTE",
        auraColor: "rgba(245, 158, 11, 0.6)",
        sliceImg: "",
        colors: ["#fbbf24", "#f59e0b", "#7c2d12"]
    }
};

export const getSpineConfig = (seriesId: string, id: number, fallbackTitle?: string): SpineTheme => {
    const theme = spineThemes[seriesId];
    if (theme) return theme;

    const colors = [
        { bg: "linear-gradient(to bottom, #ff7043, #d84315, #bf360c)", colors: ["#ff7043", "#d84315", "#bf360c"], borderColor: "#bf360c", accent: "#ff7043" },
        { bg: "linear-gradient(to bottom, #ab47bc, #7b1fa2, #4a148c)", colors: ["#ab47bc", "#7b1fa2", "#4a148c"], borderColor: "#4a148c", accent: "#ab47bc" },
        { bg: "linear-gradient(to bottom, #66bb6a, #388e3c, #1b5e20)", colors: ["#66bb6a", "#388e3c", "#1b5e20"], borderColor: "#1b5e20", accent: "#66bb6a" },
        { bg: "linear-gradient(to bottom, #42a5f5, #1976d2, #0d47a1)", colors: ["#42a5f5", "#1976d2", "#0d47a1"], borderColor: "#0d47a1", accent: "#42a5f5" }
    ];
    const cfg = colors[id % colors.length];
    const defaultRaw = fallbackTitle?.toLowerCase().includes("dragon") ? "/icons/series-icons/evolution/02-base-dbz.png" : "";
    const defaultAttack = fallbackTitle?.toLowerCase().includes("dragon") ? "/icons/series-icons/evolution/03-ssj1-dbz.png" : "";
    return {
        bg: cfg.bg,
        text: "#ffffff",
        accent: cfg.accent || "#ff6e3a",
        vol: String((id % 5) + 1),
        subtitle: fallbackTitle ? fallbackTitle.toUpperCase() : "SERIE",
        borderColor: cfg.borderColor,
        colIndex: id % 5,
        rawImg: defaultRaw,
        baseImg: defaultRaw,
        attackImg: defaultAttack,
        kanji: "★",
        eraYears: "SERIE",
        auraColor: "rgba(245, 158, 11, 0.75)",
        sliceImg: "",
        colors: cfg.colors
    };
};
