import type { MapEventType, MapLayerEventType, MarkerEventType, PopupEventType } from 'maplibre-gl';

/**
 * Turns an event map into `on<event>` callback props.
 *
 * Deriving the props from MapLibre's own event maps means a new upstream event
 * becomes available without touching this library, and every handler keeps its
 * exact payload type.
 */
type EventProps<TEventMap> = {
	[K in keyof TEventMap as `on${K & string}`]?: (event: TEventMap[K]) => void;
};

/** Every map-level event, e.g. `onload`, `onmoveend`, `onerror`. */
export type MapEventProps = EventProps<MapEventType>;

/** Every layer-scoped event, e.g. `onclick`, `onmouseenter`, `onmouseleave`. */
export type LayerEventProps = EventProps<MapLayerEventType>;

/** `ondragstart`, `ondrag`, `ondragend`, `onclick`. */
export type MarkerEventProps = EventProps<MarkerEventType>;

/** `onopen`, `onclose`. */
export type PopupEventProps = EventProps<PopupEventType>;

/** How a camera prop change is applied to the map. */
export type CameraMode = 'jump' | 'ease' | 'fly';
