export class ApplicationError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const invalid = message => { throw new ApplicationError(400, 'INVALID_COURSE', message); };
const pricingFields = ['pricingModel', 'price', 'months', 'duration', 'packageType', 'packageTotal', 'bookingExpiry', 'onlineStore'];
const typeFields = ['classTypeId', 'classTypeVersion'];
const fields = new Set(['courseName', 'feeName', 'category', 'level', 'publicColor', ...typeFields, ...pricingFields]);
const plainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
export const normalizePublicCourseColor = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : null;

function coursePublicColor(value) {
  if (value === undefined || value === null) return null;
  const normalized = normalizePublicCourseColor(value);
  if (normalized === null) invalid('Public course colour must be a six-digit hexadecimal colour or null.');
  return normalized;
}

function text(value, label, required = false) {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string' || value.trim().length > 200 || (required && !value.trim())) invalid(`${label} must be ${required ? 'non-empty text' : 'text'} of at most 200 characters.`);
  return value.trim();
}

function positive(value, label, maximum, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > maximum || (integer && !Number.isInteger(value))) invalid(`${label} must be a positive ${integer ? 'whole number' : 'number'} no greater than ${maximum}.`);
  return value;
}

function validatePricing(source) {
  const course = {
    pricingModel: source.pricingModel,
    price: positive(source.price, 'Price', 1_000_000),
  };
  const scaled = course.price * 100;
  const cents = Math.round(scaled);
  if (cents < 1 || Math.abs(scaled - cents) > 0.000001) invalid('Price must be at least 0.01 and have at most two decimal places.');
  course.price = cents / 100;
  if (!['monthly-lessons', 'fixed-monthly', 'package'].includes(course.pricingModel)) invalid('Select a valid pricing model.');
  if (course.pricingModel === 'package') {
    if (!['visits', 'lessons', 'minutes'].includes(source.packageType)) invalid('Package type must be visits or minutes.');
    course.packageType = source.packageType === 'lessons' ? 'visits' : source.packageType;
    course.packageTotal = positive(source.packageTotal, 'Package total', 1_000_000, true);
  } else {
    course.months = positive(source.months, 'Months', 24, true);
    if (course.pricingModel === 'monthly-lessons') course.duration = positive(source.duration, 'Duration', 1440, true);
  }
  if (source.bookingExpiry === undefined || source.bookingExpiry === null) course.bookingExpiry = null;
  else {
    if (!plainObject(source.bookingExpiry) || Object.keys(source.bookingExpiry).some(key => !['value', 'unit'].includes(key))) invalid('Booking expiry must contain a value and unit.');
    if (!['days', 'weeks', 'months'].includes(source.bookingExpiry.unit)) invalid('Booking expiry unit must be days, weeks or months.');
    course.bookingExpiry = { value: positive(source.bookingExpiry.value, 'Booking expiry', 1200, true), unit: source.bookingExpiry.unit };
  }
  if (source.onlineStore !== undefined && typeof source.onlineStore !== 'boolean') invalid('Online store must be true or false.');
  course.onlineStore = source.onlineStore ?? false;
  return course;
}

export function hasPricingFields(input) {
  return ['feeName', ...pricingFields].some(field => Object.hasOwn(input, field));
}

function classTypeSelection(input) {
  if (!Object.hasOwn(input, 'classTypeId')) {
    if (Object.hasOwn(input, 'classTypeVersion')) invalid('Class type version requires an explicit selection.');
    return {};
  }
  const id = input.classTypeId;
  if (id !== null && (typeof id !== 'string' || !id || id.length > 200)) invalid('Choose an existing class type or clear the selection.');
  if (id !== null && (!Number.isSafeInteger(input.classTypeVersion) || input.classTypeVersion < 1)) throw new ApplicationError(409, 'CLASS_TYPE_VERSION_REQUIRED', 'Reload the class type and include its current version.');
  if (id === null && Object.hasOwn(input, 'classTypeVersion') && input.classTypeVersion !== 0) invalid('An empty class type must use version zero.');
  return { classTypeId: id, ...(id !== null ? { classTypeVersion: input.classTypeVersion } : {}) };
}

export function validateCourseMetadata(input, current = null) {
  if (!plainObject(input)) invalid('Course must be a JSON object.');
  for (const key of Object.keys(input)) if (!['courseName', 'category', 'level', 'publicColor', 'version', ...typeFields].includes(key)) invalid(`Unsupported course field: ${key}.`);
  const source = current ? { ...current, ...input } : input;
  return { courseName: text(source.courseName, 'Course name', true), category: text(source.category, 'Category'), level: text(source.level, 'Level'), publicColor: coursePublicColor(source.publicColor), ...classTypeSelection(input) };
}

export function validateCourse(input, current = null) {
  if (!plainObject(input)) invalid('Course must be a JSON object.');
  for (const key of Object.keys(input)) if (!fields.has(key) && key !== 'version') invalid(`Unsupported course field: ${key}.`);
  const source = current ? { ...current, ...input } : input;
  return {
    courseName: text(source.courseName, 'Course name', true), category: text(source.category, 'Category'), level: text(source.level, 'Level'), publicColor: coursePublicColor(source.publicColor),
    feeName: text(source.feeName, 'Fee name', true), ...validatePricing(source), ...classTypeSelection(input),
  };
}

export function validateFee(input, current = null) {
  if (!plainObject(input)) invalid('Fee must be a JSON object.');
  const allowed = new Set(['feeName', 'category', 'courseIds', 'version', ...pricingFields]);
  for (const key of Object.keys(input)) if (!allowed.has(key)) invalid(`Unsupported fee field: ${key}.`);
  const source = current ? { ...current, ...input } : input;
  if (!Array.isArray(source.courseIds) || !source.courseIds.length || source.courseIds.length > 1000 || source.courseIds.some(id => typeof id !== 'string' || !id || id.length > 200) || new Set(source.courseIds).size !== source.courseIds.length) invalid('Select one or more different existing courses.');
  return { feeName: text(source.feeName, 'Fee name', true), category: text(source.category, 'Fee category'), ...validatePricing(source), courseIds: [...source.courseIds] };
}

export function requireVersion(input) {
  if (!plainObject(input) || !Number.isSafeInteger(input.version) || input.version < 1) throw new ApplicationError(409, 'VERSION_REQUIRED', 'Reload the course and include its current version before saving.');
  return input.version;
}
