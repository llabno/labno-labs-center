/**
 * useRole — Role-based access control
 *
 * Roles:
 *   admin  — Lance (lance@labnolabs.com OR lance.labno@movement-solutions.com) — sees everything
 *   clinical — Romy (romy@labnolabs.com) — sees clinical pages + favorites
 *
 * Page access is determined by email.
 * Each role has a set of allowed paths and visible nav zones.
 */

// Pages visible to clinical role
const CLINICAL_PATHS = new Set([
  '/today',
  '/',
  '/calendar',
  '/soap',
  '/mechanic',
  '/availability',
  '/billing',
  '/history',
  '/planner',
  '/settings',
]);

// Nav zones visible to clinical role
const CLINICAL_ZONES = new Set([
  'Command Center',
  'Clinical',
]);

// Items within zones that clinical can see
const CLINICAL_ITEMS = new Set([
  '/today',
  '/',
  '/calendar',
  '/planner',
  '/soap',
  '/mechanic',
  '/availability',
  '/billing',
  '/history',
]);

export function getRole(email) {
  if (!email) return 'admin'; // no email = dev mode or pre-auth = show everything
  const lower = email.toLowerCase();
  // Lance — admin on both domains
  if (lower === 'lance@labnolabs.com') return 'admin';
  if (lower === 'lance.labno@movement-solutions.com') return 'admin';
  // Romy — clinical role
  if (lower === 'romy@labnolabs.com') return 'clinical';
  // Fallback: labnolabs.com domain = admin, others = admin (avoid hiding features)
  if (lower.endsWith('@labnolabs.com')) return 'admin';
  return 'admin';
}

export function filterZonesForRole(zones, role) {
  if (role === 'admin') return zones;

  return zones
    .filter(zone => CLINICAL_ZONES.has(zone.name) || zone.name === 'Operations')
    .map(zone => ({
      ...zone,
      items: zone.items.filter(item => CLINICAL_ITEMS.has(item.path)),
    }))
    .filter(zone => zone.items.length > 0);
}

export function canAccessPath(path, role) {
  if (role === 'admin') return true;
  return CLINICAL_PATHS.has(path);
}

export function getRoleLabel(role) {
  if (role === 'admin') return 'Admin';
  if (role === 'clinical') return 'Clinical';
  return 'User';
}

export function getRoleColor(role) {
  if (role === 'admin') return '#b06050';
  if (role === 'clinical') return '#ad1457';
  return '#8a8682';
}
