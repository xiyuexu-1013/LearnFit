const originalWarn = console.warn.bind(console);
console.warn = (...args) => {
  const message = String(args[0] ?? '');
  if (/^[IW]\d{4} .*gl_context/.test(message)) return;
  originalWarn(...args);
};
