/**
 * Input sanitization utilities to prevent XSS and SQL injection attacks
 */

/**
 * Sanitizes HTML content to prevent XSS attacks
 * Removes dangerous HTML tags and attributes
 */
export function sanitizeHTML(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitizes user input for database operations
 * Removes SQL injection attempts and limits input length
 */
export function sanitizeInput(input: string, maxLength: number = 255): string {
  if (typeof input !== 'string') return '';
  
  // Trim whitespace
  const sanitized = input.trim();
  
  // Limit length
  let result = sanitized;
  if (result.length > maxLength) {
    result = result.substring(0, maxLength);
  }
  
  // Remove null bytes and other control characters
  result = result.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Remove SQL keywords and patterns that could be used for injection
  const sqlPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|vbscript|onload|onerror|onclick)\b)/gi,
    /(--|\/\*|\*\/|;|'|"|`)/g,
    /(\b(or|and)\b.*=.*)/gi
  ];
  
  // Apply SQL pattern replacements
  sqlPatterns.forEach(pattern => {
    result = result.replace(pattern, '');
  });
  
  return result;
}

/**
 * Validates and sanitizes email addresses
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return '';
  
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = email.trim().toLowerCase();
  
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }
  
  return sanitized;
}

/**
 * Validates and sanitizes usernames
 */
export function sanitizeUsername(username: string): string {
  if (typeof username !== 'string') return '';
  
  const sanitized = username.trim();
  
  // Username should only contain alphanumeric characters, underscores, and hyphens
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  
  if (!usernameRegex.test(sanitized)) {
    throw new Error('Username can only contain letters, numbers, underscores, and hyphens');
  }
  
  // Length validation
  if (sanitized.length < 3 || sanitized.length > 30) {
    throw new Error('Username must be between 3 and 30 characters');
  }
  
  return sanitized;
}

/**
 * Validates password strength (does not store password, only validates)
 */
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (typeof password !== 'string') {
    errors.push('Password must be a string');
    return { isValid: false, errors };
  }
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password is too long');
  }
  
  // Check for common patterns
  if (/(password|123456|qwerty|admin)/i.test(password)) {
    errors.push('Password contains common patterns');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizes text input for display purposes
 */
export function sanitizeText(input: string, maxLength: number = 500): string {
  if (typeof input !== 'string') return '';
  
  return sanitizeInput(input, maxLength);
}

/**
 * Comprehensive input validation for form data
 */
export function validateFormInput(
  fieldName: string,
  value: string,
  fieldType: 'email' | 'username' | 'password' | 'text' = 'text'
): { isValid: boolean; error?: string; sanitizedValue: string } {
  try {
    let sanitizedValue = value;
    
    switch (fieldType) {
      case 'email':
        sanitizedValue = sanitizeEmail(value);
        break;
      case 'username':
        sanitizedValue = sanitizeUsername(value);
        break;
      case 'password':
        const passwordValidation = validatePassword(value);
        if (!passwordValidation.isValid) {
          return {
            isValid: false,
            error: passwordValidation.errors[0],
            sanitizedValue: value
          };
        }
        // Don't sanitize password - just validate
        sanitizedValue = value;
        break;
      case 'text':
      default:
        sanitizedValue = sanitizeInput(value);
        break;
    }
    
    return {
      isValid: true,
      sanitizedValue
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid input',
      sanitizedValue: value
    };
  }
}