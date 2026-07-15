import React, { useEffect, useState } from 'react';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { useStore } from '../store';

const PosterCard = ({ item, onSelect }: any) => {
  const serverUrl = useStore(state => state.serverUrl);
  const { ref, focused } = useFocusable({
    onEnterPress: () => onSelect(item.id),
  });

  let imgUrl = item.posterImage || '';
  if (imgUrl && !imgUrl.startsWith('http')) {
    imgUrl = serverUrl + imgUrl;
  }

  return (
    <div
      ref={ref as any}
      className={`poster-card ${focused ? 'focused' : ''}`}
      onClick={() => onSelect(item.id)}
    >
      <img src={imgUrl} alt={item.titleEnglish || 'Poster'} />
    </div>
  );
};

export default function HomeScreen() {
  const [items, setItems] = useState<any[]>([]);
  const serverUrl = useStore(state => state.serverUrl);
  const setSelectedAnime = useStore(state => state.setSelectedAnime);
  const setScreen = useStore(state => state.setScreen);

  useEffect(() => {
    fetch(`${serverUrl}/api/v1/library/collection`)
      .then(res => res.json())
      .then(data => {
        if (data && data.items) {
          setItems(data.items);
        }
      })
      .catch(err => {
        console.error(err);
      });
  }, [serverUrl]);

  const handleSelect = (id: string) => {
    setSelectedAnime(id);
    setScreen('details');
  };

  return (
    <div className="screen-full">
      <div className="header">
        <div className="logo-small">Kame<span>House</span></div>
      </div>
      <div className="grid-container">
        {items.map(item => (
          <PosterCard key={item.id} item={item} onSelect={handleSelect} />
        ))}
      </div>
    </div>
  );
}
