import { setWorkerUrl } from 'maplibre-gl';
import { workerUrl } from 'virtual:maplibrex-svelte/worker';

// Browser tests load MapLibre's worker the way an app does: from the URL that
// `maplibreWorker()` from `maplibrex-svelte/vite` hands over and serves. On
// maplibre-gl releases before 6.13 that includes the shared chunk next to it.
setWorkerUrl(workerUrl);
