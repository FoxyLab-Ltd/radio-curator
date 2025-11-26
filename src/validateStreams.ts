import { Station } from './types';

const DEFAULT_TIMEOUT_MS = Number(process.env.STREAM_TIMEOUT_MS) || 5000;
const DEFAULT_CONCURRENCY = Number(process.env.STREAM_VALIDATION_CONCURRENCY) || 5;

async function probeStream(url: string, timeoutMs: number): Promise<boolean> {
  if (!url) {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Awaited<ReturnType<typeof fetch>> | undefined;

  try {
    response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      return false;
    }

    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);

    const body = response?.body as { cancel?: () => Promise<void> } | undefined;
    if (body?.cancel) {
      try {
        await body.cancel();
      } catch {
        // ignore cancellation failures
      }
    }
  }
}

export interface StreamValidationOptions {
  timeoutMs?: number;
  concurrency?: number;
}

export async function filterStationsWithWorkingStreams(
  stations: Station[],
  options: StreamValidationOptions = {},
): Promise<Station[]> {
  if (stations.length === 0) {
    return [];
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);
  const statuses = new Array<boolean>(stations.length).fill(false);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const currentIndex = nextIndex++;
      if (currentIndex >= stations.length) {
        break;
      }

      const station = stations[currentIndex];
      const ok = await probeStream(station.streamUrl, timeoutMs);
      statuses[currentIndex] = ok;

      if (!ok) {
        console.warn(`⚠️ Skipping station "${station.name}" – stream is unreachable (${station.streamUrl})`);
      }
    }
  };

  const workerCount = Math.min(concurrency, stations.length);
  await Promise.all(Array.from({ length: workerCount }, worker));

  const filtered = stations.filter((_, idx) => statuses[idx]);
  console.log(`🔍 Stream validation complete: kept ${filtered.length}/${stations.length} stations`);

  return filtered;
}


