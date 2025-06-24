// documentSanitizer.js

/**
 * Sanitizes MongoDB documents for MeiliSearch indexing
 * Handles nested objects, arrays, and problematic data types
 */

class DocumentSanitizer {
    constructor(options = {}) {
      this.options = {
        maxDepth: options.maxDepth || 3,
        flattenArrays: options.flattenArrays !== false,
        removeEmpty: options.removeEmpty !== false,
        primaryKeyField: options.primaryKeyField || '_id',
        ...options
      };
    }
  
    /**
     * Sanitize a single document for MeiliSearch
     */
    sanitizeDocument(doc, currentDepth = 0) {
      if (!doc || typeof doc !== 'object') return doc;
      
      // Handle arrays
      if (Array.isArray(doc)) {
        return this.sanitizeArray(doc, currentDepth);
      }
  
      const sanitized = {};
      
      for (const [key, value] of Object.entries(doc)) {
        // Skip MongoDB ObjectId conversion for nested objects
        if (key === '_id' && value?.toString) {
          sanitized.id = value.toString();
          continue;
        }
  
        const cleanKey = this.sanitizeKey(key);
        const cleanValue = this.sanitizeValue(value, currentDepth);
        
        // Skip empty values if option is set
        if (this.options.removeEmpty && this.isEmpty(cleanValue)) {
          continue;
        }
        
        sanitized[cleanKey] = cleanValue;
      }
  
      return sanitized;
    }
  
    /**
     * Sanitize array values
     */
    sanitizeArray(arr, currentDepth = 0) {
      if (!Array.isArray(arr)) return arr;
      
      return arr
        .map(item => this.sanitizeValue(item, currentDepth))
        .filter(item => !this.options.removeEmpty || !this.isEmpty(item));
    }
  
    /**
     * Sanitize individual values based on type
     */
    sanitizeValue(value, currentDepth = 0) {
      if (value === null || value === undefined) {
        return null;
      }
  
      // Handle primitive types
      if (typeof value !== 'object') {
        return this.sanitizePrimitive(value);
      }
  
      // Handle Date objects
      if (value instanceof Date) {
        return value.toISOString();
      }
  
      // Handle MongoDB ObjectId
      if (value.toString && typeof value.toString === 'function' && value._bsontype === 'ObjectID') {
        return value.toString();
      }
  
      // Prevent deep nesting
      if (currentDepth >= this.options.maxDepth) {
        return this.flattenDeepObject(value);
      }
  
      // Handle arrays
      if (Array.isArray(value)) {
        return this.sanitizeArray(value, currentDepth + 1);
      }
  
      // Handle nested objects
      return this.sanitizeDocument(value, currentDepth + 1);
    }
  
    /**
     * Sanitize primitive values
     */
    sanitizePrimitive(value) {
      // Convert numeric strings to numbers if they're valid
      if (typeof value === 'string' && /^\d+\.?\d*$/.test(value)) {
        const num = parseFloat(value);
        return isNaN(num) ? value : num;
      }
  
      // Ensure strings are properly encoded
      if (typeof value === 'string') {
        return value.trim();
      }
  
      return value;
    }
  
    /**
     * Sanitize object keys (remove invalid characters)
     */
    sanitizeKey(key) {
      return key
        .replace(/[^\w\.-]/g, '_') // Replace invalid chars with underscore
        .replace(/^_+|_+$/g, '')   // Remove leading/trailing underscores
        .replace(/_+/g, '_');      // Replace multiple underscores with single
    }
  
    /**
     * Flatten deeply nested objects to prevent MeiliSearch issues
     */
    flattenDeepObject(obj) {
      if (!obj || typeof obj !== 'object') return obj;
      
      const flattened = {};
      
      const flatten = (current, prefix = '') => {
        for (const [key, value] of Object.entries(current)) {
          const newKey = prefix ? `${prefix}_${key}` : key;
          
          if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            flatten(value, newKey);
          } else {
            flattened[newKey] = this.sanitizeValue(value, 0);
          }
        }
      };
      
