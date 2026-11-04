// A slow earlier search may finish after the latest one. Only the latest owns the UI.
export function createLatestRequest() {
  let generation = 0;
  return {
    invalidate() { generation++; },
    async run(request, render, onError) {
      const current = ++generation;
      try {
        const result = await request();
        if (current === generation) render(result);
      } catch (error) {
        if (current === generation) onError(error);
      }
    }
  };
}
