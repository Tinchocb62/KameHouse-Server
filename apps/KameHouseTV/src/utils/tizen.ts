export function registerTizenKeys() {
  try {
    if (typeof (window as any).tizen !== 'undefined' && (window as any).tizen.tvinputdevice) {
      const keys = ['VolumeUp', 'VolumeDown', 'VolumeMute', 'Play', 'Pause', 'PlayPause', 'MediaPlay', 'MediaPause', 'MediaStop'];
      keys.forEach(k => {
        try {
          (window as any).tizen.tvinputdevice.registerKey(k);
        } catch (e) {}
      });
    }
  } catch (e) {}
}

export function exitTizenApp() {
  try {
    if (typeof (window as any).tizen !== 'undefined' && (window as any).tizen.application) {
      (window as any).tizen.application.getCurrentApplication().exit();
    }
  } catch (e) {}
}

export function getTizenLocalIP(callback: (ip: string | null) => void) {
  try {
    if (typeof (window as any).tizen !== 'undefined' && (window as any).tizen.systeminfo) {
      (window as any).tizen.systeminfo.getPropertyValue("WIFI_NETWORK", (wifi: any) => {
        if (wifi && wifi.ipAddress) {
          callback(wifi.ipAddress);
        } else {
          tryEthernet();
        }
      }, () => tryEthernet());
    } else {
      callback(null);
    }
  } catch (e) {
    callback(null);
  }

  function tryEthernet() {
    try {
      (window as any).tizen.systeminfo.getPropertyValue("ETHERNET_NETWORK", (eth: any) => {
        if (eth && eth.ipAddress) {
          callback(eth.ipAddress);
        } else {
          callback(null);
        }
      }, () => callback(null));
    } catch (e) {
      callback(null);
    }
  }
}

