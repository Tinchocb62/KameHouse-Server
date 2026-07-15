//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// anime
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useGetAnimeEpisodeCollection(id: number) {
//     return useServerQuery<Anime_EpisodeCollection>({
//         endpoint: API_ENDPOINTS.ANIME.GetAnimeEpisodeCollection.endpoint.replace("{id}", String(id)),
//         method: API_ENDPOINTS.ANIME.GetAnimeEpisodeCollection.methods[0],
//         queryKey: [API_ENDPOINTS.ANIME.GetAnimeEpisodeCollection.key],
//         enabled: true,
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// anime_collection
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useGetLibraryCollection() {
//     return useServerQuery<Anime_LibraryCollection>({
//         endpoint: API_ENDPOINTS.ANIME_COLLECTION.GetLibraryCollection.endpoint,
//         method: API_ENDPOINTS.ANIME_COLLECTION.GetLibraryCollection.methods[0],
//         queryKey: [API_ENDPOINTS.ANIME_COLLECTION.GetLibraryCollection.key],
//         enabled: true,
//     })
// }

// export function useGetLibraryCollection() {
//     return useServerMutation<Anime_LibraryCollection>({
//         endpoint: API_ENDPOINTS.ANIME_COLLECTION.GetLibraryCollection.endpoint,
//         method: API_ENDPOINTS.ANIME_COLLECTION.GetLibraryCollection.methods[1],
//         mutationKey: [API_ENDPOINTS.ANIME_COLLECTION.GetLibraryCollection.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useGetAnimeCollectionSchedule() {
//     return useServerQuery<Array<Anime_ScheduleItem>>({
//         endpoint: API_ENDPOINTS.ANIME_COLLECTION.GetAnimeCollectionSchedule.endpoint,
//         method: API_ENDPOINTS.ANIME_COLLECTION.GetAnimeCollectionSchedule.methods[0],
//         queryKey: [API_ENDPOINTS.ANIME_COLLECTION.GetAnimeCollectionSchedule.key],
//         enabled: true,
//     })
// }

// export function useAddUnknownMedia() {
//     return useServerMutation<AnimeCollection, AddUnknownMedia_Variables>({
//         endpoint: API_ENDPOINTS.ANIME_COLLECTION.AddUnknownMedia.endpoint,
//         method: API_ENDPOINTS.ANIME_COLLECTION.AddUnknownMedia.methods[0],
//         mutationKey: [API_ENDPOINTS.ANIME_COLLECTION.AddUnknownMedia.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// anime_entries
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useGetAnimeEntry(id: number) {
//     return useServerQuery<Anime_Entry>({
//         endpoint: API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntry.endpoint.replace("{id}", String(id)),
//         method: API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntry.methods[0],
//         queryKey: [API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntry.key],
//         enabled: true,
//     })
// }

// export function useGetAnimeEntryLocalFiles(id: number) {
//     return useServerQuery<Array<LocalFile>>({
//         endpoint: API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntryLocalFiles.endpoint.replace("{id}", String(id)),
//         method: API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntryLocalFiles.methods[0],
//         queryKey: [API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntryLocalFiles.key],
//         enabled: true,
//     })
// }

// export function useGetAnimeEntrySuggestions(dir: string, paths: unknown) {
//     return useServerMutation<Array<UnifiedMedia>, GetAnimeEntrySuggestions_Variables>({
//         endpoint: API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntrySuggestions.endpoint.replace("{dir}", String(dir)).replace("{paths}", String(paths)),
//         method: API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntrySuggestions.methods[0],
//         mutationKey: [API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntrySuggestions.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useUpdateAnimeEntryProgress(mediaID: number, progress: number) {
//     return useServerMutation<boolean, UpdateAnimeEntryProgress_Variables>({
//         endpoint: API_ENDPOINTS.ANIME_ENTRIES.UpdateAnimeEntryProgress.endpoint.replace("{mediaID}", String(mediaID)).replace("{progress}", String(progress)),
//         method: API_ENDPOINTS.ANIME_ENTRIES.UpdateAnimeEntryProgress.methods[0],
//         mutationKey: [API_ENDPOINTS.ANIME_ENTRIES.UpdateAnimeEntryProgress.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useUpdateAnimeEntryRepeat(mediaID: number, repeat: number) {
//     return useServerMutation<boolean, UpdateAnimeEntryRepeat_Variables>({
//         endpoint: API_ENDPOINTS.ANIME_ENTRIES.UpdateAnimeEntryRepeat.endpoint.replace("{mediaID}", String(mediaID)).replace("{repeat}", String(repeat)),
//         method: API_ENDPOINTS.ANIME_ENTRIES.UpdateAnimeEntryRepeat.methods[0],
//         mutationKey: [API_ENDPOINTS.ANIME_ENTRIES.UpdateAnimeEntryRepeat.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useAnimeEntryManualMatch() {
//     return useServerMutation<boolean, AnimeEntryManualMatch_Variables>({
//         endpoint: API_ENDPOINTS.ANIME_ENTRIES.AnimeEntryManualMatch.endpoint,
//         method: API_ENDPOINTS.ANIME_ENTRIES.AnimeEntryManualMatch.methods[0],
//         mutationKey: [API_ENDPOINTS.ANIME_ENTRIES.AnimeEntryManualMatch.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useAnimeEntryUnmatch() {
//     return useServerMutation<boolean, AnimeEntryUnmatch_Variables>({
//         endpoint: API_ENDPOINTS.ANIME_ENTRIES.AnimeEntryUnmatch.endpoint,
//         method: API_ENDPOINTS.ANIME_ENTRIES.AnimeEntryUnmatch.methods[0],
//         mutationKey: [API_ENDPOINTS.ANIME_ENTRIES.AnimeEntryUnmatch.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useGetMissingEpisodes() {
//     return useServerQuery<Anime_MissingEpisodes>({
//         endpoint: API_ENDPOINTS.ANIME_ENTRIES.GetMissingEpisodes.endpoint,
//         method: API_ENDPOINTS.ANIME_ENTRIES.GetMissingEpisodes.methods[0],
//         queryKey: [API_ENDPOINTS.ANIME_ENTRIES.GetMissingEpisodes.key],
//         enabled: true,
//     })
// }

// export function useGetUpcomingEpisodes() {
//     return useServerQuery<Anime_UpcomingEpisodes>({
//         endpoint: API_ENDPOINTS.ANIME_ENTRIES.GetUpcomingEpisodes.endpoint,
//         method: API_ENDPOINTS.ANIME_ENTRIES.GetUpcomingEpisodes.methods[0],
//         queryKey: [API_ENDPOINTS.ANIME_ENTRIES.GetUpcomingEpisodes.key],
//         enabled: true,
//     })
// }

// export function useGetAnimeEntrySilenceStatus(id: number) {
//     return useServerQuery<boolean>({
//         endpoint: API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntrySilenceStatus.endpoint.replace("{id}", String(id)),
//         method: API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntrySilenceStatus.methods[0],
//         queryKey: [API_ENDPOINTS.ANIME_ENTRIES.GetAnimeEntrySilenceStatus.key],
//         enabled: true,
//     })
// }

// export function useToggleAnimeEntrySilenceStatus() {
//     return useServerMutation<boolean, ToggleAnimeEntrySilenceStatus_Variables>({
//         endpoint: API_ENDPOINTS.ANIME_ENTRIES.ToggleAnimeEntrySilenceStatus.endpoint,
//         method: API_ENDPOINTS.ANIME_ENTRIES.ToggleAnimeEntrySilenceStatus.methods[0],
//         mutationKey: [API_ENDPOINTS.ANIME_ENTRIES.ToggleAnimeEntrySilenceStatus.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// auth
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useLogin() {
//     return useServerMutation<Status>({
//         endpoint: API_ENDPOINTS.AUTH.Login.endpoint,
//         method: API_ENDPOINTS.AUTH.Login.methods[0],
//         mutationKey: [API_ENDPOINTS.AUTH.Login.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useLogout() {
//     return useServerMutation<Status>({
//         endpoint: API_ENDPOINTS.AUTH.Logout.endpoint,
//         method: API_ENDPOINTS.AUTH.Logout.methods[0],
//         mutationKey: [API_ENDPOINTS.AUTH.Logout.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// continuity
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useUpdateContinuityWatchHistoryItem() {
//     return useServerMutation<boolean, UpdateContinuityWatchHistoryItem_Variables>({
//         endpoint: API_ENDPOINTS.CONTINUITY.UpdateContinuityWatchHistoryItem.endpoint,
//         method: API_ENDPOINTS.CONTINUITY.UpdateContinuityWatchHistoryItem.methods[0],
//         mutationKey: [API_ENDPOINTS.CONTINUITY.UpdateContinuityWatchHistoryItem.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useGetContinuityWatchHistoryItem(id: number) {
//     return useServerQuery<Continuity_WatchHistoryItemResponse>({
//         endpoint: API_ENDPOINTS.CONTINUITY.GetContinuityWatchHistoryItem.endpoint.replace("{id}", String(id)),
//         method: API_ENDPOINTS.CONTINUITY.GetContinuityWatchHistoryItem.methods[0],
//         queryKey: [API_ENDPOINTS.CONTINUITY.GetContinuityWatchHistoryItem.key],
//         enabled: true,
//     })
// }

// export function useGetContinuityWatchHistory() {
//     return useServerQuery<Continuity_WatchHistory>({
//         endpoint: API_ENDPOINTS.CONTINUITY.GetContinuityWatchHistory.endpoint,
//         method: API_ENDPOINTS.CONTINUITY.GetContinuityWatchHistory.methods[0],
//         queryKey: [API_ENDPOINTS.CONTINUITY.GetContinuityWatchHistory.key],
//         enabled: true,
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// directory_selector
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useDirectorySelector() {
//     return useServerMutation<DirectorySelectorResponse, DirectorySelector_Variables>({
//         endpoint: API_ENDPOINTS.DIRECTORY_SELECTOR.DirectorySelector.endpoint,
//         method: API_ENDPOINTS.DIRECTORY_SELECTOR.DirectorySelector.methods[0],
//         mutationKey: [API_ENDPOINTS.DIRECTORY_SELECTOR.DirectorySelector.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// explorer
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useOpenInExplorer() {
//     return useServerMutation<boolean, OpenInExplorer_Variables>({
//         endpoint: API_ENDPOINTS.EXPLORER.OpenInExplorer.endpoint,
//         method: API_ENDPOINTS.EXPLORER.OpenInExplorer.methods[0],
//         mutationKey: [API_ENDPOINTS.EXPLORER.OpenInExplorer.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// filecache
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useGetFileCacheTotalSize() {
//     return useServerQuery<string>({
//         endpoint: API_ENDPOINTS.FILECACHE.GetFileCacheTotalSize.endpoint,
//         method: API_ENDPOINTS.FILECACHE.GetFileCacheTotalSize.methods[0],
//         queryKey: [API_ENDPOINTS.FILECACHE.GetFileCacheTotalSize.key],
//         enabled: true,
//     })
// }

// export function useRemoveFileCacheBucket() {
//     return useServerMutation<boolean, RemoveFileCacheBucket_Variables>({
//         endpoint: API_ENDPOINTS.FILECACHE.RemoveFileCacheBucket.endpoint,
//         method: API_ENDPOINTS.FILECACHE.RemoveFileCacheBucket.methods[0],
//         mutationKey: [API_ENDPOINTS.FILECACHE.RemoveFileCacheBucket.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useGetFileCacheMediastreamVideoFilesTotalSize() {
//     return useServerQuery<string>({
//         endpoint: API_ENDPOINTS.FILECACHE.GetFileCacheMediastreamVideoFilesTotalSize.endpoint,
//         method: API_ENDPOINTS.FILECACHE.GetFileCacheMediastreamVideoFilesTotalSize.methods[0],
//         queryKey: [API_ENDPOINTS.FILECACHE.GetFileCacheMediastreamVideoFilesTotalSize.key],
//         enabled: true,
//     })
// }

// export function useClearFileCacheMediastreamVideoFiles() {
//     return useServerMutation<boolean>({
//         endpoint: API_ENDPOINTS.FILECACHE.ClearFileCacheMediastreamVideoFiles.endpoint,
//         method: API_ENDPOINTS.FILECACHE.ClearFileCacheMediastreamVideoFiles.methods[0],
//         mutationKey: [API_ENDPOINTS.FILECACHE.ClearFileCacheMediastreamVideoFiles.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// intelligence
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useGetBestSource() {
//     return useServerQuery<SelectionResult>({
//         endpoint: API_ENDPOINTS.INTELLIGENCE.GetBestSource.endpoint,
//         method: API_ENDPOINTS.INTELLIGENCE.GetBestSource.methods[0],
//         queryKey: [API_ENDPOINTS.INTELLIGENCE.GetBestSource.key],
//         enabled: true,
//     })
// }

// export function useGetIntelligenceStats() {
//     return useServerQuery<map>({
//         endpoint: API_ENDPOINTS.INTELLIGENCE.GetIntelligenceStats.endpoint,
//         method: API_ENDPOINTS.INTELLIGENCE.GetIntelligenceStats.methods[0],
//         queryKey: [API_ENDPOINTS.INTELLIGENCE.GetIntelligenceStats.key],
//         enabled: true,
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// library_explorer
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useGetLibraryExplorerFileTree() {
//     return useServerQuery<LibraryExplorer_FileTreeJSON>({
//         endpoint: API_ENDPOINTS.LIBRARY_EXPLORER.GetLibraryExplorerFileTree.endpoint,
//         method: API_ENDPOINTS.LIBRARY_EXPLORER.GetLibraryExplorerFileTree.methods[0],
//         queryKey: [API_ENDPOINTS.LIBRARY_EXPLORER.GetLibraryExplorerFileTree.key],
//         enabled: true,
//     })
// }

// export function useRefreshLibraryExplorerFileTree() {
//     return useServerMutation<boolean>({
//         endpoint: API_ENDPOINTS.LIBRARY_EXPLORER.RefreshLibraryExplorerFileTree.endpoint,
//         method: API_ENDPOINTS.LIBRARY_EXPLORER.RefreshLibraryExplorerFileTree.methods[0],
//         mutationKey: [API_ENDPOINTS.LIBRARY_EXPLORER.RefreshLibraryExplorerFileTree.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useLoadLibraryExplorerDirectoryChildren() {
//     return useServerMutation<boolean, LoadLibraryExplorerDirectoryChildren_Variables>({
//         endpoint: API_ENDPOINTS.LIBRARY_EXPLORER.LoadLibraryExplorerDirectoryChildren.endpoint,
//         method: API_ENDPOINTS.LIBRARY_EXPLORER.LoadLibraryExplorerDirectoryChildren.methods[0],
//         mutationKey: [API_ENDPOINTS.LIBRARY_EXPLORER.LoadLibraryExplorerDirectoryChildren.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// local
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useSetOfflineMode() {
//     return useServerMutation<boolean, SetOfflineMode_Variables>({
//         endpoint: API_ENDPOINTS.LOCAL.SetOfflineMode.endpoint,
//         method: API_ENDPOINTS.LOCAL.SetOfflineMode.methods[0],
//         mutationKey: [API_ENDPOINTS.LOCAL.SetOfflineMode.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useLocalGetTrackedMediaItems() {
//     return useServerQuery<Array<Local_TrackedMediaItem>>({
//         endpoint: API_ENDPOINTS.LOCAL.LocalGetTrackedMediaItems.endpoint,
//         method: API_ENDPOINTS.LOCAL.LocalGetTrackedMediaItems.methods[0],
//         queryKey: [API_ENDPOINTS.LOCAL.LocalGetTrackedMediaItems.key],
//         enabled: true,
//     })
// }

// export function useLocalAddTrackedMedia() {
//     return useServerMutation<boolean, LocalAddTrackedMedia_Variables>({
//         endpoint: API_ENDPOINTS.LOCAL.LocalAddTrackedMedia.endpoint,
//         method: API_ENDPOINTS.LOCAL.LocalAddTrackedMedia.methods[0],
//         mutationKey: [API_ENDPOINTS.LOCAL.LocalAddTrackedMedia.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useLocalRemoveTrackedMedia() {
//     return useServerMutation<boolean, LocalRemoveTrackedMedia_Variables>({
//         endpoint: API_ENDPOINTS.LOCAL.LocalRemoveTrackedMedia.endpoint,
//         method: API_ENDPOINTS.LOCAL.LocalRemoveTrackedMedia.methods[0],
//         mutationKey: [API_ENDPOINTS.LOCAL.LocalRemoveTrackedMedia.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useLocalGetIsMediaTracked(id: number, type: string) {
//     return useServerQuery<boolean>({
//         endpoint: API_ENDPOINTS.LOCAL.LocalGetIsMediaTracked.endpoint.replace("{id}", String(id)).replace("{type}", String(type)),
//         method: API_ENDPOINTS.LOCAL.LocalGetIsMediaTracked.methods[0],
//         queryKey: [API_ENDPOINTS.LOCAL.LocalGetIsMediaTracked.key],
//         enabled: true,
//     })
// }

// export function useLocalSyncData() {
//     return useServerMutation<boolean>({
//         endpoint: API_ENDPOINTS.LOCAL.LocalSyncData.endpoint,
//         method: API_ENDPOINTS.LOCAL.LocalSyncData.methods[0],
//         mutationKey: [API_ENDPOINTS.LOCAL.LocalSyncData.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useLocalGetSyncQueueState() {
//     return useServerQuery<Local_QueueState>({
//         endpoint: API_ENDPOINTS.LOCAL.LocalGetSyncQueueState.endpoint,
//         method: API_ENDPOINTS.LOCAL.LocalGetSyncQueueState.methods[0],
//         queryKey: [API_ENDPOINTS.LOCAL.LocalGetSyncQueueState.key],
//         enabled: true,
//     })
// }

// export function useLocalSyncPlatformData() {
//     return useServerMutation<boolean>({
//         endpoint: API_ENDPOINTS.LOCAL.LocalSyncPlatformData.endpoint,
//         method: API_ENDPOINTS.LOCAL.LocalSyncPlatformData.methods[0],
//         mutationKey: [API_ENDPOINTS.LOCAL.LocalSyncPlatformData.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useLocalSetHasLocalChanges() {
//     return useServerMutation<boolean, LocalSetHasLocalChanges_Variables>({
//         endpoint: API_ENDPOINTS.LOCAL.LocalSetHasLocalChanges.endpoint,
//         method: API_ENDPOINTS.LOCAL.LocalSetHasLocalChanges.methods[0],
//         mutationKey: [API_ENDPOINTS.LOCAL.LocalSetHasLocalChanges.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useLocalGetHasLocalChanges() {
//     return useServerQuery<boolean>({
//         endpoint: API_ENDPOINTS.LOCAL.LocalGetHasLocalChanges.endpoint,
//         method: API_ENDPOINTS.LOCAL.LocalGetHasLocalChanges.methods[0],
//         queryKey: [API_ENDPOINTS.LOCAL.LocalGetHasLocalChanges.key],
//         enabled: true,
//     })
// }

// export function useLocalGetLocalStorageSize() {
//     return useServerQuery<string>({
//         endpoint: API_ENDPOINTS.LOCAL.LocalGetLocalStorageSize.endpoint,
//         method: API_ENDPOINTS.LOCAL.LocalGetLocalStorageSize.methods[0],
//         queryKey: [API_ENDPOINTS.LOCAL.LocalGetLocalStorageSize.key],
//         enabled: true,
//     })
// }

// export function useLocalSyncSimulatedDataToPlatform() {
//     return useServerMutation<boolean>({
//         endpoint: API_ENDPOINTS.LOCAL.LocalSyncSimulatedDataToPlatform.endpoint,
//         method: API_ENDPOINTS.LOCAL.LocalSyncSimulatedDataToPlatform.methods[0],
//         mutationKey: [API_ENDPOINTS.LOCAL.LocalSyncSimulatedDataToPlatform.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// localfiles
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useGetLocalFiles() {
//     return useServerQuery<Array<LocalFile>>({
//         endpoint: API_ENDPOINTS.LOCALFILES.GetLocalFiles.endpoint,
//         method: API_ENDPOINTS.LOCALFILES.GetLocalFiles.methods[0],
//         queryKey: [API_ENDPOINTS.LOCALFILES.GetLocalFiles.key],
//         enabled: true,
//     })
// }

// export function useImportLocalFiles() {
//     return useServerMutation<boolean, ImportLocalFiles_Variables>({
//         endpoint: API_ENDPOINTS.LOCALFILES.ImportLocalFiles.endpoint,
//         method: API_ENDPOINTS.LOCALFILES.ImportLocalFiles.methods[0],
//         mutationKey: [API_ENDPOINTS.LOCALFILES.ImportLocalFiles.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useLocalFileBulkAction() {
//     return useServerMutation<Array<LocalFile>, LocalFileBulkAction_Variables>({
//         endpoint: API_ENDPOINTS.LOCALFILES.LocalFileBulkAction.endpoint,
//         method: API_ENDPOINTS.LOCALFILES.LocalFileBulkAction.methods[0],
//         mutationKey: [API_ENDPOINTS.LOCALFILES.LocalFileBulkAction.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useUpdateLocalFileData() {
//     return useServerMutation<Array<LocalFile>, UpdateLocalFileData_Variables>({
//         endpoint: API_ENDPOINTS.LOCALFILES.UpdateLocalFileData.endpoint,
//         method: API_ENDPOINTS.LOCALFILES.UpdateLocalFileData.methods[0],
//         mutationKey: [API_ENDPOINTS.LOCALFILES.UpdateLocalFileData.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useSuperUpdateLocalFiles() {
//     return useServerMutation<boolean, SuperUpdateLocalFiles_Variables>({
//         endpoint: API_ENDPOINTS.LOCALFILES.SuperUpdateLocalFiles.endpoint,
//         method: API_ENDPOINTS.LOCALFILES.SuperUpdateLocalFiles.methods[0],
//         mutationKey: [API_ENDPOINTS.LOCALFILES.SuperUpdateLocalFiles.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useUpdateLocalFiles() {
//     return useServerMutation<boolean, UpdateLocalFiles_Variables>({
//         endpoint: API_ENDPOINTS.LOCALFILES.UpdateLocalFiles.endpoint,
//         method: API_ENDPOINTS.LOCALFILES.UpdateLocalFiles.methods[0],
//         mutationKey: [API_ENDPOINTS.LOCALFILES.UpdateLocalFiles.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useDeleteLocalFiles() {
//     return useServerMutation<boolean, DeleteLocalFiles_Variables>({
//         endpoint: API_ENDPOINTS.LOCALFILES.DeleteLocalFiles.endpoint,
//         method: API_ENDPOINTS.LOCALFILES.DeleteLocalFiles.methods[0],
//         mutationKey: [API_ENDPOINTS.LOCALFILES.DeleteLocalFiles.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useRemoveEmptyDirectories() {
//     return useServerMutation<boolean>({
//         endpoint: API_ENDPOINTS.LOCALFILES.RemoveEmptyDirectories.endpoint,
//         method: API_ENDPOINTS.LOCALFILES.RemoveEmptyDirectories.methods[0],
//         mutationKey: [API_ENDPOINTS.LOCALFILES.RemoveEmptyDirectories.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// mediastream
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useGetMediastreamSettings() {
//     return useServerQuery<Models_MediastreamSettings>({
//         endpoint: API_ENDPOINTS.MEDIASTREAM.GetMediastreamSettings.endpoint,
//         method: API_ENDPOINTS.MEDIASTREAM.GetMediastreamSettings.methods[0],
//         queryKey: [API_ENDPOINTS.MEDIASTREAM.GetMediastreamSettings.key],
//         enabled: true,
//     })
// }

// export function useSaveMediastreamSettings() {
//     return useServerMutation<Models_MediastreamSettings, SaveMediastreamSettings_Variables>({
//         endpoint: API_ENDPOINTS.MEDIASTREAM.SaveMediastreamSettings.endpoint,
//         method: API_ENDPOINTS.MEDIASTREAM.SaveMediastreamSettings.methods[0],
//         mutationKey: [API_ENDPOINTS.MEDIASTREAM.SaveMediastreamSettings.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useRequestMediastreamMediaContainer() {
//     return useServerMutation<Mediastream_MediaContainer, RequestMediastreamMediaContainer_Variables>({
//         endpoint: API_ENDPOINTS.MEDIASTREAM.RequestMediastreamMediaContainer.endpoint,
//         method: API_ENDPOINTS.MEDIASTREAM.RequestMediastreamMediaContainer.methods[0],
//         mutationKey: [API_ENDPOINTS.MEDIASTREAM.RequestMediastreamMediaContainer.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function usePreloadMediastreamMediaContainer() {
//     return useServerMutation<boolean, PreloadMediastreamMediaContainer_Variables>({
//         endpoint: API_ENDPOINTS.MEDIASTREAM.PreloadMediastreamMediaContainer.endpoint,
//         method: API_ENDPOINTS.MEDIASTREAM.PreloadMediastreamMediaContainer.methods[0],
//         mutationKey: [API_ENDPOINTS.MEDIASTREAM.PreloadMediastreamMediaContainer.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useMediastreamShutdownTranscodeStream() {
//     return useServerMutation<boolean>({
//         endpoint: API_ENDPOINTS.MEDIASTREAM.MediastreamShutdownTranscodeStream.endpoint,
//         method: API_ENDPOINTS.MEDIASTREAM.MediastreamShutdownTranscodeStream.methods[0],
//         mutationKey: [API_ENDPOINTS.MEDIASTREAM.MediastreamShutdownTranscodeStream.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useGetEpisodeSkipTimes() {
//     return useServerQuery<Models_EpisodeSkipTime>({
//         endpoint: API_ENDPOINTS.MEDIASTREAM.GetEpisodeSkipTimes.endpoint,
//         method: API_ENDPOINTS.MEDIASTREAM.GetEpisodeSkipTimes.methods[0],
//         queryKey: [API_ENDPOINTS.MEDIASTREAM.GetEpisodeSkipTimes.key],
//         enabled: true,
//     })
// }

// export function useSaveEpisodeSkipTimes() {
//     return useServerMutation<boolean, SaveEpisodeSkipTimes_Variables>({
//         endpoint: API_ENDPOINTS.MEDIASTREAM.SaveEpisodeSkipTimes.endpoint,
//         method: API_ENDPOINTS.MEDIASTREAM.SaveEpisodeSkipTimes.methods[0],
//         mutationKey: [API_ENDPOINTS.MEDIASTREAM.SaveEpisodeSkipTimes.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useResolveMAL() {
//     return useServerQuery<boolean>({
//         endpoint: API_ENDPOINTS.MEDIASTREAM.ResolveMAL.endpoint,
//         method: API_ENDPOINTS.MEDIASTREAM.ResolveMAL.methods[0],
//         queryKey: [API_ENDPOINTS.MEDIASTREAM.ResolveMAL.key],
//         enabled: true,
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// metadata
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function usePopulateFillerData() {
//     return useServerMutation<true, PopulateFillerData_Variables>({
//         endpoint: API_ENDPOINTS.METADATA.PopulateFillerData.endpoint,
//         method: API_ENDPOINTS.METADATA.PopulateFillerData.methods[0],
//         mutationKey: [API_ENDPOINTS.METADATA.PopulateFillerData.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useRemoveFillerData() {
//     return useServerMutation<boolean, RemoveFillerData_Variables>({
//         endpoint: API_ENDPOINTS.METADATA.RemoveFillerData.endpoint,
//         method: API_ENDPOINTS.METADATA.RemoveFillerData.methods[0],
//         mutationKey: [API_ENDPOINTS.METADATA.RemoveFillerData.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useGetMediaMetadataParent(id: number) {
//     return useServerQuery<Models_MediaMetadataParent>({
//         endpoint: API_ENDPOINTS.METADATA.GetMediaMetadataParent.endpoint.replace("{id}", String(id)),
//         method: API_ENDPOINTS.METADATA.GetMediaMetadataParent.methods[0],
//         queryKey: [API_ENDPOINTS.METADATA.GetMediaMetadataParent.key],
//         enabled: true,
//     })
// }

// export function useSaveMediaMetadataParent() {
//     return useServerMutation<Models_MediaMetadataParent, SaveMediaMetadataParent_Variables>({
//         endpoint: API_ENDPOINTS.METADATA.SaveMediaMetadataParent.endpoint,
//         method: API_ENDPOINTS.METADATA.SaveMediaMetadataParent.methods[0],
//         mutationKey: [API_ENDPOINTS.METADATA.SaveMediaMetadataParent.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useDeleteMediaMetadataParent() {
//     return useServerMutation<boolean, DeleteMediaMetadataParent_Variables>({
//         endpoint: API_ENDPOINTS.METADATA.DeleteMediaMetadataParent.endpoint,
//         method: API_ENDPOINTS.METADATA.DeleteMediaMetadataParent.methods[0],
//         mutationKey: [API_ENDPOINTS.METADATA.DeleteMediaMetadataParent.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// notifications
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useGetNotifications() {
//     return useServerQuery<NotificationList>({
//         endpoint: API_ENDPOINTS.NOTIFICATIONS.GetNotifications.endpoint,
//         method: API_ENDPOINTS.NOTIFICATIONS.GetNotifications.methods[0],
//         queryKey: [API_ENDPOINTS.NOTIFICATIONS.GetNotifications.key],
//         enabled: true,
//     })
// }

// export function useMarkNotificationsRead() {
//     return useServerMutation<boolean, MarkNotificationsRead_Variables>({
//         endpoint: API_ENDPOINTS.NOTIFICATIONS.MarkNotificationsRead.endpoint,
//         method: API_ENDPOINTS.NOTIFICATIONS.MarkNotificationsRead.methods[0],
//         mutationKey: [API_ENDPOINTS.NOTIFICATIONS.MarkNotificationsRead.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useClearNotifications() {
//     return useServerMutation<boolean>({
//         endpoint: API_ENDPOINTS.NOTIFICATIONS.ClearNotifications.endpoint,
//         method: API_ENDPOINTS.NOTIFICATIONS.ClearNotifications.methods[0],
//         mutationKey: [API_ENDPOINTS.NOTIFICATIONS.ClearNotifications.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// playback_sync
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function usePlaybackSync() {
//     return useServerMutation<boolean>({
//         endpoint: API_ENDPOINTS.PLAYBACK_SYNC.PlaybackSync.endpoint,
//         method: API_ENDPOINTS.PLAYBACK_SYNC.PlaybackSync.methods[0],
//         mutationKey: [API_ENDPOINTS.PLAYBACK_SYNC.PlaybackSync.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// resolver
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useResolveStreams() {
//     return useServerQuery<Array<INTERNAL_ResolvedSource>>({
//         endpoint: API_ENDPOINTS.RESOLVER.ResolveStreams.endpoint,
//         method: API_ENDPOINTS.RESOLVER.ResolveStreams.methods[0],
//         queryKey: [API_ENDPOINTS.RESOLVER.ResolveStreams.key],
//         enabled: true,
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// scan
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useScanLocalFiles() {
//     return useServerMutation<Array<LocalFile>, ScanLocalFiles_Variables>({
//         endpoint: API_ENDPOINTS.SCAN.ScanLocalFiles.endpoint,
//         method: API_ENDPOINTS.SCAN.ScanLocalFiles.methods[0],
//         mutationKey: [API_ENDPOINTS.SCAN.ScanLocalFiles.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useGetScanStatus() {
//     return useServerQuery<ScanSummaryItem>({
//         endpoint: API_ENDPOINTS.SCAN.GetScanStatus.endpoint,
//         method: API_ENDPOINTS.SCAN.GetScanStatus.methods[0],
//         queryKey: [API_ENDPOINTS.SCAN.GetScanStatus.key],
//         enabled: true,
//     })
// }

// export function useGetUnlinkedFiles() {
//     return useServerQuery<Array<Models_GhostAssociatedMedia>>({
//         endpoint: API_ENDPOINTS.SCAN.GetUnlinkedFiles.endpoint,
//         method: API_ENDPOINTS.SCAN.GetUnlinkedFiles.methods[0],
//         queryKey: [API_ENDPOINTS.SCAN.GetUnlinkedFiles.key],
//         enabled: true,
//     })
// }

// export function useResolveUnlinkedFile() {
//     return useServerMutation<boolean, ResolveUnlinkedFile_Variables>({
//         endpoint: API_ENDPOINTS.SCAN.ResolveUnlinkedFile.endpoint,
//         method: API_ENDPOINTS.SCAN.ResolveUnlinkedFile.methods[0],
//         mutationKey: [API_ENDPOINTS.SCAN.ResolveUnlinkedFile.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// scan_summary
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useGetScanSummaries() {
//     return useServerQuery<Array<ScanSummaryItem>>({
//         endpoint: API_ENDPOINTS.SCAN_SUMMARY.GetScanSummaries.endpoint,
//         method: API_ENDPOINTS.SCAN_SUMMARY.GetScanSummaries.methods[0],
//         queryKey: [API_ENDPOINTS.SCAN_SUMMARY.GetScanSummaries.key],
//         enabled: true,
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// series_details
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useGetSeriesSagas(id: number) {
//     return useServerQuery<Array<SagaDTO>>({
//         endpoint: API_ENDPOINTS.SERIES_DETAILS.GetSeriesSagas.endpoint.replace("{id}", String(id)),
//         method: API_ENDPOINTS.SERIES_DETAILS.GetSeriesSagas.methods[0],
//         queryKey: [API_ENDPOINTS.SERIES_DETAILS.GetSeriesSagas.key],
//         enabled: true,
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// settings
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useGetSettings() {
//     return useServerQuery<Models_Settings>({
//         endpoint: API_ENDPOINTS.SETTINGS.GetSettings.endpoint,
//         method: API_ENDPOINTS.SETTINGS.GetSettings.methods[0],
//         queryKey: [API_ENDPOINTS.SETTINGS.GetSettings.key],
//         enabled: true,
//     })
// }

// export function useGettingStarted() {
//     return useServerMutation<Status, GettingStarted_Variables>({
//         endpoint: API_ENDPOINTS.SETTINGS.GettingStarted.endpoint,
//         method: API_ENDPOINTS.SETTINGS.GettingStarted.methods[0],
//         mutationKey: [API_ENDPOINTS.SETTINGS.GettingStarted.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useSaveSettings() {
//     return useServerMutation<Status, SaveSettings_Variables>({
//         endpoint: API_ENDPOINTS.SETTINGS.SaveSettings.endpoint,
//         method: API_ENDPOINTS.SETTINGS.SaveSettings.methods[0],
//         mutationKey: [API_ENDPOINTS.SETTINGS.SaveSettings.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useSaveMediaPlayerSettings() {
//     return useServerMutation<boolean, SaveMediaPlayerSettings_Variables>({
//         endpoint: API_ENDPOINTS.SETTINGS.SaveMediaPlayerSettings.endpoint,
//         method: API_ENDPOINTS.SETTINGS.SaveMediaPlayerSettings.methods[0],
//         mutationKey: [API_ENDPOINTS.SETTINGS.SaveMediaPlayerSettings.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// status
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useGetStatus() {
//     return useServerQuery<Status>({
//         endpoint: API_ENDPOINTS.STATUS.GetStatus.endpoint,
//         method: API_ENDPOINTS.STATUS.GetStatus.methods[0],
//         queryKey: [API_ENDPOINTS.STATUS.GetStatus.key],
//         enabled: true,
//     })
// }

// export function useGetMemoryStats() {
//     return useServerQuery<MemoryStatsResponse>({
//         endpoint: API_ENDPOINTS.STATUS.GetMemoryStats.endpoint,
//         method: API_ENDPOINTS.STATUS.GetMemoryStats.methods[0],
//         queryKey: [API_ENDPOINTS.STATUS.GetMemoryStats.key],
//         enabled: true,
//     })
// }

// export function useGetMemoryProfile() {
//     return useServerQuery<null>({
//         endpoint: API_ENDPOINTS.STATUS.GetMemoryProfile.endpoint,
//         method: API_ENDPOINTS.STATUS.GetMemoryProfile.methods[0],
//         queryKey: [API_ENDPOINTS.STATUS.GetMemoryProfile.key],
//         enabled: true,
//     })
// }

// export function useGetGoRoutineProfile() {
//     return useServerQuery<null>({
//         endpoint: API_ENDPOINTS.STATUS.GetGoRoutineProfile.endpoint,
//         method: API_ENDPOINTS.STATUS.GetGoRoutineProfile.methods[0],
//         queryKey: [API_ENDPOINTS.STATUS.GetGoRoutineProfile.key],
//         enabled: true,
//     })
// }

// export function useGetCPUProfile() {
//     return useServerQuery<null>({
//         endpoint: API_ENDPOINTS.STATUS.GetCPUProfile.endpoint,
//         method: API_ENDPOINTS.STATUS.GetCPUProfile.methods[0],
//         queryKey: [API_ENDPOINTS.STATUS.GetCPUProfile.key],
//         enabled: true,
//     })
// }

// export function useForceGC() {
//     return useServerMutation<MemoryStatsResponse>({
//         endpoint: API_ENDPOINTS.STATUS.ForceGC.endpoint,
//         method: API_ENDPOINTS.STATUS.ForceGC.methods[0],
//         mutationKey: [API_ENDPOINTS.STATUS.ForceGC.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useGetHomeItems() {
//     return useServerQuery<Array<Models_HomeItem>>({
//         endpoint: API_ENDPOINTS.STATUS.GetHomeItems.endpoint,
//         method: API_ENDPOINTS.STATUS.GetHomeItems.methods[0],
//         queryKey: [API_ENDPOINTS.STATUS.GetHomeItems.key],
//         enabled: true,
//     })
// }

// export function useUpdateHomeItems() {
//     return useServerMutation<null, UpdateHomeItems_Variables>({
//         endpoint: API_ENDPOINTS.STATUS.UpdateHomeItems.endpoint,
//         method: API_ENDPOINTS.STATUS.UpdateHomeItems.methods[0],
//         mutationKey: [API_ENDPOINTS.STATUS.UpdateHomeItems.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// system
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useBackupDatabase() {
//     return useServerMutation<DB_BackupResult>({
//         endpoint: API_ENDPOINTS.SYSTEM.BackupDatabase.endpoint,
//         method: API_ENDPOINTS.SYSTEM.BackupDatabase.methods[0],
//         mutationKey: [API_ENDPOINTS.SYSTEM.BackupDatabase.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useGetDiagnosticsReport() {
//     return useServerQuery<boolean>({
//         endpoint: API_ENDPOINTS.SYSTEM.GetDiagnosticsReport.endpoint,
//         method: API_ENDPOINTS.SYSTEM.GetDiagnosticsReport.methods[0],
//         queryKey: [API_ENDPOINTS.SYSTEM.GetDiagnosticsReport.key],
//         enabled: true,
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// theme
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useGetTheme() {
//     return useServerQuery<Models_Theme>({
//         endpoint: API_ENDPOINTS.THEME.GetTheme.endpoint,
//         method: API_ENDPOINTS.THEME.GetTheme.methods[0],
//         queryKey: [API_ENDPOINTS.THEME.GetTheme.key],
//         enabled: true,
//     })
// }

// export function useUpdateTheme() {
//     return useServerMutation<Models_Theme, UpdateTheme_Variables>({
//         endpoint: API_ENDPOINTS.THEME.UpdateTheme.endpoint,
//         method: API_ENDPOINTS.THEME.UpdateTheme.methods[0],
//         mutationKey: [API_ENDPOINTS.THEME.UpdateTheme.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// thumbnail
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useGetVideoThumbnail() {
//     return useServerQuery<boolean>({
//         endpoint: API_ENDPOINTS.THUMBNAIL.GetVideoThumbnail.endpoint,
//         method: API_ENDPOINTS.THUMBNAIL.GetVideoThumbnail.methods[0],
//         queryKey: [API_ENDPOINTS.THUMBNAIL.GetVideoThumbnail.key],
//         enabled: true,
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// tmdb
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useTMDBSearch() {
//     return useServerMutation<Array<SearchResult>, TMDBSearch_Variables>({
//         endpoint: API_ENDPOINTS.TMDB.TMDBSearch.endpoint,
//         method: API_ENDPOINTS.TMDB.TMDBSearch.methods[0],
//         mutationKey: [API_ENDPOINTS.TMDB.TMDBSearch.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useTMDBGetDetails() {
//     return useServerMutation<Record<string, interface{}>, TMDBGetDetails_Variables>({
//         endpoint: API_ENDPOINTS.TMDB.TMDBGetDetails.endpoint,
//         method: API_ENDPOINTS.TMDB.TMDBGetDetails.methods[0],
//         mutationKey: [API_ENDPOINTS.TMDB.TMDBGetDetails.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

// export function useTMDBAssign() {
//     return useServerMutation<boolean, TMDBAssign_Variables>({
//         endpoint: API_ENDPOINTS.TMDB.TMDBAssign.endpoint,
//         method: API_ENDPOINTS.TMDB.TMDBAssign.methods[0],
//         mutationKey: [API_ENDPOINTS.TMDB.TMDBAssign.key],
//         onSuccess: async () => {
// 
//         },
//     })
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// videocore
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// export function useGetVideoInsights(episodeId: string, duration: number) {
//     return useServerQuery<Array<VideoCore_InsightNode>>({
//         endpoint: API_ENDPOINTS.VIDEOCORE.GetVideoInsights.endpoint.replace("{episodeId}", String(episodeId)).replace("{duration}", String(duration)),
//         method: API_ENDPOINTS.VIDEOCORE.GetVideoInsights.methods[0],
//         queryKey: [API_ENDPOINTS.VIDEOCORE.GetVideoInsights.key],
//         enabled: true,
//     })
// }

