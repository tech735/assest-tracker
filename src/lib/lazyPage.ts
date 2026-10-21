import { lazy, type ComponentType } from 'react';

const RELOAD_FLAG = 'chunkReloadAt';

/**
 * React.lazy for route pages. After a new deploy, a tab opened on the previous version asks for
 * page files that no longer exist; reload once to pick up the new version instead of crashing.
 */
export function lazyPage<T extends ComponentType<unknown>>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await load();
      sessionStorage.removeItem(RELOAD_FLAG);
      return mod;
    } catch (error) {
      const last = Number(sessionStorage.getItem(RELOAD_FLAG) || 0);
      if (Date.now() - last > 10_000) {
        sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
        window.location.reload();
        return new Promise<never>(() => {});
      }
      throw error;
    }
  });
}
