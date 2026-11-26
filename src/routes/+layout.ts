// The whole site is static content generated from the component registry.
export const prerender = true;

// Every page is written as `<path>/index.html`. GitHub Pages serves that file
// for `/docs/marker/` and redirects `/docs/marker` to it, so both forms of a
// link work. The default, 'never', writes `docs/marker.html`, which Pages finds
// only without the slash.
export const trailingSlash = 'always';
