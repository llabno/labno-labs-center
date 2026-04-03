/**
 * Consumer-friendly names for trademarked therapeutic frameworks.
 * Internal code still uses module IDs (m9, m16, etc.)
 * These labels are what users see in the UI.
 */

// Module display names — consumer-facing
export const MODULE_LABELS = {
  m9:  'Nervous System State',        // was: Polyvagal Theory (Stephen Porges)
  m16: 'Parts Awareness',             // was: Internal Family Systems (Richard Schwartz)
  m18: 'Belief Inquiry',              // was: Compassionate Inquiry (Gabor Maté)
  m19: 'Core Drives',                 // was: Panksepp Affective Neuroscience
  m21: 'Relational Safety',           // was: Winnicott Holding Environment
  m22: 'Empathy Gate',                // was: Epstein Feel-Towards Gate
  m23: 'Four Perspectives',           // was: Integral Theory / AQAL (Ken Wilber)
  m20: 'Values & Worldview',          // was: Spiral Dynamics (Don Beck / Clare Graves)
  m25: 'Natural Flow',                // was: Watts / Taoism / Wu Wei
};

// Short descriptions for tooltips / onboarding
export const MODULE_DESCRIPTIONS = {
  m9:  'Reading your nervous system — safe, guarded, or overwhelmed',
  m16: 'Detecting which parts of you are active and what they protect',
  m18: 'Surfacing the hidden beliefs driving your reactions',
  m19: 'Identifying the core emotional drive underneath',
  m21: 'Assessing safety, regulation, connection, and meaning in the interaction',
  m22: 'Checking if you can see the other person as a whole person right now',
  m23: 'Balancing inner experience, outer behavior, relationship field, and context',
  m20: 'Understanding value system alignment or clash between you and them',
  m25: 'Finding the non-forcing path — action aligned with reality, not desire',
};

// Part role labels — consumer-facing
export const ROLE_LABELS = {
  protector: 'Guardian',              // was: Protector (Manager) — IFS term
  exile:     'Vulnerable Part',       // was: Exile — IFS term
  firefighter: 'Emergency Responder', // was: Firefighter — IFS term
  self:      'Core Self',             // was: Self Energy — IFS term
};

// NS State labels — consumer-facing
export const NS_LABELS = {
  green: 'Connected',                 // was: Ventral Vagal
  amber: 'Guarded',                   // was: Sympathetic
  red:   'Overwhelmed',               // was: Dorsal Vagal
};

// Affective drive labels — consumer-facing
export const DRIVE_LABELS = {
  seeking:     'Motivation',          // was: SEEKING (Panksepp)
  rage:        'Boundary Fire',       // was: RAGE (Panksepp)
  fear:        'Threat Alert',        // was: FEAR (Panksepp)
  panic_grief: 'Separation Pain',     // was: PANIC-GRIEF (Panksepp)
  care:        'Nurturing',           // was: CARE (Panksepp)
  play:        'Playfulness',         // was: PLAY (Panksepp)
};

// Four-layer check labels — consumer-facing
export const LAYER_LABELS = {
  safety:     'Safety',               // same
  regulation: 'Co-Regulation',        // same but simplified
  connection: 'Genuine Contact',      // was: Connection
  meaning:    'Shared Meaning',       // was: Meaning
};

// AQAL quadrant labels — consumer-facing
export const QUADRANT_LABELS = {
  ul: 'My Inner World',              // was: Upper Left / Interior Individual
  ur: 'My Actions & Body',           // was: Upper Right / Exterior Individual
  ll: 'Between Us',                  // was: Lower Left / Interior Collective
  lr: 'The Bigger Picture',          // was: Lower Right / Exterior Collective
};

// Unburdening step labels — consumer-facing
export const UNBURDENING_LABELS = {
  check_readiness: 'Check In',
  listen:          'Listen & Witness',
  do_over:         'Offer What Was Needed',
  release:         'Let Go',
  new_qualities:   'Invite Something New',
  integrate:       'Welcome Back',
};

// Export for peer consultation header
export const PRODUCT_NAME = 'The Internal Mechanic';
export const EXPORT_TITLE = 'Peer Consultation Summary';
