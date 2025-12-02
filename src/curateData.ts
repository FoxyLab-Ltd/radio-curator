import { StationApiRaw, Station } from './types';
import { dataOverrides } from './dataOverrides';

function getOverride(uuid: string) {
  return dataOverrides[uuid] || {}
}

function splitAndTrim(input?: string): string[] {
  return input?.split(',').map(s => s.trim()) || [];
}

export function curateData(raw: StationApiRaw): Station {
  const override = getOverride(raw.stationuuid);

  return {
    id: raw.stationuuid,
    name: raw.name,
    streamUrl: raw.url_resolved,
    homepage: raw.homepage,
    favicon: raw.favicon || null,
    tags: splitAndTrim(raw.tags),
    codec: raw.codec,
    isCustom: false,
    ...override,
  };
}

