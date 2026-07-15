import React from 'react';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { useStore } from '../store';

const FocusableButton = ({ onClick, className, children, focusKey }: any) => {
  const { ref, focused } = useFocusable({
    onEnterPress: onClick,
    focusKey
  });
  return (
    <button
      ref={ref as any}
      onClick={onClick}
      className={`${className} ${focused ? 'focused' : ''}`}
    >
      {children}
    </button>
  );
};

export default function ErrorScreen() {
  const setScreen = useStore(state => state.setScreen);
  const serverUrl = useStore(state => state.serverUrl);
  const setServerUrl = useStore(state => state.setServerUrl);

  const handleRetry = async () => {
    try {
      setScreen('loading');
      const res = await fetch(`${serverUrl}/api/v1/status`);
      if (res.ok) {
        setScreen('home');
      } else {
        throw new Error('Invalid status');
      }
    } catch (err) {
      setScreen('error');
    }
  };

  const handleChangeAddress = () => {
    setScreen('config');
  };

  return (
    <div className="screen" id="screen-error">
      <div className="error-container">
        <div className="error-icon">&#9888;</div>
        <div className="error-title">Error de conexión</div>
        <div className="error-detail">No se pudo conectar al servidor <strong>{serverUrl}</strong>.<br/>Verificá la IP y que el servidor esté encendido.</div>
        <div className="btn-group">
          <FocusableButton className="btn btn-primary" onClick={handleRetry}>Reintentar</FocusableButton>
          <FocusableButton className="btn btn-secondary" onClick={handleChangeAddress}>Cambiar dirección</FocusableButton>
        </div>
      </div>
    </div>
  );
}
