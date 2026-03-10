package handlers

import (
	"errors"
	"kamehouse/internal/api/anilist"
	"kamehouse/internal/customsource"
	"kamehouse/internal/library/anime"

	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/torrentstream"
	"kamehouse/internal/util"
	"kamehouse/internal/util/result"
	"time"

	"github.com/labstack/echo/v4"
)

// HandleGetLibraryCollection
//
//	@summary returns the main local anime collection.
//	@desc This creates a new LibraryCollection struct and returns it.
//	@desc This is used to get the main anime collection of the user.
//	@desc It uses the cached Anilist anime collection for the GET method.
//	@desc It refreshes the AniList anime collection if the POST method is used.
//	@route /api/v1/library/collection [GET,POST]
//	@returns anime.LibraryCollection
func (h *Handler) HandleGetLibraryCollection(c echo.Context) error {

	// Bypassing AniList and using Jellyfin natively if enabled
	if h.App.Settings.GetLibrary() != nil && h.App.Settings.Jellyfin != nil && h.App.Settings.Jellyfin.Enabled {
		jellyfinCollection, err := h.getJellyfinLibraryCollection(c)
		if err != nil {
			return h.RespondWithError(c, err)
		}
		return h.RespondWithData(c, jellyfinCollection)
	}

	animeCollection, err := h.App.GetAnimeCollection(false)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	if animeCollection == nil {
		animeCollection = &anilist.AnimeCollection{
			MediaListCollection: &anilist.AnimeCollection_MediaListCollection{
				Lists: []*anilist.AnimeCollection_MediaListCollection_Lists{},
			},
		}
	}

	originalAnimeCollection := animeCollection

	var lfs []*dto.LocalFile
	// If using Nakama's library, fetch it
	nakamaLibrary, fromNakama := h.App.NakamaManager.GetHostAnimeLibrary(c.Request().Context())
	if fromNakama {
		// Save the original anime collection to restore it later
		originalAnimeCollection = animeCollection.Copy()
		lfs = nakamaLibrary.LocalFiles

		// Store all media from the user's collection
		userMediaIds := make(map[int]struct{})
		userCustomSourceMedia := make(map[string]map[int]struct{})
		for _, list := range animeCollection.MediaListCollection.GetLists() {
			for _, entry := range list.GetEntries() {
				mId := entry.GetMedia().GetID()
				userMediaIds[mId] = struct{}{}

				// Add all user custom source media to a map
				// This will be used to avoid duplicates
				if customsource.IsExtensionId(mId) {
					_, localId := customsource.ExtractExtensionData(mId)
					extensionId, ok := customsource.GetCustomSourceExtensionIdFromSiteUrl(entry.GetMedia().GetSiteURL())
					if !ok {
						// couldn't figure out the extension, skip it
						continue
					}
					if _, ok := userCustomSourceMedia[extensionId]; !ok {
						userCustomSourceMedia[extensionId] = make(map[int]struct{})
					}
					userCustomSourceMedia[extensionId][localId] = struct{}{}
				}
			}
		}

		// Store all custom source media from the Nakama host
		nakamaCustomSourceMediaIds := make(map[int]struct{})
		for _, lf := range lfs {
			if lf.MediaId > 0 {
				if customsource.IsExtensionId(lf.MediaId) {
					nakamaCustomSourceMediaIds[lf.MediaId] = struct{}{}
				}
			}
		}

		// Find media entries that are missing from the user's collection
		userMissingAnilistMediaIds := make(map[int]struct{})
		for _, lf := range lfs {
			if lf.MediaId > 0 {
				if customsource.IsExtensionId(lf.MediaId) {
					continue
				}
				if _, ok := userMediaIds[lf.MediaId]; !ok {
					userMissingAnilistMediaIds[lf.MediaId] = struct{}{}
				}
			}
		}

		nakamaCustomSourceMedia := make(map[int]*anilist.AnimeListEntry)

		// Add missing AniList entries to the user's collection as "Planning"
		for _, list := range nakamaLibrary.AnimeCollection.MediaListCollection.GetLists() {
			for _, entry := range list.GetEntries() {
				mId := entry.GetMedia().GetID()
				if _, ok := userMissingAnilistMediaIds[mId]; ok {
					// create a new entry with blank list data
					newEntry := &anilist.AnimeListEntry{
						ID:     entry.GetID(),
						Media:  entry.GetMedia(),
						Status: &[]anilist.MediaListStatus{anilist.MediaListStatusPlanning}[0],
					}
					animeCollection.MediaListCollection.AddEntryToList(newEntry, anilist.MediaListStatusPlanning)
				}
				// Check if the media from a custom source
				if _, ok := nakamaCustomSourceMediaIds[mId]; ok {
					nakamaCustomSourceMedia[mId] = entry
				}
			}
		}

		// Add missing custom source entries to the user's collection as "Planning"
		// We'll find the equivalent
		if len(nakamaCustomSourceMedia) > 0 {
			// Go through all custom source media,
			// For each one, find the extension and replace the generated ID
			for mId, entry := range nakamaCustomSourceMedia {
				//extensionIdentifier, localId := customsource.ExtractExtensionData(mId)
				extensionId, ok := customsource.GetCustomSourceExtensionIdFromSiteUrl(entry.GetMedia().GetSiteURL())
				if !ok {
					// couldn't figure out the extension, skip it
					continue
				}

				_, localId := customsource.ExtractExtensionData(mId)

				// Find the same extension, if it's not installed, skip it
				customSource, ok := h.App.ExtensionRepository.GetCustomSourceExtensionByID(extensionId)
				if !ok {
					continue
				}

				// Generate a new ID for the custom source media
				newId := customsource.GenerateMediaId(customSource.GetExtensionIdentifier(), localId)
				entry.GetMedia().ID = newId

				// Add the entry if the user doesn't already have it
				if _, ok := userCustomSourceMedia[extensionId][localId]; !ok {
					newEntry := &anilist.AnimeListEntry{
						ID:     entry.GetID(),
						Media:  entry.GetMedia(),
						Status: &[]anilist.MediaListStatus{anilist.MediaListStatusPlanning}[0],
					}
					animeCollection.MediaListCollection.AddEntryToList(newEntry, anilist.MediaListStatusPlanning)
				}

				// Update the local files
				for _, lf := range lfs {
					if lf.MediaId == mId {
						lf.MediaId = newId
						break
					}
				}
			}
		}

	} else {
		lfs, _, err = db.GetLocalFiles(h.App.Database)
		if err != nil {
			return h.RespondWithError(c, err)
		}
	}

	libraryCollection, err := anime.NewLibraryCollection(c.Request().Context(), &anime.NewLibraryCollectionOptions{
		Database:            h.App.Database,
		PlatformRef:         h.App.Metadata.AnilistPlatformRef,
		LocalFiles:          lfs,
		MetadataProviderRef: h.App.Metadata.ProviderRef,
	})
	if err != nil {
		return h.RespondWithError(c, err)
	}

	// Restore the original anime collection if it was modified
	if fromNakama {
		*animeCollection = *originalAnimeCollection
	}

	if !fromNakama {
		if (h.App.SecondarySettings.Torrentstream != nil && h.App.SecondarySettings.Torrentstream.Enabled && h.App.SecondarySettings.Torrentstream.IncludeInLibrary) ||
			(h.App.Settings.GetLibrary() != nil && h.App.Settings.GetLibrary().EnableOnlinestream && h.App.Settings.GetLibrary().IncludeOnlineStreamingInLibrary) ||
			(h.App.SecondarySettings.Debrid != nil && h.App.SecondarySettings.Debrid.Enabled && h.App.SecondarySettings.Debrid.IncludeDebridStreamInLibrary) {
			h.App.TorrentstreamRepository.HydrateStreamCollection(&torrentstream.HydrateStreamCollectionOptions{
				Database:            h.App.Database,
				LibraryCollection:   libraryCollection,
				MetadataProviderRef: h.App.Metadata.ProviderRef,
			})
		}
	}

	// Add and remove necessary metadata when hydrating from Nakama
	if fromNakama {
		for _, ep := range libraryCollection.ContinueWatchingList {
			ep.IsNakamaEpisode = true
		}
		for _, list := range libraryCollection.Lists {
			for _, entry := range list.Entries {
				if entry.EntryLibraryData == nil {
					continue
				}
				entry.NakamaEntryLibraryData = &anime.NakamaEntryLibraryData{
					UnwatchedCount: entry.EntryLibraryData.UnwatchedCount,
					MainFileCount:  entry.EntryLibraryData.MainFileCount,
				}
				entry.EntryLibraryData = nil
			}
		}
	}

	// Hydrate total library size
	if libraryCollection != nil && libraryCollection.Stats != nil {
		libraryCollection.Stats.TotalSize = util.Bytes(h.App.TotalLibrarySize)
	}

	return h.RespondWithData(c, libraryCollection)
}

