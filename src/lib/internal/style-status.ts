import type {
	ErrorEvent,
	Map as MapLibreMap,
	StyleSpecification,
	TransformStyleFunction
} from 'maplibre-gl';
import type { MapStatus } from '../types.js';

/**
 * Follows the styles a map is asked to show and tells whether the latest one
 * is loading, shown, or failed.
 *
 * MapLibre has no event that settles a style request. What it does, on every
 * release from 6.7:
 *
 * - A style that cannot be diffed into the current one, including the first,
 *   is rebuilt: a new, empty style object fires `styledataloading`, then
 *   either `style.load`, or `error` from that style object when its URL fails
 *   or it does not validate.
 * - A style diffed into a loaded one leaves the current one usable while a
 *   URL is fetched. A failed fetch fires `error` on the map itself. Then, all
 *   within one call: validation errors from the style, or `style.load` once
 *   the changes are in, or nothing at all when there were none, or a rebuild
 *   as above when MapLibre cannot apply the diff.
 * - Errors about anything else, such as tiles and sprites, come from the style
 *   object too, at any time, including while a diff waits for its URL.
 *
 * So a diff passes `transformStyle`, which MapLibre calls once it has the next
 * style and before it validates it, and the work it does synchronously from
 * there is attributed to the request.
 */

type Style = StyleSpecification | string;

type Request = {
	readonly style: Style;
	/**
	 * `diff` while MapLibre fetches the next style or diffs it into the current
	 * one; `rebuild` once a new, empty style is loading in its place.
	 */
	mode: 'diff' | 'rebuild';
	/** For a diff: MapLibre has the next style in hand. */
	fetched: boolean;
	loaded: boolean;
	error: Error | null;
};

export interface StyleTracker {
	/** Asks the map to show `style`, unless it is the style last asked for. */
	request(style: Style): void;
	/** The map fired `styledataloading`: a new style object replaced the previous one. */
	styleLoading(): void;
	/** The map fired `style.load`. */
	styleLoaded(): void;
	/** The map fired `load`. */
	mapLoaded(): void;
	destroy(): void;
}

export interface StyleTrackerOptions {
	/** Called when the status or the error changes. */
	onchange(status: MapStatus, error: Error | null): void;
	/** Errors the library fired on the map, which are never about the style. */
	isOwnError(error: unknown): boolean;
	/** The `transformStyle` map option, which a diff would otherwise replace. */
	transformStyle?: TransformStyleFunction;
}

function asError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}

/**
 * @param initial the style the map was created with, which it is loading.
 */
export function trackStyle(
	map: MapLibreMap,
	initial: Style,
	options: StyleTrackerOptions
): StyleTracker {
	let current: Request = {
		style: initial,
		mode: 'rebuild',
		fetched: true,
		loaded: false,
		error: null
	};
	/** The map holds a loaded style, which a new one can be diffed into. */
	let usable = false;
	let loadFired = false;
	/** The request MapLibre is applying synchronously right now. */
	let applying: Request | null = null;
	let listening = false;
	let destroyed = false;
	let status: MapStatus = 'loading';
	let error: Error | null = null;

	function publish(): void {
		// A check queued before the map went away must not listen to it again.
		if (destroyed) return;

		// Errors matter only until the request settles.
		listen(!current.loaded);

		const nextError = current.loaded ? null : current.error;
		const nextStatus: MapStatus = nextError
			? 'error'
			: current.loaded && loadFired
				? 'ready'
				: 'loading';
		if (nextStatus === status && nextError === error) return;

		status = nextStatus;
		error = nextError;
		options.onchange(status, error);
	}

	function belongsToRequest(event: ErrorEvent): boolean {
		if (current.loaded || options.isOwnError(event.error)) return false;
		if (applying === current) return true;

		const origin = (event as { style?: unknown }).style;
		if (current.mode === 'rebuild') return origin !== undefined && origin === map.style;
		// The style still shown reports its tiles and images through itself.
		return !current.fetched && origin === undefined;
	}

	function onError(event: ErrorEvent): void {
		if (belongsToRequest(event) && !current.error) {
			current.error = asError(event.error);
			publish();
		}

		// MapLibre writes an error to the console only when nothing listens for
		// it, and this listener must not count.
		map.off('error', onError);
		const handled = map.listens('error');
		if (listening) map.on('error', onError);
		if (!handled) console.error(event.error);
	}

	function listen(next: boolean): void {
		if (next === listening) return;
		listening = next;
		if (next) map.on('error', onError);
		else map.off('error', onError);
	}

	function fetched(request: Request): void {
		if (request !== current || request.loaded) return;

		request.fetched = true;
		// The style arrived, so an earlier error on the map was not its request.
		request.error = null;
		applying = request;
		publish();

		queueMicrotask(() => {
			if (applying === request) applying = null;
			if (request !== current || request.loaded || request.mode === 'rebuild') return;
			// Neither `style.load` nor an error: the diff found nothing to change.
			if (!request.error) request.loaded = true;
			publish();
		});
	}

	listen(true);

	return {
		request(style) {
			if (style === current.style) return;

			const next: Request = {
				style,
				mode: usable ? 'diff' : 'rebuild',
				fetched: false,
				loaded: false,
				error: null
			};
			current = next;
			applying = null;
			publish();

			if (usable) {
				const transform = options.transformStyle;
				map.setStyle(style, {
					transformStyle: (previous, incoming) => {
						fetched(next);
						return transform ? transform(previous, incoming) : incoming;
					}
				});
			} else {
				// Diffing into a style that has not loaded makes MapLibre warn and
				// rebuild anyway, while the request for that style carries on.
				map.setStyle(style, { diff: false });
			}
		},

		styleLoading() {
			usable = false;
			if (current.loaded || current.error) {
				// MapLibre reloads a style by itself after a WebGL context loss, and
				// the app may call `setStyle` by hand.
				current = {
					style: current.style,
					mode: 'rebuild',
					fetched: true,
					loaded: false,
					error: null
				};
			} else {
				current.mode = 'rebuild';
			}
			publish();
		},

		styleLoaded() {
			usable = true;
			current.loaded = true;
			current.error = null;
			publish();
		},

		mapLoaded() {
			loadFired = true;
			publish();
		},

		destroy() {
			listen(false);
			destroyed = true;
		}
	};
}
