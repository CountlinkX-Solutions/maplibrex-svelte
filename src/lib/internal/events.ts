export type EventHandler = (event: never) => void;

/** `onclick` -> `click`. MapLibre event names are already lowercase. */
export function eventNameOf(propName: string): string {
	return propName.slice(2);
}

function isHandlerProp(key: string, value: unknown): value is EventHandler {
	return key.length > 2 && key.startsWith('on') && typeof value === 'function';
}

/**
 * Extracts `on<event>` callback props into a `{ eventName: handler }` record.
 *
 * Components accept every MapLibre event as a typed callback prop, so this is
 * what turns that surface into concrete subscriptions without enumerating the
 * event list by hand in each component.
 */
export function pickEventHandlers(props: Record<string, unknown>): Record<string, EventHandler> {
	const handlers: Record<string, EventHandler> = {};

	for (const [key, value] of Object.entries(props)) {
		if (isHandlerProp(key, value)) handlers[eventNameOf(key)] = value;
	}

	return handlers;
}