      flatten(obj);
      return flattened;
    }
  
    /**
     * Check if a value is empty
     */
    isEmpty(value) {
      if (value === null || value === undefined || value === '') return true;
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === 'object') return Object.keys(value).length === 0;
      return false;
    }
  
    /**
     * Process multiple documents
     */
    sanitizeDocuments(documents) {
      if (!Array.isArray(documents)) {
        throw new Error('Documents must be an array');
      }
  
      return documents.map(doc => this.sanitizeDocument(doc));
    }
  
    /**
     * Specific sanitizer for your service documents
     */
    sanitizeServiceDocument(doc) {
      const { _id, location, availability, coordinates, ...rest } = doc;
      
      const sanitized = {
        id: _id?.toString() || rest.id || rest.serviceId,
        ...rest
      };
  
      // Handle location with special care
      if (location) {
        sanitized.location = {
          city: location.city,
          state: location.state,
          country: location.country
        };
  
        // Extract coordinates safely
        if (location.coordinates) {
          sanitized.location.lat = location.coordinates.lat;
          sanitized.location.lng = location.coordinates.lng;
          
          // If coordinates is a GeoJSON, extract from coordinates array
          if (location.coordinates.coordinates && Array.isArray(location.coordinates.coordinates)) {
            const [lng, lat] = location.coordinates.coordinates;
            sanitized.location.lat = lat;
            sanitized.location.lng = lng;
          }
        }
      }
  
      // Handle availability
      if (availability) {
        sanitized.availability = {
          days: Array.isArray(availability.days) ? availability.days : [],
          timeSlots: Array.isArray(availability.timeSlots) ? availability.timeSlots : []
        };
      }
  
      // Ensure arrays are properly handled
      if (sanitized.tags && Array.isArray(sanitized.tags)) {
        sanitized.tags = sanitized.tags.filter(tag => tag && typeof tag === 'string');
      }
  
      if (sanitized.images && Array.isArray(sanitized.images)) {
        sanitized.images = sanitized.images.filter(img => img && typeof img === 'string');
      }
  
      // Ensure proper data types
      if (sanitized.price) {
        sanitized.price = typeof sanitized.price === 'string' ? parseFloat(sanitized.price) : sanitized.price;
      }
  
      if (sanitized.createdAt) {
        sanitized.createdAt = sanitized.createdAt instanceof Date 
          ? sanitized.createdAt.toISOString() 
          : sanitized.createdAt;
      }
  
      return this.sanitizeDocument(sanitized);
    }
  }
  
  // Usage examples and utility functions
  const sanitizer = new DocumentSanitizer({
    maxDepth: 3,
    removeEmpty: true,
    flattenArrays: true
  });
  
  /**
   * Quick utility function for services
   */
  function sanitizeServicesForMeiliSearch(mongoDocuments) {
    const sanitizer = new DocumentSanitizer();
    return mongoDocuments.map(doc => sanitizer.sanitizeServiceDocument(doc));
  }
  
  /**
   * Test function to validate sanitized documents
   */
  function validateMeiliSearchDocument(doc) {
    const issues = [];
    
    // Check for required id field
    if (!doc.id) {
      issues.push('Missing required "id" field');
    }
    
    // Check for deeply nested objects
    const checkDepth = (obj, currentDepth = 0, path = '') => {
      if (currentDepth > 3) {
        issues.push(`Object too deeply nested at path: ${path}`);
        return;
      }
      
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        for (const [key, value] of Object.entries(obj)) {
          checkDepth(value, currentDepth + 1, path ? `${path}.${key}` : key);
        }
      }
    };
    
    checkDepth(doc);
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
  
  module.exports = {
    DocumentSanitizer,
    sanitizeServicesForMeiliSearch,
    validateMeiliSearchDocument
  };