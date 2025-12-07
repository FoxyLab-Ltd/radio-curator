import { Station } from './types';

/**
 * Normalizes a stream URL for comparison by:
 * - Converting to lowercase
 * - Removing trailing slashes
 * - Removing query parameters (optional, but helps catch duplicates with different tokens)
 */
function normalizeStreamUrl(url: string): string {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    // Remove query parameters to catch duplicates with different tokens
    urlObj.search = '';
    return urlObj.toString().toLowerCase().replace(/\/$/, '');
  } catch {
    // If URL parsing fails, just normalize the string
    return url.toLowerCase().replace(/\/$/, '');
  }
}

/**
 * Scores a station based on data completeness and quality.
 * Higher score = better station to keep.
 */
function scoreStation(station: Station): number {
  let score = 0;
  
  // Prefer stations with valid homepage (not empty, not same as streamUrl)
  if (station.homepage && 
      station.homepage !== station.streamUrl && 
      station.homepage.trim() !== '') {
    score += 10;
  }
  
  // Prefer stations with favicon
  if (station.favicon && station.favicon !== 'null' && station.favicon !== null) {
    score += 5;
  }
  
  // Prefer stations with more tags (more descriptive)
  if (station.tags && station.tags.length > 0) {
    const nonEmptyTags = station.tags.filter(t => t.trim() !== '');
    score += nonEmptyTags.length;
  }
  
  // Prefer custom stations (manually added)
  if (station.isCustom) {
    score += 20;
  }
  
  // Prefer HTTPS over HTTP
  if (station.streamUrl.startsWith('https://')) {
    score += 3;
  }
  
  // Prefer stations with better codec info
  if (station.codec && station.codec !== '') {
    score += 2;
  }
  
  return score;
}

/**
 * Deduplicates stations by keeping the best entry for each unique stream URL.
 * Stations with the same normalized stream URL are considered duplicates.
 */
export function deduplicateStations(stations: Station[]): Station[] {
  if (stations.length === 0) {
    return [];
  }

  const urlMap = new Map<string, Station[]>();
  
  // Group stations by normalized stream URL
  for (const station of stations) {
    const normalizedUrl = normalizeStreamUrl(station.streamUrl);
    if (!urlMap.has(normalizedUrl)) {
      urlMap.set(normalizedUrl, []);
    }
    urlMap.get(normalizedUrl)!.push(station);
  }

  const deduplicated: Station[] = [];
  let duplicateCount = 0;

  // For each group, keep the station with the highest score
  for (const [normalizedUrl, group] of urlMap.entries()) {
    if (group.length > 1) {
      duplicateCount += group.length - 1;
      
      // Sort by score (descending) and keep the first one
      group.sort((a, b) => scoreStation(b) - scoreStation(a));
      
      const kept = group[0];
      const duplicates = group.slice(1);
      
      const duplicateNames = duplicates.map(s => s.name).join(', ');
      console.log(
        `🔄 Deduplicated: Kept "${kept.name}" (${kept.streamUrl}), ` +
        `removed ${duplicates.length} duplicate(s): ${duplicateNames}`
      );
      
      deduplicated.push(kept);
    } else {
      deduplicated.push(group[0]);
    }
  }

  if (duplicateCount > 0) {
    console.log(
      `✨ Deduplication complete: removed ${duplicateCount} duplicate(s), ` +
      `kept ${deduplicated.length}/${stations.length} unique stations`
    );
  }

  return deduplicated;
}

