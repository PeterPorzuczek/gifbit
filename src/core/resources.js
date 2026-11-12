export function loadWorklet(context) {
  return context.audioWorklet.addModule(new URL('./audio/worklet.js', document.baseURI));
}
