import { getTizenLocalIP } from './tizen';

export async function scanNetwork(onFound: (url: string) => void, onProgress: (subnet: string) => void) {
  const COMMON_SUBNETS = ['192.168.100', '192.168.1', '192.168.0', '192.168.50', '192.168.86', '10.0.0', '10.0.1'];
  const PORTS = ['43211', '43212'];
  const BATCH_SIZE = 10;
  
  let abort = false;
  
  const probe = async (url: string) => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 800);
      const res = await fetch(`${url}/api/v1/status`, { signal: controller.signal });
      clearTimeout(id);
      if (res.ok) {
        return url;
      }
    } catch (e) {
      // Ignore
    }
    return null;
  };

  const processSubnet = async (subnet: string) => {
    onProgress(subnet);
    for (let ip = 1; ip <= 254; ip += BATCH_SIZE) {
      if (abort) return;
      const promises: Promise<string | null>[] = [];
      for (let j = 0; j < BATCH_SIZE && ip + j <= 254; j++) {
        for (const port of PORTS) {
          const url = `http://${subnet}.${ip + j}:${port}`;
          promises.push(probe(url));
        }
      }
      
      const results = await Promise.all(promises);
      const foundUrl = results.find(r => r !== null);
      if (foundUrl) {
        abort = true;
        onFound(foundUrl);
        return;
      }
    }
  };

  getTizenLocalIP(async (detectedIP) => {
    const subnetsToScan = new Set(COMMON_SUBNETS);
    
    if (detectedIP && /^\d+\.\d+\.\d+\.\d+/.test(detectedIP)) {
      const detectedSubnet = detectedIP.split('.').slice(0, 3).join('.');
      // Prioritize the detected subnet
      await processSubnet(detectedSubnet);
      subnetsToScan.delete(detectedSubnet);
    }
    
    for (const subnet of Array.from(subnetsToScan)) {
      if (abort) break;
      await processSubnet(subnet);
    }
  });
}

