export async function loadSampleText() {
  const response = await fetch(new URL('./data/sample.json', document.baseURI));
  if (!response.ok) throw new Error('Sample unavailable');
  return response.text();
}

export function loadWorklet(context) {
  return context.audioWorklet.addModule(new URL('./audio/worklet.js', document.baseURI));
}
