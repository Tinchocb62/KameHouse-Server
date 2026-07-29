import type { NormalizedMedia } from "./unified.types"

export type CharacterRole = "Protagonist" | "Antagonist" | "Supporting" | "Background"

export type EpisodeType = "Canon" | "Filler" | "Hyped"

export interface CharacterDTO {
  name: string
  roleTag: CharacterRole
  avatarUrl: string
}

export interface SubSagaDTO {
  id: string
  name: string
  episodeRange: string
  startEp: number
  endEp: number
  image?: string
  description?: string
}

export interface SagaDTO {
  id: string
  name: string
  episodeRange: string
  startEp: number
  endEp: number
  description: string
  isFiller: boolean
  canonStatus: string
  antagonists: string[]
  keyEvents: string[]
  newCharacters: string[]
  keyCharacters: CharacterDTO[]
  subSagas?: SubSagaDTO[]
}

export interface AdvancedMediaMetadata {
  audioTracks: string[]
  subtitles: string[]
  resolutionTag: string
  videoCodec: string
}

export interface SeriesDetailsDTO {
  media: NormalizedMedia
  advancedDetails: AdvancedMediaMetadata
  sagas: SagaDTO[]
}

export interface SagaDetailSearchParams {
  tab?: "episodes" | "movie" | "relations" | "characters" | "details"
  saga?: string
  subSaga?: string
  /**
   * Número de episodio a reproducir automáticamente al montar la página.
   * Lo setea la continuación entre series de la línea temporal (al terminar
   * una serie se navega a la siguiente con `autoplay=1`).
   */
  autoplay?: string
}

export interface PremiumEpisode {
  id: string
  title: string
  number: number
  description: string
  thumbnailUrl: string
  episodeType: EpisodeType
  isWatched: boolean
  resolution?: string
  videoCodec?: string
  audioCodec?: string
  localFilePath?: string
  sagaId?: string
  sagaName?: string
}
