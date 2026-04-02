/**
 * MOSO Data Sanitizer — HIPAA-safe data cleaning utilities
 * Used by CRM forms, import pipelines, and the /api/data/quality-report endpoint.
 */

// --- TEXT SANITIZERS ---

export const trimAll = (obj) => {
  const cleaned = {};
  for (const [k, v] of Object.entries(obj)) {
    cleaned[k] = typeof v === 'string' ? v.trim() : v;
  }
  return cleaned;
};

export const normalizeEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  return email.toLowerCase().trim().replace(/\s+/g, '');
};

export const validateEmail = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const normalizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return phone.trim();
};

export const titleCase = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.trim().replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase());
};

export const stripHtml = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/<[^>]*>/g, '').trim();
};

// --- CLINICAL FIELD VALIDATORS ---

const VALID_STATUSES_MOSO = ['Active', 'Reactivation', 'Waitlist', 'Inactive', 'Referred Out', 'PITA-DNC'];
const VALID_STATUSES_LABNO = ['New Lead', 'Qualified', 'Proposal', 'Active Client', 'Inactive', 'Referred Out'];
const VALID_TIERS = ['1', '2', '3', 1, 2, 3];

export const validateStatus = (status, type = 'moso') => {
  const valid = type === 'moso' ? VALID_STATUSES_MOSO : VALID_STATUSES_LABNO;
  return valid.includes(status);
};

export const validateTier = (tier) => VALID_TIERS.includes(tier);

export const validateNumericRange = (val, min = 0, max = Infinity) => {
  const num = parseFloat(val);
  return !isNaN(num) && num >= min && num <= max;
};

// --- FULL RECORD SANITIZER ---

export const sanitizeClinicalLead = (lead) => {
  const cleaned = trimAll(lead);
  if (cleaned.email) cleaned.email = normalizeEmail(cleaned.email);
  if (cleaned.phone) cleaned.phone = normalizePhone(cleaned.phone);
  if (cleaned.mobile) cleaned.mobile = normalizePhone(cleaned.mobile);
  if (cleaned.city) cleaned.city = titleCase(cleaned.city);
  if (cleaned.state) cleaned.state = cleaned.state.toUpperCase().trim().slice(0, 2);
  if (cleaned.notes_clinical) cleaned.notes_clinical = stripHtml(cleaned.notes_clinical);
  if (cleaned.condition_notes) cleaned.condition_notes = stripHtml(cleaned.condition_notes);
  if (cleaned.patient_name) cleaned.patient_name = titleCase(cleaned.patient_name);
  return cleaned;
};

export const sanitizeConsultingLead = (lead) => {
  const cleaned = trimAll(lead);
  if (cleaned.email) cleaned.email = normalizeEmail(cleaned.email);
  if (cleaned.company_name) cleaned.company_name = cleaned.company_name.trim();
  if (cleaned.first_name) cleaned.first_name = titleCase(cleaned.first_name);
  if (cleaned.last_name) cleaned.last_name = titleCase(cleaned.last_name);
  if (cleaned.lifetime_value) cleaned.lifetime_value = parseFloat(cleaned.lifetime_value) || 0;
  return cleaned;
};

// --- DATA QUALITY REPORT ---

export const generateQualityReport = (leads, type = 'moso') => {
  const issues = [];
  const stats = { total: leads.length, missingEmail: 0, missingPhone: 0, invalidEmail: 0, duplicateEmails: 0, missingName: 0, invalidStatus: 0, emptyFields: {} };
  const emailSeen = new Map();

  leads.forEach((lead, i) => {
    const name = type === 'moso' ? lead.patient_name : (lead.company_name || lead.first_name);

    // Missing name
    if (!name || !name.trim()) {
      stats.missingName++;
      issues.push({ row: i, field: 'name', severity: 'high', message: `Row ${i}: Missing name` });
    }

    // Email checks
    if (!lead.email) {
      stats.missingEmail++;
    } else if (!validateEmail(lead.email)) {
      stats.invalidEmail++;
      issues.push({ row: i, field: 'email', severity: 'medium', message: `Row ${i}: Invalid email "${lead.email}"` });
    } else {
      const normalized = normalizeEmail(lead.email);
      if (emailSeen.has(normalized)) {
        stats.duplicateEmails++;
        issues.push({ row: i, field: 'email', severity: 'high', message: `Row ${i}: Duplicate email "${normalized}" (also row ${emailSeen.get(normalized)})` });
      } else {
        emailSeen.set(normalized, i);
      }
    }

    // Status validation
    const status = type === 'moso' ? lead.status : lead.client_status;
    if (status && !validateStatus(status, type)) {
      stats.invalidStatus++;
      issues.push({ row: i, field: 'status', severity: 'medium', message: `Row ${i}: Invalid status "${status}"` });
    }

    // Track empty fields
    const fields = type === 'moso'
      ? ['email', 'case_primary', 'body_region', 'tier', 'referred_by']
      : ['email', 'contact_type', 'source', 'app_interest'];
    fields.forEach(f => {
      if (!lead[f] || (typeof lead[f] === 'string' && !lead[f].trim())) {
        stats.emptyFields[f] = (stats.emptyFields[f] || 0) + 1;
      }
    });
  });

  // Fill rates
  const fillRates = {};
  Object.entries(stats.emptyFields).forEach(([field, count]) => {
    fillRates[field] = `${(((stats.total - count) / stats.total) * 100).toFixed(1)}%`;
  });

  return {
    summary: {
      total: stats.total,
      missingName: stats.missingName,
      missingEmail: stats.missingEmail,
      invalidEmail: stats.invalidEmail,
      duplicateEmails: stats.duplicateEmails,
      invalidStatus: stats.invalidStatus,
    },
    fillRates,
    issues: issues.sort((a, b) => (a.severity === 'high' ? -1 : 1) - (b.severity === 'high' ? -1 : 1)),
    grade: issues.filter(i => i.severity === 'high').length === 0
      ? (issues.length <= 5 ? 'A' : 'B')
      : (issues.filter(i => i.severity === 'high').length <= 3 ? 'C' : 'D'),
  };
};
