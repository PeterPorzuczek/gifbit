export async function loadSampleText() {
  const response = await fetch(new URL('./sample.json', import.meta.url));
  if (!response.ok) throw new Error('Sample unavailable');
  return response.text();
}

export function loadWorklet(context) {
  return context.audioWorklet.addModule(new URL('./worklet.js', import.meta.url));
}
