import { $, stage } from '../core/dom.js';
import { settings, saveSettings } from '../core/state.js';
import {
  normalizeScene,
  gridSize,
  profileFor,
  resampleMask,
  presetMask,
  createPlanner,
  assessmentMessage,
} from './geometry.js';

export function createScenePanel(app) {
  const dialog = $('#scene-layout');
  const grid = $('#scene-grid');
  let draft,
    profile = 'wide',
    brush = '1',
    history = [],
    cells = [],
    gridKey = '',
    activeItems = [],
    sample = null,
    disableRequested = false;
  let stroke = null,
    timer,
    latest = null,
    currentPlanner = null;
  const examples = [
    { id: 'example-square', w: 1, h: 1, word: 'Example square' },
    { id: 'example-wide', w: 16, h: 9, word: 'Example landscape' },
    { id: 'example-tall', w: 9, h: 16, word: 'Example portrait' },
  ];
  const clone = () => normalizeScene(draft);
  const remember = () => {
    history.push({ scene: clone(), disableRequested });
    if (history.length > 40) history.shift();
  };
  const reference = (name) => (name === 'wide' ? [1600, 900] : [900, 1600]);
  const otherProfile = () => (profile === 'wide' ? 'narrow' : 'wide');
  const nameOf = (name) => (name === 'wide' ? 'Wide' : 'Narrow');
  const willEnable = () =>
    draft.enabled ||
    (!disableRequested && (draft.wide.cells.includes('1') || draft.narrow.cells.includes('1')));
  function activate() {
    draft.enabled = true;
    disableRequested = false;
  }

  function getItems() {
    if (settings.source === 'set')
      return (app.sets.findSet(settings.setId)?.items || []).filter(
        (item) => !app.library.excluded.has(item.id),
      );
    return app.library.sig === app.library.sigNow() ? app.library.active : [];
  }
  function updateItems() {
    activeItems = getItems();
    const list = activeItems.length ? activeItems : examples;
    const signature = list.map((item) => item.id).join('|');
    const select = $('#scene-item');
    if (select.dataset.signature !== signature) {
      const selected = select.value;
      select.replaceChildren(
        ...list.map((item, i) => {
          const option = document.createElement('option');
          option.value = item.id;
          option.textContent = `${i + 1}. ${item.word || item.id}`;
          return option;
        }),
      );
      select.dataset.signature = signature;
      if (list.some((item) => item.id === selected)) select.value = selected;
    }
    sample = list.find((item) => item.id === select.value) || list[0];
  }
  function paintCell(index) {
    const cell = cells[index];
    if (!cell) return;
    const { cols } = gridSize(draft[profile], profile);
    const blocked = draft[profile].cells[index] === '1';
    cell.classList.toggle('blocked', blocked);
    cell.setAttribute('aria-selected', String(blocked));
    cell.setAttribute(
      'aria-label',
      `Row ${Math.floor(index / cols) + 1}, column ${(index % cols) + 1}: ${blocked ? 'blocked' : 'allowed'}`,
    );
  }
  function buildGrid() {
    const { cols, rows } = gridSize(draft[profile], profile);
    const nextKey = `${profile}:${cols}:${rows}`;
    if (nextKey !== gridKey) {
      gridKey = nextKey;
      cells = [];
      grid.replaceChildren();
      grid.style.setProperty('--scene-cols', cols);
      grid.style.setProperty('--scene-rows', rows);
      grid.setAttribute('aria-rowcount', rows);
      grid.setAttribute('aria-colcount', cols);
      for (let y = 0; y < rows; y++) {
        const row = document.createElement('div');
        row.setAttribute('role', 'row');
        for (let x = 0; x < cols; x++) {
          const cell = document.createElement('button');
          cell.type = 'button';
          cell.setAttribute('role', 'gridcell');
          cell.dataset.index = cells.length;
          cell.tabIndex = cells.length ? -1 : 0;
          cells.push(cell);
          row.append(cell);
        }
        grid.append(row);
      }
    }
    cells.forEach((_, i) => paintCell(i));
  }
  function controls() {
    $('#scene-enabled').checked = draft.enabled;
    $('#scene-wide').setAttribute('aria-pressed', String(profile === 'wide'));
    $('#scene-narrow').setAttribute('aria-pressed', String(profile === 'narrow'));
    $('#scene-block').setAttribute('aria-pressed', String(brush === '1'));
    $('#scene-allow').setAttribute('aria-pressed', String(brush === '0'));
    $('#scene-resolution').value = draft[profile].resolution;
    for (const option of $('#scene-resolution').options) {
      const { cols, rows } = gridSize({ resolution: +option.value }, profile);
      option.textContent = `${cols} × ${rows}`;
    }
    $('#scene-overlap').value = draft.overlap;
    $('#scene-overlap-value').textContent = draft.overlap
      ? `${Math.round(draft.overlap * 100)}% of a cell`
      : 'No overlap';
    $('#scene-min').value = draft.minSize;
    $('#scene-min-value').textContent = draft.minSize + '%';
    $('#scene-undo').disabled = !history.length;
    $('#scene-copy').textContent = `Copy to ${otherProfile()} layout`;
    const showGrid = $('#scene-show-grid').checked;
    grid.style.visibility = showGrid ? 'visible' : 'hidden';
    $('#scene-background').style.backgroundColor = settings.bg;
    $('#scene-background').style.backgroundImage = settings.bgImg
      ? `url("${settings.bgImg}")`
      : 'none';
    $('#scene-dim').style.opacity = settings.dim / 100;
  }
  function validate() {
    const bounce = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : settings.bounce;
    const dimensions =
      $('#scene-view').value === 'window'
        ? [stage.clientWidth, stage.clientHeight]
        : reference(profile);
    currentPlanner = createPlanner(draft, ...dimensions, settings.mode, bounce, profile);
    const selected = currentPlanner.assess(activeItems);
    const other = createPlanner(
      draft,
      ...reference(otherProfile()),
      settings.mode,
      bounce,
      otherProfile(),
    ).assess(activeItems);
    const actual = createPlanner(
      draft,
      stage.clientWidth,
      stage.clientHeight,
      settings.mode,
      bounce,
    ).assess(activeItems);
    const ownReference =
      $('#scene-view').value === 'window'
        ? createPlanner(draft, ...reference(profile), settings.mode, bounce, profile).assess(
            activeItems,
          )
        : selected;
    const invalid = [selected, other, actual, ownReference].some(
      (result) => result.empty || result.invalid,
    );
    latest = { invalid, selected, dimensions };
    $('#scene-status-title').textContent =
      selected.empty || selected.invalid
        ? 'More space needed'
        : selected.total
          ? 'Ready to play'
          : 'Mask preview';
    $('#scene-status').textContent = assessmentMessage(selected);
    $('#scene-status').parentElement.classList.toggle(
      'invalid',
      !!(selected.empty || selected.invalid),
    );
    $('#scene-other-status').textContent = `${nameOf(otherProfile())}: ${assessmentMessage(other)}`;
    const active = nameOf(profileFor(stage.clientWidth, stage.clientHeight));
    const enabled = willEnable();
    $('#scene-apply-hint').textContent = !enabled
      ? 'Layout will be off. Saved masks will not restrict the stage.'
      : invalid
        ? `Fix the layout before applying. Current window (${active.toLowerCase()}): ${assessmentMessage(actual)}`
        : !draft.enabled
          ? `Your saved mask is off. Enable and apply it to restrict the stage. Current window uses ${active.toLowerCase()}.`
          : `Apply to use this layout on the stage. Current window uses ${active.toLowerCase()}. Both reference layouts and the current window have been checked.`;
    $('#scene-apply').textContent = enabled
      ? draft.enabled
        ? 'Apply layout'
        : 'Enable and apply layout'
      : 'Save with layout off';
    $('#scene-apply').disabled = enabled && invalid;
    const board = $('#scene-board');
    board.style.aspectRatio = `${dimensions[0]} / ${dimensions[1]}`;
    board.style.setProperty('--scene-aspect', dimensions[0] / dimensions[1]);
  }
  function preview() {
    const demo = $('#scene-demo');
    demo.replaceChildren();
    const positions = [];
    const list = activeItems.length ? activeItems : examples;
    const count = settings.mode === 'single' ? 1 : settings.max;
    let selectedPosition = null;
    for (let i = 0; i < count; i++) {
      const item = i === 0 ? sample : list[Math.floor(Math.random() * list.length)];
      const p = currentPlanner.place(item, Math.random, positions);
      if (!p) continue;
      if (!i) selectedPosition = p;
      positions.push({ x: p.x + p.w / 2, y: p.y + p.h / 2 });
      const node = document.createElement('div');
      node.className = 'scene-preview-gif' + (item.sticker ? ' sticker' : '');
      Object.assign(node.style, {
        left: (p.x / currentPlanner.width) * 100 + '%',
        top: (p.y / currentPlanner.height) * 100 + '%',
        width: (p.w / currentPlanner.width) * 100 + '%',
        height: (p.h / currentPlanner.height) * 100 + '%',
        rotate: p.angle + 'deg',
      });
      if (item.small || item.big) {
        const img = new Image();
        img.alt = '';
        img.src = item.small || item.big;
        img.addEventListener(
          'error',
          () => {
            node.textContent = 'Preview unavailable';
          },
          { once: true },
        );
        node.append(img);
      } else node.textContent = 'GIF';
      demo.append(node);
    }
    const areas = selectedPosition?.regions || [];
    const { cols, rows } = gridSize(draft[profile], profile);
    const visible = $('#scene-centers').checked;
    cells.forEach((cell, i) => {
      const x = (((i % cols) + 0.5) * currentPlanner.width) / cols;
      const y = ((Math.floor(i / cols) + 0.5) * currentPlanner.height) / rows;
      cell.classList.toggle(
        'possible',
        visible && areas.some((r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom),
      );
    });
    $('#scene-beat').disabled = !demo.children.length;
  }
  function render() {
    if (!dialog.open) return;
    clearTimeout(timer);
    updateItems();
    controls();
    buildGrid();
    validate();
    preview();
  }
  function changeMask(next) {
    remember();
    draft[profile] = next;
    activate();
    render();
  }
  function focusCell(index) {
    cells.forEach((cell, i) => {
      cell.tabIndex = i === index ? 0 : -1;
    });
    cells[index]?.focus({ preventScroll: true });
  }
  function cellAt(event) {
    const rect = grid.getBoundingClientRect();
    const { cols, rows } = gridSize(draft[profile], profile);
    return {
      x: Math.min(
        cols - 1,
        Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * cols)),
      ),
      y: Math.min(
        rows - 1,
        Math.max(0, Math.floor(((event.clientY - rect.top) / rect.height) * rows)),
      ),
    };
  }
  function paint(from, to) {
    const { cols } = gridSize(draft[profile], profile);
    const values = draft[profile].cells.split('');
    const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y), 1);
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(from.x + ((to.x - from.x) * i) / steps);
      const y = Math.round(from.y + ((to.y - from.y) * i) / steps);
      values[y * cols + x] = brush;
    }
    draft[profile].cells = values.join('');
    activate();
    cells.forEach((_, i) => paintCell(i));
    controls();
  }
  function finishStroke(event) {
    if (!stroke || event.pointerId !== stroke.id) return;
    stroke = null;
    if (grid.hasPointerCapture(event.pointerId)) grid.releasePointerCapture(event.pointerId);
    render();
  }
  function open() {
    draft = normalizeScene(settings.scene);
    disableRequested = false;
    profile = profileFor(stage.clientWidth, stage.clientHeight);
    history = [];
    gridKey = '';
    $('#scene-view').value = 'reference';
    $('#scene-show-grid').checked = true;
    dialog.showModal();
    render();
  }
  function init() {
    for (const id of ['scene-open', 'b-scene', 'scene-repair'])
      $('#' + id).addEventListener('click', open);
    $('#scene-cancel').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      clearTimeout(timer);
      stroke = null;
      $('#scene-demo').replaceChildren();
    });
    for (const name of ['wide', 'narrow'])
      $('#scene-' + name).addEventListener('click', () => {
        profile = name;
        $('#scene-view').value = 'reference';
        render();
      });
    for (const [id, value] of [
      ['scene-block', '1'],
      ['scene-allow', '0'],
    ])
      $('#' + id).addEventListener('click', () => {
        brush = value;
        controls();
      });
    $('#scene-resolution').addEventListener('change', (event) =>
      changeMask(resampleMask(draft[profile], profile, profile, +event.target.value)),
    );
    $('#scene-preset').addEventListener('change', (event) => {
      if (event.target.value) changeMask(presetMask(draft[profile], profile, event.target.value));
      event.target.value = '';
    });
    for (const [id, preset] of [
      ['scene-clear', 'clear'],
      ['scene-block-all', 'block'],
      ['scene-invert', 'invert'],
    ])
      $('#' + id).addEventListener('click', () =>
        changeMask(presetMask(draft[profile], profile, preset)),
      );
    $('#scene-copy').addEventListener('click', () => {
      remember();
      const other = otherProfile();
      draft[other] = resampleMask(draft[profile], profile, other, draft[other].resolution);
      activate();
      profile = other;
      render();
    });
    $('#scene-undo').addEventListener('click', () => {
      if (history.length) {
        const previous = history.pop();
        draft = previous.scene;
        disableRequested = previous.disableRequested;
        render();
      }
    });
    $('#scene-enabled').addEventListener('change', (event) => {
      remember();
      draft.enabled = event.target.checked;
      disableRequested = !draft.enabled;
      render();
    });
    for (const [id, key] of [
      ['scene-overlap', 'overlap'],
      ['scene-min', 'minSize'],
    ]) {
      $('#' + id).addEventListener('pointerdown', remember);
      $('#' + id).addEventListener('keydown', (event) => {
        if (event.key.startsWith('Arrow')) remember();
      });
      $('#' + id).addEventListener('input', (event) => {
        draft[key] = +event.target.value;
        controls();
        clearTimeout(timer);
        timer = setTimeout(render, 100);
      });
      $('#' + id).addEventListener('change', render);
    }
    $('#scene-view').addEventListener('change', () => {
      if ($('#scene-view').value === 'window')
        profile = profileFor(stage.clientWidth, stage.clientHeight);
      render();
    });
    for (const id of ['scene-item', 'scene-centers', 'scene-show-grid'])
      $('#' + id).addEventListener('change', render);
    $('#scene-preview').addEventListener('click', render);
    $('#scene-beat').addEventListener('click', () => {
      for (const node of $('#scene-demo').children)
        node.getAnimations().forEach((animation) => animation.cancel());
      $('#scene-demo').lastElementChild?.animate(
        [{ transform: `scale(${currentPlanner.scale})` }, { transform: 'scale(1)' }],
        { duration: 260, easing: 'ease-out' },
      );
    });
    grid.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || stroke) return;
      event.preventDefault();
      remember();
      const point = cellAt(event);
      stroke = { id: event.pointerId, point };
      grid.setPointerCapture(event.pointerId);
      const { cols } = gridSize(draft[profile], profile);
      focusCell(point.y * cols + point.x);
      paint(point, point);
    });
    grid.addEventListener('pointermove', (event) => {
      if (!stroke || stroke.id !== event.pointerId) return;
      const point = cellAt(event);
      paint(stroke.point, point);
      stroke.point = point;
    });
    grid.addEventListener('pointerup', finishStroke);
    grid.addEventListener('pointercancel', finishStroke);
    grid.addEventListener('lostpointercapture', (event) => {
      if (stroke?.id === event.pointerId) {
        stroke = null;
        render();
      }
    });
    grid.addEventListener('keydown', (event) => {
      const index = +event.target.dataset.index;
      if (!Number.isInteger(index)) return;
      const { cols } = gridSize(draft[profile], profile);
      const directions = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -cols,
        ArrowDown: cols,
        Home: -index,
        End: cells.length - 1 - index,
      };
      if (event.key in directions) {
        event.preventDefault();
        focusCell(Math.min(cells.length - 1, Math.max(0, index + directions[event.key])));
      } else if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        remember();
        const point = { x: index % cols, y: Math.floor(index / cols) };
        paint(point, point);
        render();
      }
    });
    $('#scene-apply').addEventListener('click', () => {
      render();
      const enabled = willEnable();
      if (enabled && latest.invalid) return;
      settings.scene = normalizeScene({ ...draft, enabled });
      const saved = saveSettings();
      app.scene.refresh();
      if (!app.scene.blocked) app.session.hideErr();
      dialog.close();
      if (!saved) app.browser.toast('Layout applied, but browser storage could not save it.');
    });
  }
  return {
    init,
    open,
    resize: () => {
      if (!dialog.open) return;
      if ($('#scene-view').value === 'window')
        profile = profileFor(stage.clientWidth, stage.clientHeight);
      render();
    },
  };
}
