import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { requestAccountJson } from './account-request';

export type ResourceScope = 'normal' | 'demo';
const ResourceScopeContext = createContext<ResourceScope>('normal');

/** Route composition selects the resource namespace; transport never reads browser location. */
export function ResourceApiProvider({
  scope,
  children,
}: {
  scope: ResourceScope;
  children: ReactNode;
}) {
  return <ResourceScopeContext.Provider value={scope}>{children}</ResourceScopeContext.Provider>;
}

export function createResourceRequest(scope: ResourceScope): typeof requestAccountJson {
  return (path, options) =>
    requestAccountJson(
      scope === 'demo' ? path.replace(/^\/api\//, '/api/demo/resources/') : path,
      options,
    );
}

/** A retained client keeps its namespace even if navigation changes before a request starts. */
export function useResourceApi<T>(
  module: T & { createApi: (request: typeof requestAccountJson) => T },
): T {
  const scope = useContext(ResourceScopeContext);
  return useMemo(
    () => (scope === 'normal' ? module : module.createApi(createResourceRequest(scope))),
    [module, scope],
  );
}
