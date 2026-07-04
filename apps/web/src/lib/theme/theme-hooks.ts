import { Models_Theme } from "@/api/generated/types"
import { useGetSettings } from "@/api/hooks/settings.hooks"


export const enum ThemeLibraryScreenBannerType {
    Dynamic = "dynamic",
    Custom = "custom",
}

export const enum ThemeMediaPageBannerType {
    Default = "default",
    BlurWhenUnavailable = "blur-when-unavailable",
    DimWhenUnavailable = "dim-when-unavailable",
    HideWhenUnavailable = "hide-when-unavailable",
    Blur = "blur",
    Dim = "dim",
    Hide = "hide",
}

export const ThemeMediaPageBannerTypeOptions = [
    {
        value: ThemeMediaPageBannerType.Default as string, label: "Default",
        description: "Always show a banner image. If not available, the cover image will be used instead.",
    },
    {
        value: ThemeMediaPageBannerType.BlurWhenUnavailable as string, label: "Blur when unavailable",
        description: "Show the banner image if available. If not available, the cover image will be used and blurred.",
    },
    {
        value: ThemeMediaPageBannerType.DimWhenUnavailable as string, label: "Dim if unavailable",
        description: "Show the banner image if available. If not available, the banner will be dimmed.",
    },
    {
        value: ThemeMediaPageBannerType.HideWhenUnavailable as string, label: "Hide if unavailable",
        description: "Show the banner image if available. If not available, the banner will be hidden.",
    },
    {
        value: ThemeMediaPageBannerType.Dim as string, label: "Dim",
        description: "Always dim the banner image.",
    },
    {
        value: ThemeMediaPageBannerType.Blur as string, label: "Blur",
        description: "Always blur the banner image.",
    },
    {
        value: ThemeMediaPageBannerType.Hide as string, label: "Hide",
        description: "Always hide the banner image.",
    },
]

export const enum ThemeMediaPageBannerSize {
    Default = "default", // block height
    Small = "small",
}

export const ThemeMediaPageBannerSizeOptions = [
    {
        value: ThemeMediaPageBannerSize.Default as string, label: "Large",
        description: "Fill a large portion of the screen.",
    },
    {
        value: ThemeMediaPageBannerSize.Small as string, label: "Smaller",
        description: "Use a smaller banner size, displaying more of the image.",
    },
]

export const enum ThemeMediaPageInfoBoxSize {
    // Default = "default",
    Fluid = "fluid",
    Boxed = "boxed",
}

export const ThemeMediaPageInfoBoxSizeOptions = [
    {
        value: ThemeMediaPageInfoBoxSize.Fluid as string, label: "Fluid",
        // description: "Full-width info box with rearrangement of elements.",
    },
    {
        value: ThemeMediaPageInfoBoxSize.Boxed as string, label: "Boxed",
        // description: "Display the media banner as a box",
    },
]

export type ThemeSettings = Omit<Models_Theme, "id" | "createdAt" | "updatedAt">

export const THEME_DEFAULT_VALUES: ThemeSettings = {
    enableColorSettings: false,
    backgroundColor: "#070707",
    accentColor: "#ff6e3a",
    sidebarBackgroundColor: "",
    themeEra: "",
    homeItems: [],
    themeAnimeEntryScreenLayout: "stacked",
    themeSmallerEpisodeCarouselSize: false,
    themeExpandSidebarOnHover: false,
    themeDisableSidebarTransparency: false,
    themeEnableSidebarGradient: false,
    themeEnableBlurringEffects: false,
    themeDisableCarouselAutoScroll: false,
    themeUseLegacyEpisodeCard: false,
    themeLibraryScreenBannerType: ThemeLibraryScreenBannerType.Dynamic,
    themeLibraryScreenCustomBannerImage: "",
    themeLibraryScreenCustomBannerPosition: "50% 50%",
    themeLibraryScreenCustomBannerOpacity: 10,
    themeLibraryScreenCustomBackgroundImage: "",
    themeLibraryScreenCustomBackgroundOpacity: 10,
    themeLibraryScreenCustomBackgroundBlur: "none",
    themeDisableLibraryScreenGenreSelector: false,
    themeMediaPageBannerType: ThemeMediaPageBannerType.Default,
    themeMediaPageBannerSize: ThemeMediaPageBannerSize.Default,
    themeMediaPageBannerInfoBoxSize: ThemeMediaPageInfoBoxSize.Fluid,
    // Was always-on ambient design behavior before this setting existed — now opt-in for flat default.
    themeEnableMediaPageBlurredBackground: false,
    themeShowEpisodeCardAnimeInfo: true,
    themeShowAnimeUnwatchedCount: true,
    themeHideEpisodeCardDescription: false,
    themeHideDownloadedEpisodeCardFilename: false,
    themeContinueWatchingDefaultSorting: "LAST_WATCHED_DESC",
    themeAnimeLibraryCollectionDefaultSorting: "TITLE_ASC",
    themeCustomCSS: "",
    themeMobileCustomCSS: "",
    themeUnpinnedMenuItems: [],
}

