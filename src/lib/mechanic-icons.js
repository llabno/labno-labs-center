/**
 * Pre-selected SVG icon library for the Internal Mechanic visual board.
 * Low-resolution inline SVGs — no external dependencies.
 * Users can assign icons to parts, entities, and groups.
 */

// Each icon is a 24x24 SVG path string. Rendered inline on the board.
export const BOARD_ICONS = {
  // ─── Parts / Roles ───
  shield: { label: 'Shield (Guardian)', category: 'parts', path: 'M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z' },
  heart: { label: 'Heart (Vulnerable)', category: 'parts', path: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' },
  flame: { label: 'Flame (Emergency)', category: 'parts', path: 'M13.5 0.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z' },
  sun: { label: 'Sun (Core Self)', category: 'parts', path: 'M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2s-.45 0-1 .45.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z' },
  eye: { label: 'Eye (Watcher)', category: 'parts', path: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z' },
  lock: { label: 'Lock (Gatekeeper)', category: 'parts', path: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z' },
  mask: { label: 'Mask (False Self)', category: 'parts', path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-1.12.23-2.18.65-3.15C5.54 10.43 8.03 12 11 12c2.97 0 5.46-1.57 6.35-3.15.42.97.65 2.03.65 3.15 0 4.41-3.59 8-8 8z' },
  child: { label: 'Child (Young Part)', category: 'parts', path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z' },

  // ─── People / Relationships ───
  person: { label: 'Person', category: 'people', path: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' },
  people: { label: 'Group', category: 'people', path: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' },
  home: { label: 'Home / Family', category: 'people', path: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' },
  briefcase: { label: 'Work / Career', category: 'people', path: 'M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z' },
  school: { label: 'School / Learning', category: 'people', path: 'M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z' },

  // ─── Emotions / States ───
  bolt: { label: 'Lightning (Activation)', category: 'states', path: 'M7 2v11h3v9l7-12h-4l4-8z' },
  wave: { label: 'Wave (Flow)', category: 'states', path: 'M2 12c1.5-2 3-3 4.5-3s3 1 4.5 3 3 3 4.5 3 3-1 4.5-3' },
  anchor: { label: 'Anchor (Grounded)', category: 'states', path: 'M12 2C10.34 2 9 3.34 9 5c0 1.31.84 2.41 2 2.83V10H8l4 4 4-4h-3V7.83c1.16-.42 2-1.52 2-2.83 0-1.66-1.34-3-3-3zm-7 16h14v2H5v-2z' },
  cloud: { label: 'Cloud (Foggy/Dissociated)', category: 'states', path: 'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z' },
  mountain: { label: 'Mountain (Resilience)', category: 'states', path: 'M14 6l-3.75 5 2.85 3.8-1.6 1.2C9.81 13.75 7 10 7 10l-6 8h22L14 6z' },
  tree: { label: 'Tree (Growth)', category: 'states', path: 'M12 2L8 8h2v4H8l4 6 4-6h-2V8h2L12 2zm-1 14h2v6h-2v-6z' },
  spiral: { label: 'Spiral (Cycle/Pattern)', category: 'states', path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.85 0 3.58-.5 5.07-1.37l-1.49-1.49A7.96 7.96 0 0112 20c-4.41 0-8-3.59-8-8s3.59-8 8-8c3.24 0 6.02 1.93 7.27 4.71l1.72-.72A9.96 9.96 0 0012 2z' },
  star: { label: 'Star (Aspiration)', category: 'states', path: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z' },
};

// Get icons by category
export const getIconsByCategory = (category) =>
  Object.entries(BOARD_ICONS)
    .filter(([, v]) => v.category === category)
    .map(([key, v]) => ({ key, ...v }));

// Render an icon as an SVG element (for use in the board)
export const renderBoardIcon = (iconKey, size = 20, color = '#666') => {
  const icon = BOARD_ICONS[iconKey];
  if (!icon) return null;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}"><path d="${icon.path}"/></svg>`;
};
