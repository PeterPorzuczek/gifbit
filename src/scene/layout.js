import { $, stage, layer } from '../core/dom.js';
import { settings } from '../core/state.js';
import { createPlanner, assessmentMessage } from './geometry.js';

export function createSceneLayout(app) {
  let planner = null,
    key = '',
    items = null,
    problem = '';
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  function refresh() {
    const next = JSON.stringify([
      settings.scene,
      stage.clientWidth,
      stage.clientHeight,
      settings.mode,
      settings.bounce,
      calm.matches,
    ]);
    const changed = next !== key;
    if (changed) {
      key = next;
      planner = settings.scene.enabled
        ? createPlanner(
            settings.scene,
            stage.clientWidth,
            stage.clientHeight,
            settings.mode,
            calm.matches ? 0 : settings.bounce,
          )
        : null;
    }
    if (changed || items !== app.library.active) {
      items = app.library.active;
      const result = planner?.assess(items);
      problem = result && (result.empty || result.invalid) ? assessmentMessage(result) : '';
      if (problem) layer.replaceChildren();
      else if (changed) app.playback.reflow();
    }
    $('#scene-warning').hidden = !problem || !app.session.running;
    $('#scene-warning-text').textContent = problem;
    $('#scene-summary').textContent = settings.scene.enabled
      ? `On · ${planner.profile === 'wide' ? 'Wide' : 'Narrow'} layout · ${settings.scene.minSize}% minimum height`
      : 'Off · Animations can appear anywhere';
    $('#b-scene').textContent = settings.scene.enabled ? 'Scene: on' : 'Scene';
    return problem;
  }
  function init() {
    let frame;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        refresh();
        app.scenePanel?.resize();
      });
    });
    observer.observe(stage);
    calm.addEventListener('change', refresh);
  }
  return {
    init,
    refresh,
    problem: refresh,
    get blocked() {
      return !!problem;
    },
    place: (item, recent) => planner?.place(item, Math.random, recent),
  };
}
