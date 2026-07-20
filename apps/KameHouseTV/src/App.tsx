import React, { useEffect, useState } from 'react';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import { useStore } from './store';
import ConfigScreen from './screens/ConfigScreen';
import HomeScreen from './screens/HomeScreen';
import DetailsScreen from './screens/DetailsScreen';
import PlayerScreen from './screens/PlayerScreen';
import ErrorScreen from './screens/ErrorScreen';
import { registerTizenKeys, exitTizenApp } from './utils/tizen';
import { connectCastSocket, disconnectCastSocket } from './utils/ws';

// Initialize spatial navigation globally
init({
  debug: false,
  visualDebug: false,
});

const LoadingScreen = () => (
  <div className="screen" id="screen-loading">
    <div className="spinner-container">
      <div className="spinner"></div>
      <div className="status-text">Iniciando KameHouse TV<span className="loading-dots"></span></div>
    </div>
  </div>
);

export default function App() {
  const currentScreen = useStore((state) => state.currentScreen);
  const serverUrl = useStore((state) => state.serverUrl);
  const setScreen = useStore((state) => state.setScreen);

  useEffect(() => {
    registerTizenKeys();
    
    // Auto-connect logic
    if (serverUrl) {
      setScreen('loading');
      fetch(`${serverUrl}/api/v1/status`)
        .then(res => {
          if (res.ok) setScreen('home');
          else throw new Error('Status false');
        })
        .catch(() => setScreen('error'));
    } else {
      setScreen('config');
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      
      // Global Back/Return handling
      if (['Escape', 'Backspace', 'GoBack', 'Return', 'Back'].includes(e.key) || e.keyCode === 10009 || e.keyCode === 27) {
        const screen = useStore.getState().currentScreen;
        if (screen === 'config' || screen === 'home' || screen === 'error') {
          exitTizenApp();
        } else {
          useStore.getState().handleBack();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Canal de cast: mientras haya un servidor configurado mantenemos el
  // WebSocket abierto (con reconexión) para que la web pueda mandarnos
  // contenido con "Enviar a TV". Se reconecta solo si cambia la URL.
  useEffect(() => {
    if (!serverUrl) {
      disconnectCastSocket();
      return;
    }
    connectCastSocket(serverUrl);
  }, [serverUrl]);

  return (
    <div id="app">
      {currentScreen === 'loading' && <LoadingScreen />}
      {currentScreen === 'config' && <ConfigScreen />}
      {currentScreen === 'error' && <ErrorScreen />}
      {currentScreen === 'home' && <HomeScreen />}
      {currentScreen === 'details' && <DetailsScreen />}
      {currentScreen === 'player' && <PlayerScreen />}
    </div>
  );
}
