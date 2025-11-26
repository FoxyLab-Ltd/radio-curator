
import { fetchAndSaveRawStations } from './fetchData';
import fs from 'fs/promises';
import { StationApiRaw, Station } from './types';
import { curateData } from './curateData'; 
import { manualData } from './manualData';
import { filterStationsWithWorkingStreams } from './validateStreams';

async function runFullPipeline() {
  console.log('🚀 Starting full station curation process...');
 
  // 1. Fetch from Radio Browser
  await fetchAndSaveRawStations();

  // 2. Load saved raw.json
  const rawText = await fs.readFile('output/raw.json', 'utf-8');
  const rawData = JSON.parse(rawText) as StationApiRaw[];

  // 3. Curate
  const curated: Station[] = rawData.map(curateData);     
  const combinedList: Station[] = [...manualData, ...curated];
  const finalList = await filterStationsWithWorkingStreams(combinedList);
 
  // 4. Save curated list 
  await fs.writeFile('output/stations.json', JSON.stringify(finalList, null, 2), 'utf-8');
  console.log(`✅ Curated ${curated.length} stations → output/stations.json`);
}

runFullPipeline().catch((err) => {
  console.error('❌ Pipeline failed:', err);
});