// getJellyfinLibraryCollection is a temporary placeholder to build a LibraryCollection
// natively from the Jellyfin backend server, bypassing AniList completely.
func (h *Handler) getJellyfinLibraryCollection(c echo.Context) (*anime.LibraryCollection, error) {

	// 1. Setup the Jellyfin client
	sc := h.App.Settings.Jellyfin
	if sc == nil || !sc.Enabled || sc.ServerURL == "" || sc.ApiKey == "" {
		return nil, errors.New("jellyfin is not configured correctly")
	}

	client := h.App.GetJellyfinClient() // We need a way to get the active Jellyfin client.

	// If App doesn't store the client, we instantiate a new one here temporarily.
	// We should ideally add GetJellyfinClient to App.
	if client == nil {
		return nil, errors.New("jellyfin client not available")
	}

	ctx := c.Request().Context()
	user, err := client.GetCurrentUser(ctx)
	if err != nil {
		h.App.Logger.Error().Err(err).Msg("failed to fetch current user from jellyfin")
		return nil, errors.New("failed to fetch user from jellyfin")
	}

	jItems, err := client.GetUserItems(ctx, user.ID, "Series,Movie")
	if err != nil {
		h.App.Logger.Error().Err(err).Msg("failed to fetch user items from jellyfin")
		return nil, errors.New("failed to fetch library from jellyfin")
	}

	lists := []*anime.LibraryCollectionList{
		{Type: "anime", Status: string(anilist.MediaListStatusCurrent), Entries: make([]*anime.LibraryCollectionEntry, 0)},
		{Type: "anime", Status: string(anilist.MediaListStatusCompleted), Entries: make([]*anime.LibraryCollectionEntry, 0)},
		{Type: "anime", Status: string(anilist.MediaListStatusPlanning), Entries: make([]*anime.LibraryCollectionEntry, 0)},
	}

	for _, jItem := range jItems {
		if jItem.Type != "Series" && jItem.Type != "Movie" {
			continue
		}

		media := &models.LibraryMedia{
			TitleOriginal:  jItem.Name,
			Description:    jItem.Overview,
			Type:           "ANIME",
			Format:         "TV",
			Status:         "FINISHED",
			JellyfinItemId: jItem.Id,
		}

		if jItem.Type == "Movie" {
			media.Format = "MOVIE"
		}

		// Handle completion/progress mapping
		status := string(anilist.MediaListStatusPlanning)
		unwatchedCount := 0
		mainFileCount := 0

		if jItem.UserData.Played {
			status = string(anilist.MediaListStatusCompleted)
		} else if jItem.UserData.PlaybackPositionTicks > 0 {
			status = string(anilist.MediaListStatusCurrent)
		}

		// Generate a deterministic integer ID from the Jellyfin string UUID
		mediaId := util.HashStringToInt96(jItem.Id)
		if client != nil {
			client.RegisterItemId(mediaId, jItem.Id)
		}

		entry := &anime.LibraryCollectionEntry{
			Media:   media,
			MediaId: mediaId,
			EntryLibraryData: &anime.EntryLibraryData{
				UnwatchedCount: unwatchedCount,
				MainFileCount:  mainFileCount,
			},
			EntryListData: &anime.EntryListData{
				Status: status,
				Score:  0,
			},
		}

		for _, list := range lists {
			if list.Status == status {
				list.Entries = append(list.Entries, entry)
				break
			}
		}
	}

	return &anime.LibraryCollection{
		Stats: &anime.LibraryCollectionStats{
			TotalShows:   len(jItems),
			TotalEntries: len(jItems),
		},
		Lists:               lists,
		UnmatchedLocalFiles: make([]*dto.LocalFile, 0),
		UnmatchedGroups:     make([]*anime.UnmatchedGroup, 0),
		IgnoredLocalFiles:   make([]*dto.LocalFile, 0),
		UnknownGroups:       make([]*anime.UnknownGroup, 0),
	}, nil
}

