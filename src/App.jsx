import React, { useEffect, useMemo, useState } from 'react';

const ROLE_LABELS = {
  primary: 'Primary',
  secondary: 'Secondary',
  background: 'Background',
  surface: 'Surface',
  text: 'Text',
  muted: 'Muted',
  border: 'Border',
  success: 'Success',
  warning: 'Warning',
  error: 'Error'
};

const EDITABLE_ROLES = Object.keys(ROLE_LABELS);
const STORAGE_KEY = 'palette-creator-state-v1';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHex(hex) {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    return `#${clean.split('').map((char) => char + char).join('')}`.toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return `#${clean}`.toLowerCase();
  }
  return '#6366f1';
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex).replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rUnit = r / 255;
  const gUnit = g / 255;
  const bUnit = b / 255;
  const max = Math.max(rUnit, gUnit, bUnit);
  const min = Math.min(rUnit, gUnit, bUnit);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === rUnit) h = ((gUnit - bUnit) / delta) % 6;
    if (max === gUnit) h = (bUnit - rUnit) / delta + 2;
    if (max === bUnit) h = (rUnit - gUnit) / delta + 4;
    h *= 60;
  }

  return {
    h: h < 0 ? h + 360 : h,
    s: s * 100,
    l: l * 100
  };
}

function hslToHex({ h, s, l }) {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = light - chroma / 2;
  let rgb = [0, 0, 0];

  if (hue < 60) rgb = [chroma, x, 0];
  else if (hue < 120) rgb = [x, chroma, 0];
  else if (hue < 180) rgb = [0, chroma, x];
  else if (hue < 240) rgb = [0, x, chroma];
  else if (hue < 300) rgb = [x, 0, chroma];
  else rgb = [chroma, 0, x];

  return rgbToHex({
    r: (rgb[0] + match) * 255,
    g: (rgb[1] + match) * 255,
    b: (rgb[2] + match) * 255
  });
}

function colorFrom(base, hueShift, satShift, lightness, controls) {
  const hsl = hexToHsl(base);
  return hslToHex({
    h: hsl.h + hueShift,
    s: clamp(hsl.s + satShift + controls.saturation, 6, 96),
    l: clamp(lightness + controls.lightness, 4, 98)
  });
}

