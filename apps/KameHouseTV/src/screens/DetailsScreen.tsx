import React, { useEffect, useState } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { useStore } from '../store';

const EpisodeItem = ({ episode, onSelect }: any) => {
  const { ref, focused } = useFocusable({
    onEnterPress: () => onSelect(episode.id),
  });

  return (
    <div
      ref={ref as any}
      className={`episode-item ${focused ? 'focused' : ''}`}
      onClick={() => onSelect(episode.id)}
    >
      <div>
        <h3>{episode.title || `Episodio ${episode.episodeNumber}`}</h3>
        <span>Ep {episode.episodeNumber}</span>
      </div>
    </div>
  );
};

export default function DetailsScreen() {
  const [anime, setAnime] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const serverUrl = useStore(state => state.serverUrl);
  const selectedAnimeId = useStore(state => state.selectedAnimeId);
  const setSelectedEpisode = useStore(state => state.setSelectedEpisode);
  const setScreen = useStore(state => state.setScreen);

  useEffect(() => {
    if (!selectedAnimeId) return;
    fetch(`${serverUrl}/api/v1/library/anime-entry/${selectedAnimeId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.media) {
          setAnime(data.media);
          setEpisodes(data.episodes || []);
        }
      })
      .catch(err => console.error(err));
  }, [serverUrl, selectedAnimeId]);

  const handleSelectEpisode = (epId: string) => {
    setSelectedEpisode(epId);
    setScreen('player');
  };

  if (!anime) return <div className="screen-full"><div className="spinner-container"><div className="spinner"></div><div className="status-text">Cargando...</div></div></div>;

  const title = anime.titleSpanish || anime.titleEnglish || anime.titleRomaji || 'Anime';
  let imgUrl = anime.posterImage || '';
  if (imgUrl && !imgUrl.startsWith('http')) imgUrl = serverUrl + imgUrl;
  
  let bgUrl = anime.bannerImage || anime.posterImage || '';
  if (bgUrl && !bgUrl.startsWith('http')) bgUrl = serverUrl + bgUrl;

  return (
    <div className="screen-full">
      <div className="backdrop" style={{ backgroundImage: `url(${bgUrl})` }}></div>
      <div className="details-content">
        <img className="details-poster" src={imgUrl} alt={title} />
        <div className="details-info">
          <h1>{title}</h1>
          <p className="overview">{anime.overview || 'Sin descripción.'}</p>
          <FocusContext.Provider value="details-list">
            <div className="episodes-list">
              {episodes.map((ep: any) => (
                <EpisodeItem key={ep.id} episode={ep} onSelect={handleSelectEpisode} />
              ))}
            </div>
          </FocusContext.Provider>
        </div>
      </div>
    </div>
  );
}
