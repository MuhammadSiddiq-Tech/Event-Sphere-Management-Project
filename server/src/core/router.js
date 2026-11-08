/**
 * @fileoverview HTTP router — path pattern → handler mapping.
 * Paths like /expos/:id/booths are compiled to RegExp once at boot.
 * Unknown path → 404; known path, wrong method → 405 with Allow header.
 * Architecture §5.3. Rule 3.1.9.
 */

/**
 * @typedef {import('./context.js').Ctx} Ctx
 * @typedef {(ctx: Ctx, next: () => Promise<void>) => Promise<void>} Middleware
 */

/** @typedef {{ method: string, pattern: RegExp, paramNames: string[], handlers: Middleware[] }} Route */

/** @type {Route[]} */
const routes = [];

/**
 * Convert a path pattern like /expos/:id/booths to a RegExp.
 * @param {string} path
 * @returns {{ pattern: RegExp, paramNames: string[] }}
 */
function compilePath(path) {
  const paramNames = [];
  const regStr = path
    .replace(/\//g, '\\/')
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_m, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
  return { pattern: new RegExp(`^${regStr}$`), paramNames };
}

/**
 * Register a route.
 * @param {string} method - HTTP verb (uppercase)
 * @param {string} path - path pattern
 * @param {Middleware[]} handlers
 */
function addRoute(method, path, handlers) {
  const { pattern, paramNames } = compilePath(path);
  routes.push({ method: method.toUpperCase(), pattern, paramNames, handlers });
}

export const router = {
  get: (path, ...handlers) => addRoute('GET', path, handlers),
  post: (path, ...handlers) => addRoute('POST', path, handlers),
  put: (path, ...handlers) => addRoute('PUT', path, handlers),
  patch: (path, ...handlers) => addRoute('PATCH', path, handlers),
  delete: (path, ...handlers) => addRoute('DELETE', path, handlers),

  /**
   * Match an incoming request against registered routes.
   * Sets ctx.params and ctx.handlers; writes 404/405 if no match.
   * @param {Ctx} ctx
   * @returns {{ handlers: Middleware[] } | null}
   */
  match(ctx) {
    const methodRoutes = [];

    for (const route of routes) {
      const m = ctx.path.match(route.pattern);
      if (!m) continue;

      // Path matches — record allowed methods
      methodRoutes.push(route);

      if (route.method !== ctx.method) continue;

      // Extract named params
      ctx.params = {};
      route.paramNames.forEach((name, i) => {
        ctx.params[name] = decodeURIComponent(m[i + 1]);
      });

      return { handlers: route.handlers };
    }

    if (methodRoutes.length > 0) {
      // Path matched but method didn't — 405
      const allowed = [...new Set(methodRoutes.map((r) => r.method))].join(', ');
      ctx.res.writeHead(405, { Allow: allowed, 'Content-Type': 'application/json' });
      ctx.res.end(
        JSON.stringify({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: `Method ${ctx.method} not allowed` } })
      );
      return null;
    }

    // No path match — 404
    ctx.res.writeHead(404, { 'Content-Type': 'application/json' });
    ctx.res.end(
      JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } })
    );
    return null;
  },
};