function generatePalette(baseColor, controls, dark = false) {
  const base = normalizeHex(baseColor);
  const baseHsl = hexToHsl(base);
  const primaryLightness = dark ? 66 : clamp(baseHsl.l + controls.lightness, 36, 58);

  if (dark) {
    return {
      primary: colorFrom(base, 0, 6, primaryLightness, controls),
      secondary: colorFrom(base, 36, -14, 58, controls),
      background: colorFrom(base, 0, -72, 8, { saturation: 0, lightness: controls.lightness / 4 }),
      surface: colorFrom(base, 0, -66, 13, { saturation: 0, lightness: controls.lightness / 4 }),
      text: colorFrom(base, 0, -70, 94, { saturation: 0, lightness: 0 }),
      muted: colorFrom(base, 0, -56, 68, { saturation: 0, lightness: 0 }),
      border: colorFrom(base, 0, -68, 24, { saturation: 0, lightness: controls.lightness / 5 }),
      success: hslToHex({ h: 150, s: clamp(58 + controls.saturation / 2, 34, 86), l: clamp(55 + controls.lightness / 2, 42, 72) }),
      warning: hslToHex({ h: 42, s: clamp(86 + controls.saturation / 3, 58, 96), l: clamp(60 + controls.lightness / 3, 46, 74) }),
      error: hslToHex({ h: 0, s: clamp(72 + controls.saturation / 3, 48, 92), l: clamp(62 + controls.lightness / 3, 46, 76) })
    };
  }

  return {
    primary: colorFrom(base, 0, 0, primaryLightness, controls),
    secondary: colorFrom(base, 34, -18, 44, controls),
    background: colorFrom(base, 0, -70, 98, { saturation: 0, lightness: controls.lightness / 5 }),
    surface: '#ffffff',
    text: colorFrom(base, 0, -78, 12, { saturation: 0, lightness: controls.lightness / 6 }),
    muted: colorFrom(base, 0, -58, 46, { saturation: 0, lightness: controls.lightness / 6 }),
    border: colorFrom(base, 0, -74, 88, { saturation: 0, lightness: controls.lightness / 5 }),
    success: hslToHex({ h: 150, s: clamp(58 + controls.saturation / 2, 34, 86), l: clamp(38 + controls.lightness / 3, 26, 52) }),
    warning: hslToHex({ h: 40, s: clamp(88 + controls.saturation / 3, 58, 96), l: clamp(50 + controls.lightness / 3, 38, 62) }),
    error: hslToHex({ h: 0, s: clamp(72 + controls.saturation / 3, 48, 92), l: clamp(48 + controls.lightness / 3, 36, 62) })
  };
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(foreground, background) {
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (light + 0.05) / (dark + 0.05);
}

function contrastGrade(ratio) {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'UI';
  return 'Fail';
}

function isValidHex(value) {
  return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

function HexTextInput({ value, onCommit, label }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function handleChange(event) {
    const nextValue = event.target.value;
    setDraft(nextValue);
    if (isValidHex(nextValue)) {
      onCommit(normalizeHex(nextValue));
    }
  }

  return (
    <input
      type="text"
      value={draft}
      onBlur={() => setDraft(value)}
      onChange={handleChange}
      aria-label={label}
      spellCheck="false"
    />
  );
}

function buildCss(light, dark, includeDark) {
  const lines = [
    ':root {',
    ...EDITABLE_ROLES.map((role) => `  --color-${role}: ${light[role]};`),
    '}'
  ];

  if (includeDark) {
    lines.push('', '[data-theme="dark"] {');
    lines.push(...EDITABLE_ROLES.map((role) => `  --color-${role}: ${dark[role]};`));
    lines.push('}');
  }

  return lines.join('\n');
}

function getInitialState() {
  const fallback = {
    baseColor: '#6366f1',
    controls: { saturation: 0, lightness: 0 },
    darkEnabled: false,
    savedPalettes: []
  };

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored) return fallback;
    return { ...fallback, ...stored };
  } catch {
    return fallback;
  }
}

