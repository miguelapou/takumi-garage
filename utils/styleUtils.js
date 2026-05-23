// ========================================
// STYLE UTILITIES
// ========================================

// Dark mode utility functions for common class patterns
export const cardBg = (darkMode) => darkMode ? 'bg-gray-800' : 'bg-slate-50';
export const secondaryBg = (darkMode) => darkMode ? 'bg-gray-700' : 'bg-slate-100';
export const primaryText = (darkMode) => darkMode ? 'text-gray-100' : 'text-slate-800';
export const secondaryText = (darkMode) => darkMode ? 'text-gray-400' : 'text-slate-600';
export const borderColor = (darkMode) => darkMode ? 'border-gray-700' : 'border-slate-200';
export const hoverBg = (darkMode) => darkMode ? 'hover:bg-gray-700' : 'hover:bg-slate-100';

// Common input field classes
export const inputClasses = (darkMode, additionalClasses = '') => {
  const base = `w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${additionalClasses}`;
  const theme = darkMode
    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
    : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400';
  return `${base} ${theme}`;
};

// ========================================
// TEXT CASE FORMATTING UTILITIES
// ========================================

// Acronyms that should remain fully uppercase even when typed lowercase
const TITLE_CASE_ACRONYMS = new Set([
  // Automotive brands & markets
  'BMW', 'VW', 'GMC', 'JDM', 'USDM', 'EUDM', 'OEM', 'OE', 'NOS',
  // Chassis/drivetrain systems
  'ABS', 'ESP', 'ESC', 'EPS', 'TCS', 'VSC', 'LSD', 'AWD', 'FWD', 'RWD', '4WD', '4X4',
  // Electronics
  'ECU', 'ECM', 'TCU', 'TCM', 'PCM', 'BCM', 'AEM',
  // Engine/emissions parts
  'EGR', 'PCV', 'MAF', 'MAP', 'IAT', 'TPS', 'IAC', 'CAT',
  // Lighting
  'LED', 'HID',
  // HVAC
  'AC', 'HVAC',
  // General
  'VIN', 'SKU', 'ID', 'USA', 'UK', 'EU', 'HP', 'RPM', 'MPH', 'KPH', 'DIY',
]);

// Title Case - capitalizes first letter of each word, preserving acronyms
// - All-caps words of 2+ letters from original input are kept as-is (e.g. "BMW", "M3")
// - Known acronyms are uppercased even if typed lowercase (e.g. "oem" -> "OEM")
// - All other words get standard title case
export const toTitleCase = (str) => {
  if (!str) return str;
  return str
    .split(' ')
    .map(word => {
      if (!word) return word;
      // Preserve all-caps words (2+ chars starting with a letter) as typed, e.g. "OEM", "BMW", "M3", "E46"
      if (word.length > 1 && word === word.toUpperCase() && /^[A-Z]/i.test(word) && /[A-Z]/.test(word)) {
        return word;
      }
      // Uppercase known acronyms even when typed lowercase
      if (TITLE_CASE_ACRONYMS.has(word.toUpperCase())) {
        return word.toUpperCase();
      }
      // Standard title case
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

// Sentence Case - capitalizes only the first letter of the sentence, preserving acronyms
// - All-caps words (2+ letters) from original input are kept as-is (e.g. "OEM", "BMW")
// - Known acronyms are uppercased even if typed lowercase (e.g. "oem" -> "OEM")
// - All other non-first words are lowercased
export const toSentenceCase = (str) => {
  if (!str) return str;
  return str
    .split(' ')
    .map((word, index) => {
      if (!word) return word;
      // Preserve all-caps words (2+ chars starting with a letter)
      if (word.length > 1 && word === word.toUpperCase() && /^[A-Z]/i.test(word) && /[A-Z]/.test(word)) {
        return word;
      }
      // Uppercase known acronyms even when typed lowercase
      if (TITLE_CASE_ACRONYMS.has(word.toUpperCase())) {
        return word.toUpperCase();
      }
      // First word: capitalize first letter, preserve rest as typed
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      // All other words: preserve user's capitalization
      return word;
    })
    .join(' ');
};

// All Caps - converts entire string to uppercase
// e.g., "hello world" -> "HELLO WORLD"
export const toAllCaps = (str) => {
  if (!str) return str;
  return str.toUpperCase();
};

// Common select dropdown custom arrow style (prevents React from recreating this object on every render)
export const selectDropdownStyle = {
  width: '100%',
  WebkitAppearance: 'none',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 1rem center',
  backgroundSize: '1.25em 1.25em',
  paddingRight: '2.5rem'
};
