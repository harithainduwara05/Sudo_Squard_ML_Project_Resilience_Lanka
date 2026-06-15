// District names indexed by ID
export const DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale',
  'Nuwara Eliya', 'Galle', 'Matara', 'Hambantota', 'Jaffna',
  'Kilinochchi', 'Mannar', 'Mullaitivu', 'Vavuniya', 'Trincomalee',
  'Batticaloa', 'Ampara', 'Puttalam', 'Kurunegala', 'Anuradhapura',
  'Polonnaruwa', 'Badulla', 'Moneragala', 'Ratnapura', 'Kegalle'
];

export const LANDCOVER_TYPES = [
  'Urban', 'Forest', 'Agriculture', 'Wetland', 'Barren',
  'Water', 'Grassland', 'Shrubland', 'Mangrove', 'Plantation', 'Mixed'
];

export const SOIL_TYPES = [
  'Clay', 'Sandy', 'Loam', 'Silt', 'Peat',
  'Laterite', 'Alluvial', 'Red Earth', 'Gravel', 'Rocky', 'Mixed'
];

export const WATER_SUPPLY = ['Pipe', 'Well', 'River', 'Tank', 'Rainwater', 'Other'];

export const ELECTRICITY = ['Grid', 'Solar', 'Generator', 'None', 'Mixed', 'Other'];

export const ROAD_QUALITY = ['Excellent', 'Good', 'Fair', 'Poor', 'Very Poor', 'No Road'];

export const URBAN_RURAL = ['Urban', 'Rural', 'Semi-Urban'];

/**
 * Returns risk level info based on a score (0-1)
 */
export function getRiskLevel(score) {
  if (score >= 0.8) {
    return {
      level: 'CRITICAL',
      color: '#dc2626',
      bgColor: 'rgba(220, 38, 38, 0.15)',
      textColor: '#fca5a5',
    };
  }
  if (score >= 0.6) {
    return {
      level: 'HIGH',
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.15)',
      textColor: '#fca5a5',
    };
  }
  if (score >= 0.3) {
    return {
      level: 'MEDIUM',
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.15)',
      textColor: '#fde68a',
    };
  }
  return {
    level: 'LOW',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    textColor: '#6ee7b7',
  };
}
