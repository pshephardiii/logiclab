/** Demo resources use a separate server namespace; lifecycle and normal auth paths stay explicit. */
export function demoResourcePath(path: string, pathname: string) {
  const demoMode = pathname === '/demo' || pathname.startsWith('/demo/');
  const resource =
    /^\/api\/(classes|enrollments|problems|assignments|student|billing)(\/|\?|$)/.test(path);
  return demoMode && resource ? path.replace('/api/', '/api/demo/resources/') : path;
}
