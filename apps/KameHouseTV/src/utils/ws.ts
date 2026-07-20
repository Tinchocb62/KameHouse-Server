import { useStore } from '../store';

// Cliente WebSocket de KameHouseTV.
//
// Se conecta al canal de eventos del servidor identificándose con el prefijo
// "kamehouse-tv-" para que el servidor lo liste como dispositivo de cast.
// Cuando llega un evento "cast:play" salta directamente al reproductor.

const DEVICE_ID_KEY = 'kamehouse_tv_device_id';
const PING_INTERVAL_MS = 25_000;
const RECONNECT_DELAY_MS = 5_000;

let socket: WebSocket | null = null;
let pingTimer: any = null;
let reconnectTimer: any = null;
let currentServerUrl = '';

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'kamehouse-tv-' + Math.random().toString(36).substring(2, 8);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

interface ServerEvent {
  type: string;
  payload: any;
  timestamp?: number;
}

async function handleServerEvent(event: ServerEvent) {
  if (event.type === 'cast:play') {
    const { mediaId, episodeNumber, episodeId } = event.payload || {};
    if (!mediaId || (!episodeNumber && !episodeId)) return;

    const store = useStore.getState();

    // La web manda el número de episodio; acá lo traducimos al id de episodio
    // que usa el PlayerScreen consultando la entrada de la biblioteca.
    let resolvedEpisodeId: string | null = episodeId ? String(episodeId) : null;
    if (!resolvedEpisodeId) {
      try {
        const res = await fetch(`${currentServerUrl}/api/v1/library/anime-entry/${mediaId}`);
        const data = await res.json();
        const episodes: any[] = data?.episodes || [];
        const target =
          episodes.find(
            (e) =>
              Number(e.absoluteEpisodeNumber) === Number(episodeNumber) ||
              Number(e.episodeNumber) === Number(episodeNumber)
          ) ||
          // Películas: suelen tener una sola entrega, reproducimos esa.
          (episodes.length === 1 ? episodes[0] : undefined);
        if (target?.id != null) resolvedEpisodeId = String(target.id);
      } catch (err) {
        console.error('cast: failed to resolve episode', err);
      }
    }
    if (!resolvedEpisodeId) return;

    store.setSelectedAnime(String(mediaId));
    store.setSelectedEpisode(resolvedEpisodeId);
    store.setScreen('player');
  }
}

function cleanup() {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.onclose = null;
    socket.onerror = null;
    try {
      socket.close();
    } catch {
      // ignore
    }
    socket = null;
  }
}

function scheduleReconnect() {
  if (reconnectTimer || !currentServerUrl) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectCastSocket(currentServerUrl);
  }, RECONNECT_DELAY_MS);
}

// Abre (o reabre) la conexión WebSocket contra el servidor indicado.
export function connectCastSocket(serverUrl: string) {
  if (!serverUrl) return;

  // Si ya hay una conexión viva contra el mismo servidor, no hacemos nada.
  if (
    socket &&
    currentServerUrl === serverUrl &&
    (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  cleanup();
  currentServerUrl = serverUrl;

  const wsUrl = serverUrl.replace(/^http/, 'ws') + '/api/v1/events?id=' + getDeviceId();

  try {
    socket = new WebSocket(wsUrl);
  } catch (err) {
    console.error('ws: failed to create socket', err);
    scheduleReconnect();
    return;
  }

  socket.onopen = () => {
    console.log('ws: connected as', getDeviceId());
    // El servidor cierra conexiones sin actividad (read deadline de 60s),
    // así que mandamos un ping periódico para mantenerla viva.
    pingTimer = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          clientID: getDeviceId(),
          type: 'ping',
          payload: { timestamp: Date.now() },
        }));
      }
    }, PING_INTERVAL_MS);
  };

  socket.onmessage = (msg) => {
    try {
      const event: ServerEvent = JSON.parse(msg.data);
      handleServerEvent(event);
    } catch {
      // mensajes no-JSON se ignoran
    }
  };

  socket.onclose = () => {
    console.log('ws: disconnected, retrying...');
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
    socket = null;
    scheduleReconnect();
  };

  socket.onerror = () => {
    // onclose se dispara después y agenda la reconexión
  };
}

export function disconnectCastSocket() {
  currentServerUrl = '';
  cleanup();
}