function App() {
  const initialState = useMemo(getInitialState, []);
  const [baseColor, setBaseColor] = useState(initialState.baseColor);
  const [controls, setControls] = useState(initialState.controls);
  const [darkEnabled, setDarkEnabled] = useState(initialState.darkEnabled);
  const [activeTheme, setActiveTheme] = useState('light');
  const [lightPalette, setLightPalette] = useState(() =>
    initialState.lightPalette || generatePalette(initialState.baseColor, initialState.controls)
  );
  const [darkPalette, setDarkPalette] = useState(() =>
    initialState.darkPalette || generatePalette(initialState.baseColor, initialState.controls, true)
  );
  const [savedPalettes, setSavedPalettes] = useState(initialState.savedPalettes);
  const [copyState, setCopyState] = useState('Copia CSS');

  const currentPalette = activeTheme === 'dark' ? darkPalette : lightPalette;
  const setCurrentPalette = activeTheme === 'dark' ? setDarkPalette : setLightPalette;
  const cssOutput = useMemo(
    () => buildCss(lightPalette, darkPalette, darkEnabled),
    [lightPalette, darkPalette, darkEnabled]
  );
  const previewStyle = {
    '--preview-primary': currentPalette.primary,
    '--preview-secondary': currentPalette.secondary,
    '--preview-background': currentPalette.background,
    '--preview-surface': currentPalette.surface,
    '--preview-text': currentPalette.text,
    '--preview-muted': currentPalette.muted,
    '--preview-border': currentPalette.border,
    '--preview-success': currentPalette.success,
    '--preview-warning': currentPalette.warning,
    '--preview-error': currentPalette.error
  };

  const contrastChecks = [
    ['Testo su background', currentPalette.text, currentPalette.background],
    ['Testo su surface', currentPalette.text, currentPalette.surface],
    ['Primary button', currentPalette.surface, currentPalette.primary],
    ['Secondary button', currentPalette.surface, currentPalette.secondary],
    ['Muted su background', currentPalette.muted, currentPalette.background],
    ['Error su surface', currentPalette.error, currentPalette.surface]
  ].map(([label, foreground, background]) => {
    const ratio = contrastRatio(foreground, background);
    return { label, foreground, background, ratio, grade: contrastGrade(ratio) };
  });

  useEffect(() => {
    const payload = {
      baseColor,
      controls,
      darkEnabled,
      lightPalette,
      darkPalette,
      savedPalettes
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [baseColor, controls, darkEnabled, lightPalette, darkPalette, savedPalettes]);

  function regenerate(nextBase = baseColor, nextControls = controls) {
    setLightPalette(generatePalette(nextBase, nextControls));
    setDarkPalette(generatePalette(nextBase, nextControls, true));
  }

  function handleBaseChange(value) {
    const normalized = normalizeHex(value);
    setBaseColor(normalized);
    regenerate(normalized, controls);
  }

  function handleControlChange(key, value) {
    const nextControls = { ...controls, [key]: Number(value) };
    setControls(nextControls);
    regenerate(baseColor, nextControls);
  }

  function updateRole(role, value) {
    setCurrentPalette((palette) => ({ ...palette, [role]: normalizeHex(value) }));
  }

  async function copyCss() {
    try {
      await navigator.clipboard.writeText(cssOutput);
      setCopyState('Copiato');
      window.setTimeout(() => setCopyState('Copia CSS'), 1400);
    } catch {
      setCopyState('Errore copia');
      window.setTimeout(() => setCopyState('Copia CSS'), 1400);
    }
  }

  function saveCurrentPalette() {
    const label = `Palette ${new Date().toLocaleDateString('it-IT')} ${new Date().toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
    const item = {
      id: crypto.randomUUID(),
      label,
      baseColor,
      controls,
      darkEnabled,
      lightPalette,
      darkPalette
    };
    setSavedPalettes((items) => [item, ...items].slice(0, 12));
  }

  function loadPalette(item) {
    setBaseColor(item.baseColor);
    setControls(item.controls);
    setDarkEnabled(item.darkEnabled);
    setLightPalette(item.lightPalette);
    setDarkPalette(item.darkPalette);
    setActiveTheme(item.darkEnabled ? activeTheme : 'light');
  }

  function deletePalette(id) {
    setSavedPalettes((items) => items.filter((item) => item.id !== id));
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <aside className="control-panel" aria-label="Controlli palette">
          <div className="brand-row">
            <div>
              <h1>Palette Creator</h1>
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="base-color">Colore base</label>
            <div className="color-input-row">
              <input
                id="base-color"
                type="color"
                value={baseColor}
                onChange={(event) => handleBaseChange(event.target.value)}
                aria-label="Scegli colore base"
              />
              <HexTextInput value={baseColor} onCommit={handleBaseChange} label="Valore esadecimale colore base" />
            </div>
          </div>

          <div className="slider-grid">
            <label>
              <span>Saturazione</span>
              <strong>{controls.saturation > 0 ? `+${controls.saturation}` : controls.saturation}</strong>
              <input
                type="range"
                min="-30"
                max="30"
                value={controls.saturation}
                onChange={(event) => handleControlChange('saturation', event.target.value)}
              />
            </label>
            <label>
              <span>Luminosità</span>
              <strong>{controls.lightness > 0 ? `+${controls.lightness}` : controls.lightness}</strong>
              <input
                type="range"
                min="-18"
                max="18"
                value={controls.lightness}
                onChange={(event) => handleControlChange('lightness', event.target.value)}
              />
            </label>
          </div>

          <div className="toolbar">
            <button type="button" onClick={() => regenerate()}>
              Rigenera
            </button>
            <button type="button" className="primary-action" onClick={saveCurrentPalette}>
              Salva
            </button>
          </div>

          <div className="theme-tools">
            <label className="switch-row">
              <input
                type="checkbox"
                checked={darkEnabled}
                onChange={(event) => {
                  setDarkEnabled(event.target.checked);
                  setActiveTheme(event.target.checked ? activeTheme : 'light');
                }}
              />
              <span>Abilita Dark mode</span>
            </label>
            <div className="segmented" aria-label="Tema attivo">
              <button
                type="button"
                className={activeTheme === 'light' ? 'active' : ''}
                onClick={() => setActiveTheme('light')}
              >
                Light
              </button>
              <button
                type="button"
                className={activeTheme === 'dark' ? 'active' : ''}
                disabled={!darkEnabled}
                onClick={() => setActiveTheme('dark')}
              >
                Dark
              </button>
            </div>
          </div>

          <section className="saved-panel" aria-label="Palette salvate">
            <div className="section-heading">
              <h2>Salvate</h2>
              <span>{savedPalettes.length}/12</span>
            </div>
            {savedPalettes.length === 0 ? (
              <p className="empty-copy">Nessuna palette salvata.</p>
            ) : (
              <div className="saved-list">
                {savedPalettes.map((item) => (
                  <div className="saved-item" key={item.id}>
                    <button type="button" onClick={() => loadPalette(item)}>
                      <span>{item.label}</span>
                      <i style={{ background: item.lightPalette.primary }} />
                      <i style={{ background: item.lightPalette.secondary }} />
                      <i style={{ background: item.lightPalette.background }} />
                    </button>
                    <button type="button" className="icon-button" onClick={() => deletePalette(item.id)}>
                      Elimina
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>

        <section className="main-panel">
          <div className="top-grid">
            <section className="panel palette-panel" aria-label="Editor ruoli">
              <div className="section-heading">
                <h2>Ruoli UI</h2>
                <span>{activeTheme === 'dark' ? 'Dark' : 'Light'}</span>
              </div>
              <div className="role-grid">
                {EDITABLE_ROLES.map((role) => (
                  <label className="role-row" key={role}>
                    <span className="swatch" style={{ background: currentPalette[role] }} />
                    <span className="role-name">{ROLE_LABELS[role]}</span>
                    <input
                      type="color"
                      value={currentPalette[role]}
                      onChange={(event) => updateRole(role, event.target.value)}
                      aria-label={`Modifica ${ROLE_LABELS[role]}`}
                    />
                    <HexTextInput
                      value={currentPalette[role]}
                      onCommit={(value) => updateRole(role, value)}
                      label={`Hex ${ROLE_LABELS[role]}`}
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="panel contrast-panel" aria-label="Controlli contrasto">
              <div className="section-heading">
                <h2>Contrasto WCAG</h2>
                <span>{contrastChecks.filter((check) => check.grade !== 'Fail').length}/{contrastChecks.length}</span>
              </div>
              <div className="contrast-list">
                {contrastChecks.map((check) => (
                  <div className="contrast-row" key={check.label}>
                    <div>
                      <strong>{check.label}</strong>
                      <span>{check.ratio.toFixed(2)}:1</span>
                    </div>
                    <span className={`grade grade-${check.grade.toLowerCase()}`}>{check.grade}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="preview-band" style={previewStyle} aria-label="Preview interfaccia">
            <div className="preview-nav">
              <strong>Studio Project</strong>
              <nav>
                <a>Dashboard</a>
                <a>Palette</a>
                <a>Settings</a>
              </nav>
              <button type="button">Nuovo</button>
            </div>
            <div className="preview-content">
              <div className="preview-copy">
                <span className="preview-kicker">Design system</span>
                <h2>Colori pronti per interfacce web leggibili.</h2>
                <p>
                  Questa preview usa i token attivi per mostrare superficie, testo, bordi, stati e azioni principali.
                </p>
                <div className="preview-actions">
                  <button type="button">Primary action</button>
                  <button type="button" className="secondary-preview-button">
                    Secondary
                  </button>
                </div>
              </div>
              <form className="preview-form">
                <label>
                  Nome progetto
                  <input type="text" value="SaaS dashboard" readOnly />
                </label>
                <label>
                  Stato
                  <select value="ready" disabled>
                    <option value="ready">Ready</option>
                  </select>
                </label>
                <div className="state-grid">
                  <span className="success">Success</span>
                  <span className="warning">Warning</span>
                  <span className="error">Error</span>
                </div>
              </form>
            </div>
          </section>

          <section className="panel export-panel" aria-label="Export CSS">
            <div className="section-heading">
              <h2>Export CSS variables</h2>
              <button type="button" className="primary-action" onClick={copyCss}>
                {copyState}
              </button>
            </div>
            <pre>{cssOutput}</pre>
          </section>
        </section>
      </section>
    </main>
  );
}

export default App;
