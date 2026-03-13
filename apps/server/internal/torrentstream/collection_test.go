package torrentstream

import (
	"context"
	"kamehouse/internal/api/anilist"
	"kamehouse/internal/api/metadata_provider"
	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/events"
	"kamehouse/internal/extension"
	"kamehouse/internal/library/anime"
	"kamehouse/internal/platforms/anilist_platform"
	"kamehouse/internal/test_utils"
	"kamehouse/internal/torrents/torrent"
	"kamehouse/internal/util"
	"testing"

	"github.com/davecgh/go-spew/spew"
	"github.com/samber/lo"
	"github.com/stretchr/testify/require"
)

func TestStreamCollection(t *testing.T) {
	t.Skip("Incomplete")
	test_utils.SetTwoLevelDeep()
	test_utils.InitTestProvider(t, test_utils.Anilist())

	database, err := db.NewDatabase(context.Background(), test_utils.ConfigData.Path.DataDir, test_utils.ConfigData.Database.Name, util.NewLogger())
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}
	logger := util.NewLogger()
	metadataProvider := metadata_provider.GetFakeProvider(t, database)
	anilistClient := anilist.TestGetMockAnilistClient()
	anilistPlatform := anilist_platform.NewAnilistPlatform(util.NewRef(anilistClient), util.NewRef(extension.NewUnifiedBank()), logger, database)
	anilistPlatform.SetUsername(test_utils.ConfigData.Provider.AnilistUsername)
	animeCollection, err := anilistPlatform.GetAnimeCollection(context.Background(), false)
	require.NoError(t, err)
	require.NotNil(t, animeCollection)

	repo := NewRepository(&NewRepositoryOptions{
		Logger:              logger,
		BaseAnimeCache:      anilist.NewBaseAnimeCache(),
		CompleteAnimeCache:  anilist.NewCompleteAnimeCache(),
		PlatformRef:         util.NewRef(anilistPlatform),
		MetadataProviderRef: util.NewRef(metadataProvider),
		WSEventManager:      events.NewMockWSEventManager(logger),
		TorrentRepository:   &torrent.Repository{},
		Database:            database,
	})

	// Mock Anilist collection and local files
	// User is currently watching Sousou no Frieren and One Piece
	lfs := make([]*dto.LocalFile, 0)

	// Sousou no Frieren
	// 7 episodes downloaded, 4 watched
	mediaId := 154587
	lfs = append(lfs, anime.MockHydratedLocalFiles(
		anime.MockGenerateHydratedLocalFileGroupOptions("E:/Anime", "E:\\Anime\\Sousou no Frieren\\[SubsPlease] Sousou no Frieren - %ep (1080p) [F02B9CEE].mkv", mediaId, []anime.MockHydratedLocalFileWrapperOptionsMetadata{
			{MetadataEpisode: 1, MetadataAniDbEpisode: "1", MetadataType: dto.LocalFileTypeMain},
			{MetadataEpisode: 2, MetadataAniDbEpisode: "2", MetadataType: dto.LocalFileTypeMain},
			{MetadataEpisode: 3, MetadataAniDbEpisode: "3", MetadataType: dto.LocalFileTypeMain},
			{MetadataEpisode: 4, MetadataAniDbEpisode: "4", MetadataType: dto.LocalFileTypeMain},
			{MetadataEpisode: 5, MetadataAniDbEpisode: "5", MetadataType: dto.LocalFileTypeMain},
			{MetadataEpisode: 6, MetadataAniDbEpisode: "6", MetadataType: dto.LocalFileTypeMain},
			{MetadataEpisode: 7, MetadataAniDbEpisode: "7", MetadataType: dto.LocalFileTypeMain},
		}),
	)...)
	anilist.TestModifyAnimeCollectionEntry(animeCollection, mediaId, anilist.TestModifyAnimeCollectionEntryInput{
		Status:   lo.ToPtr(anilist.MediaListStatusCurrent),
		Progress: lo.ToPtr(4), // Mock progress
	})

	libraryCollection, err := anime.NewLibraryCollection(context.Background(), &anime.NewLibraryCollectionOptions{
		Database:            database,
		LocalFiles:          lfs,
		PlatformRef:         util.NewRef(anilistPlatform),
		MetadataProviderRef: util.NewRef(metadataProvider),
	})
	require.NoError(t, err)

	// Create the stream collection
	repo.HydrateStreamCollection(&HydrateStreamCollectionOptions{
		Database:            database,
		MetadataProviderRef: util.NewRef(metadataProvider),
		LibraryCollection:   libraryCollection,
	})
	spew.Dump(libraryCollection)

}
