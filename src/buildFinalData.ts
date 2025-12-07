import fs from 'fs/promises';
import { StationApiRaw, Station } from './types';
import { curateData } from './curateData';
import { filterStationsWithWorkingStreams } from './validateStreams';
import { deduplicateStations } from './deduplicateStations';

async function buildFinalList() {
  try {
    const rawText = await fs.readFile('output/raw.json', 'utf-8');
    const rawData = JSON.parse(rawText) as StationApiRaw[];

    const curated: Station[] = rawData.map(curateData);
    const workingStations = await filterStationsWithWorkingStreams(curated);
    const deduplicated = deduplicateStations(workingStations);

    await fs.writeFile('output/stations.json', JSON.stringify(deduplicated, null, 2), 'utf-8');
    console.log(`✅ Saved ${deduplicated.length} curated stations to output/stations.json`);
  } catch (err) {
    console.error('❌ Failed to build final station list:', err);
  }
}

buildFinalList();

