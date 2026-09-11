// Hostname for display in generated files. Falls back to 'site' so an unparseable
// url degrades into a readable workspace rather than throwing during generation.
const host = (url) => { try { return new URL(url).hostname; } catch { return 'site'; } };
export { host };