export type ThemeSettingsHook = {
    hasCustomBackgroundColor: boolean
    hasEraTheme: boolean
    hasCustomBackground: boolean
    hasCustomAccentColor: boolean
} & ThemeSettings

/**
 * Get the current theme settings
 * Reads the real settings persisted on the server (Settings → Apariencia),
 * falling back to THEME_DEFAULT_VALUES for anything not yet set.
 */
export function useThemeSettings(): ThemeSettingsHook {
    const { data: serverSettings } = useGetSettings()
    const theme = serverSettings?.theme

    const merged: ThemeSettings = theme
        ? {
            ...THEME_DEFAULT_VALUES,
            ...theme,
            backgroundColor: theme.backgroundColor || THEME_DEFAULT_VALUES.backgroundColor,
            accentColor: theme.accentColor || THEME_DEFAULT_VALUES.accentColor,
            themeLibraryScreenBannerType: theme.themeLibraryScreenBannerType || THEME_DEFAULT_VALUES.themeLibraryScreenBannerType,
            themeLibraryScreenCustomBannerPosition: theme.themeLibraryScreenCustomBannerPosition || THEME_DEFAULT_VALUES.themeLibraryScreenCustomBannerPosition,
            themeMediaPageBannerType: theme.themeMediaPageBannerType || THEME_DEFAULT_VALUES.themeMediaPageBannerType,
            themeMediaPageBannerSize: theme.themeMediaPageBannerSize || THEME_DEFAULT_VALUES.themeMediaPageBannerSize,
            themeMediaPageBannerInfoBoxSize: theme.themeMediaPageBannerInfoBoxSize || THEME_DEFAULT_VALUES.themeMediaPageBannerInfoBoxSize,
            themeContinueWatchingDefaultSorting: theme.themeContinueWatchingDefaultSorting || THEME_DEFAULT_VALUES.themeContinueWatchingDefaultSorting,
            themeAnimeLibraryCollectionDefaultSorting: theme.themeAnimeLibraryCollectionDefaultSorting || THEME_DEFAULT_VALUES.themeAnimeLibraryCollectionDefaultSorting,
        }
        : { ...THEME_DEFAULT_VALUES }

    // Derived from raw (un-coalesced) persisted values — used to drive the
    // three independent color toggles in Settings → Apariencia, since the
    // backend model has no separate enableCustomBg/enableCustomAccent fields.
    const rawThemeEra = theme?.themeEra ?? ""
    const rawBackgroundColor = theme?.backgroundColor ?? ""
    const rawAccentColor = theme?.accentColor ?? ""

    return {
        ...merged,
        hasCustomBackgroundColor: merged.enableColorSettings && !!merged.backgroundColor,
        hasEraTheme: rawThemeEra !== "",
        hasCustomBackground: rawBackgroundColor !== "",
        hasCustomAccentColor: rawAccentColor !== "",
    }
}



import { useResponsive } from "@/hooks/use-responsive"

export function useIsMobile(): { isMobile: boolean } {
    const { isMobile, isTablet } = useResponsive()
    return { isMobile: isMobile || isTablet }
}