//----------------------------------------------------------------------------------------------------------------------------------------------------

var animeScheduleCache = result.NewCache[int, []*anime.ScheduleItem]()

// HandleGetAnimeCollectionSchedule
//
//	@summary returns anime collection schedule
//	@desc This is used by the "Schedule" page to display the anime schedule.
//	@route /api/v1/library/schedule [GET]
//	@returns []anime.ScheduleItem
func (h *Handler) HandleGetAnimeCollectionSchedule(c echo.Context) error {

	// Invalidate the cache when the Anilist collection is refreshed
	h.App.AddOnRefreshAnilistCollectionFunc("HandleGetAnimeCollectionSchedule", func() {
		animeScheduleCache.Clear()
	})

	if ret, ok := animeScheduleCache.Get(1); ok {
		return h.RespondWithData(c, ret)
	}

	animeSchedule, err := h.App.Metadata.AnilistPlatformRef.Get().GetAnimeAiringSchedule(c.Request().Context())
	if err != nil {
		return h.RespondWithError(c, err)
	}

	animeCollection, err := h.App.GetAnimeCollection(false)
	if err != nil {
		return h.RespondWithError(c, err)
	}

	ret := anime.GetScheduleItems(animeSchedule, animeCollection)

	animeScheduleCache.SetT(1, ret, 1*time.Hour)

	return h.RespondWithData(c, ret)
}

// HandleAddUnknownMedia
//
//	@summary adds the given media to the user's AniList planning collections
//	@desc Since media not found in the user's AniList collection are not displayed in the library, this route is used to add them.
//	@desc The response is ignored in the frontend, the client should just refetch the entire library collection.
//	@route /api/v1/library/unknown-media [POST]
//	@returns anilist.AnimeCollection
func (h *Handler) HandleAddUnknownMedia(c echo.Context) error {

	type body struct {
		MediaIds []int `json:"mediaIds"`
	}

	b := new(body)
	if err := c.Bind(b); err != nil {
		return h.RespondWithError(c, err)
	}

	// Add non-added media entries to AniList collection
	if err := h.App.Metadata.AnilistPlatformRef.Get().AddMediaToCollection(c.Request().Context(), b.MediaIds); err != nil {
		return h.RespondWithError(c, errors.New("error: Anilist responded with an error, this is most likely a rate limit issue"))
	}

	// Bypass the cache
	animeCollection, err := h.App.GetAnimeCollection(true)
	if err != nil {
		return h.RespondWithError(c, errors.New("error: Anilist responded with an error, wait one minute before refreshing"))
	}

	return h.RespondWithData(c, animeCollection)

}
