package videocore

import (
	"kamehouse/internal/continuity"
	"kamehouse/internal/events"
	"kamehouse/internal/mkvparser"

	"github.com/samber/lo"
)

func (vc *VideoCore) setupEffects() {
	vc.setupSharedEffects()
	vc.setupOnlinestreamEffects()
}

func (vc *VideoCore) setupSharedEffects() {
	subscriber := vc.Subscribe("videocore:shared")

	go func(subscriber *Subscriber) {
		for e := range subscriber.Events() {
			switch event := e.(type) {
			case *VideoPausedEvent:
			case *VideoResumedEvent:
			case *VideoEndedEvent:
			case *VideoLoadedMetadataEvent:
				_, ok := vc.GetPlaybackState()
				if !ok {
					continue
				}
			case *VideoErrorEvent:
			case *VideoCompletedEvent:
			case *VideoTerminatedEvent:
			case *VideoStatusEvent:
				state, ok := vc.GetPlaybackState()
				if !ok {
					continue
				}
				if event.Duration != 0 {
					_ = vc.continuityManager.UpdateWatchHistoryItem(&continuity.UpdateWatchHistoryItemOptions{
						CurrentTime: event.CurrentTime,
						Duration:    event.Duration,
						MediaID: func() int {
							if m, ok := state.PlaybackInfo.Media.(map[string]interface{}); ok {
								if id, ok := m["id"].(float64); ok {
									return int(id)
								}
							} else if m, ok := state.PlaybackInfo.Media.(interface{ GetID() int }); ok {
								return m.GetID()
							}
							// Fallback/Placeholder
							return 0
						}(),
						EpisodeNumber: state.PlaybackInfo.Episode.GetEpisodeNumber(),
						Kind:          continuity.MediastreamKind,
					})
				}

			}
		}
	}(subscriber)
}

func (vc *VideoCore) setupOnlinestreamEffects() {
	subscriber := vc.Subscribe("videocore:onlinestream")

	go func(subscriber *Subscriber) {
		for e := range subscriber.Events() {
			if !e.IsOnlinestream() && !e.IsWebPlayer() {
				continue
			}
			switch event := e.(type) {
			case *SubtitleFileUploadedEvent:
				vc.logger.Trace().Msgf("videocore: Subtitle file uploaded: %s", event.Filename)
				mkvTrack, err := vc.GenerateMkvSubtitleTrack(GenerateSubtitleFileOptions{
					Filename:  event.Filename,
					Content:   event.Content,
					Number:    0,
					ConvertTo: mkvparser.SubtitleTypeASS,
				})
				if err != nil {
					vc.wsEventManager.SendEventTo(vc.GetCurrentClientId(), events.ErrorToast, "Failed to upload subtitle file: "+err.Error())
					continue
				}
				track := &VideoSubtitleTrack{
					Index:             0,
					Src:               nil,
					Content:           &mkvTrack.CodecPrivate,
					Label:             mkvTrack.Name,
					Language:          mkvTrack.Language,
					Type:              lo.ToPtr("ass"),
					Default:           lo.ToPtr(false),
					UseLibassRenderer: nil,
				}
				vc.AddExternalSubtitleTrack(track)
				vc.logger.Debug().Msgf("videocore: Sent converted subtitle tracks")
			}
		}
	}(subscriber)
}

