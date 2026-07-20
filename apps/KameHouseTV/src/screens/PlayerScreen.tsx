import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../store';

export default function PlayerScreen() {
  const serverUrl = useStore(state => state.serverUrl);
  const selectedAnimeId = useStore(state => state.selectedAnimeId);
  const selectedEpisodeId = useStore(state => state.selectedEpisodeId);
  const setScreen = useStore(state => state.setScreen);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [progress, setProgress] = useState(0);
  const [showOSD, setShowOSD] = useState(true);
  const osdTimerRef = useRef<any>(null);

  useEffect(() => {
    // Resolve stream
    const fetchStream = async () => {
      try {
        const res = await fetch(`${serverUrl}/api/v1/resolver/streams?episodeId=${selectedEpisodeId}`);
        const data = await res.json();
        if (data && data.length > 0) {
          let url = data[0].url;
          if (!url.startsWith('http')) url = serverUrl + url;
          setStreamUrl(url);
        } else {
          // fallback to local-files fetch (simplified for this example)
          const localRes = await fetch(`${serverUrl}/api/v1/library/anime-entry/${selectedAnimeId}/local-files`);
          const localFiles = await localRes.json();
          const fileInfo = localFiles.find((f: any) => f.episodeId === selectedEpisodeId);
          if (fileInfo) {
            const clientID = Math.random().toString(36).substring(2, 11);
            const reqRes = await fetch(`${serverUrl}/api/v1/mediastream/request`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: fileInfo.path, streamType: 'direct', clientID, force: false })
            });
            const reqData = await reqRes.json();
            if (reqData && reqData.streamUrl) {
              let url = reqData.streamUrl;
              if (!url.startsWith('http')) url = serverUrl + url;
              setStreamUrl(url);
            }
          }
        }
      } catch (err) {
        console.error("Stream resolution failed", err);
      }
    };
    fetchStream();
  }, [serverUrl, selectedAnimeId, selectedEpisodeId]);

  useEffect(() => {
    if (streamUrl && videoRef.current) {
      videoRef.current.play().catch(e => console.error('Playback auto-start prevented:', e));
      triggerOSD();
    }
    
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
    };
  }, [streamUrl]);

  const triggerOSD = () => {
    setShowOSD(true);
    if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
    osdTimerRef.current = setTimeout(() => {
      setShowOSD(false);
    }, 4000);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const perc = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(isNaN(perc) ? 0 : perc);
    }
  };

  // Al terminar un episodio seguimos con el siguiente de la lista (mismo orden
  // que muestra DetailsScreen); si no hay más, volvemos a detalles.
  const handleEnded = async () => {
    try {
      const res = await fetch(`${serverUrl}/api/v1/library/anime-entry/${selectedAnimeId}`);
      const data = await res.json();
      const episodes: any[] = data?.episodes || [];
      const idx = episodes.findIndex((e: any) => String(e.id) === String(selectedEpisodeId));
      const next = idx >= 0 ? episodes[idx + 1] : undefined;
      if (next && next.id != null) {
        useStore.getState().setSelectedEpisode(String(next.id));
        return;
      }
    } catch (err) {
      console.error('auto-next failed', err);
    }
    setScreen('details');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      triggerOSD();
      if (!videoRef.current) return;
      
      const key = e.key;
      if (key === 'Enter' || e.keyCode === 13 || key === 'MediaPlayPause' || e.keyCode === 10014) {
        if (videoRef.current.paused) videoRef.current.play();
        else videoRef.current.pause();
        e.preventDefault();
      } else if (key === 'ArrowRight' || e.keyCode === 39) {
        videoRef.current.currentTime += 10;
        e.preventDefault();
      } else if (key === 'ArrowLeft' || e.keyCode === 37) {
        videoRef.current.currentTime -= 10;
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="screen-full player-bg">
      <video 
        ref={videoRef}
        id="tv-video"
        src={streamUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />
      <div className={`player-osd ${!showOSD ? 'hidden' : ''}`}>
        <div className="osd-title">Reproduciendo...</div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    </div>
  );
}
