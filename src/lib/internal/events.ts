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

/**
 * Separates `on<event>` callbacks from everything else.
 *
 * Control components pass their remaining props straight to a MapLibre
 * constructor, so an event handler left among them would be handed over as if
 * it were an option. Splitting first is what lets a control accept both.
 */
export function splitEventProps(props: Record<string, unknown>): {
	events: Record<string, EventHandler>;
	rest: Record<string, unknown>;
} {
	const events: Record<string, EventHandler> = {};
	const rest: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(props)) {
		if (isHandlerProp(key, value)) events[key] = value;
		else rest[key] = value;
	}

	return { events, rest };
}
