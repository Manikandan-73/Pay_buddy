/**
 * Request Validation Middleware Helper
 */

const { AppError } = require('./errorHandler');

/**
 * Validates request body fields against rules
 * rules: { fieldName: { required: true, type: 'string'|'number', min: 1, validator: fn } }
 */
function validateBody(rules) {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = req.body[field];

      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push({ field, message: `${field} is required` });
        continue;
      }

      if (value !== undefined && value !== null) {
        if (rule.type && typeof value !== rule.type) {
          errors.push({ field, message: `${field} must be of type ${rule.type}` });
        }
        if (rule.minLength && String(value).length < rule.minLength) {
          errors.push({ field, message: `${field} must be at least ${rule.minLength} characters` });
        }
        if (rule.pattern && !rule.pattern.test(String(value))) {
          errors.push({ field, message: rule.patternMessage || `${field} format is invalid` });
        }
        if (rule.custom) {
          const customError = rule.custom(value, req.body);
          if (customError) {
            errors.push({ field, message: customError });
          }
        }
      }
    }

    if (errors.length > 0) {
      return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors));
    }

    next();
  };
}

module.exports = {
  validateBody
};
