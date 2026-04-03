// Centralized Lance identity check — both emails are the same person
const LANCE_EMAILS = ['lance@labnolabs.com', 'lance.labno@movement-solutions.com'];

export function isLance(email) {
  return LANCE_EMAILS.includes(email);
}

export function isEmployee(email) {
  return email?.endsWith('@labnolabs.com') || email?.endsWith('@movement-solutions.com');
}
