import type { NormalizedMedia } from "./unified.types"
import type {
  CharacterDTO,
  CharacterRole,
  EpisodeType,
  SagaDTO as BaseSagaDTO,
  SubSagaDTO as BaseSubSagaDTO,
} from "@/api/generated/types"

export type { CharacterDTO, CharacterRole, EpisodeType }

export interface SubSagaDTO extends BaseSubSagaDTO {
  image?: string
  description?: string
}

export interface SagaDTO extends Omit<BaseSagaDTO, "subSagas"> {
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
  duration?: number
  sagaId?: string
  sagaName?: string
}
