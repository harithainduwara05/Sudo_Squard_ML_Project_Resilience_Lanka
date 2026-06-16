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

export const DISTRICT_DATA_DICTIONARY = {
  'Colombo':      { distRiver: 2000, hosp: 2, evac: 1, pop: 3500, cover: 0, soil: 2, ur: 0, infra: 8.5, road: 1 },
  'Gampaha':      { distRiver: 3000, hosp: 4, evac: 2, pop: 1800, cover: 0, soil: 2, ur: 0, infra: 7.5, road: 1 },
  'Kalutara':     { distRiver: 1500, hosp: 6, evac: 3, pop: 800,  cover: 2, soil: 6, ur: 2, infra: 6.0, road: 2 },
  'Kandy':        { distRiver: 500,  hosp: 5, evac: 3, pop: 700,  cover: 1, soil: 8, ur: 2, infra: 6.5, road: 2 },
  'Matale':       { distRiver: 4000, hosp: 10, evac: 5, pop: 250,  cover: 1, soil: 5, ur: 1, infra: 5.0, road: 3 },
  'Nuwara Eliya': { distRiver: 3500, hosp: 12, evac: 6, pop: 400,  cover: 1, soil: 8, ur: 1, infra: 4.5, road: 3 },
  'Galle':        { distRiver: 2500, hosp: 5, evac: 3, pop: 650,  cover: 0, soil: 6, ur: 0, infra: 7.0, road: 1 },
  'Matara':       { distRiver: 1000, hosp: 6, evac: 3, pop: 600,  cover: 2, soil: 6, ur: 2, infra: 6.5, road: 2 },
  'Hambantota':   { distRiver: 5000, hosp: 8, evac: 4, pop: 250,  cover: 3, soil: 1, ur: 1, infra: 6.0, road: 2 },
  'Jaffna':       { distRiver: 10000, hosp: 6, evac: 4, pop: 600,  cover: 0, soil: 1, ur: 0, infra: 6.5, road: 2 },
  'Kilinochchi':  { distRiver: 8000, hosp: 15, evac: 8, pop: 100,  cover: 4, soil: 1, ur: 1, infra: 4.0, road: 4 },
  'Mannar':       { distRiver: 12000, hosp: 12, evac: 6, pop: 50,   cover: 4, soil: 1, ur: 1, infra: 4.0, road: 4 },
  'Mullaitivu':   { distRiver: 9000, hosp: 18, evac: 9, pop: 40,   cover: 1, soil: 1, ur: 1, infra: 3.5, road: 4 },
  'Vavuniya':     { distRiver: 7000, hosp: 10, evac: 5, pop: 100,  cover: 2, soil: 1, ur: 1, infra: 5.0, road: 3 },
  'Trincomalee':  { distRiver: 2000, hosp: 8, evac: 4, pop: 150,  cover: 2, soil: 1, ur: 2, infra: 5.5, road: 3 },
  'Batticaloa':   { distRiver: 1500, hosp: 7, evac: 4, pop: 200,  cover: 2, soil: 1, ur: 2, infra: 5.5, road: 3 },
  'Ampara':       { distRiver: 3000, hosp: 12, evac: 6, pop: 150,  cover: 2, soil: 1, ur: 1, infra: 5.0, road: 3 },
  'Puttalam':     { distRiver: 6000, hosp: 10, evac: 5, pop: 250,  cover: 3, soil: 1, ur: 1, infra: 5.5, road: 3 },
  'Kurunegala':   { distRiver: 5000, hosp: 8, evac: 4, pop: 350,  cover: 2, soil: 7, ur: 2, infra: 6.0, road: 2 },
  'Anuradhapura': { distRiver: 4000, hosp: 12, evac: 6, pop: 120,  cover: 2, soil: 7, ur: 1, infra: 5.0, road: 3 },
  'Polonnaruwa':  { distRiver: 2500, hosp: 10, evac: 5, pop: 120,  cover: 2, soil: 6, ur: 1, infra: 5.0, road: 3 },
  'Badulla':      { distRiver: 3000, hosp: 10, evac: 5, pop: 300,  cover: 1, soil: 5, ur: 2, infra: 5.5, road: 3 },
  'Moneragala':   { distRiver: 6000, hosp: 15, evac: 8, pop: 80,   cover: 2, soil: 5, ur: 1, infra: 4.5, road: 4 },
  'Ratnapura':    { distRiver: 800,  hosp: 8, evac: 4, pop: 350,  cover: 1, soil: 6, ur: 2, infra: 5.5, road: 3 },
  'Kegalle':      { distRiver: 1200, hosp: 7, evac: 4, pop: 500,  cover: 2, soil: 5, ur: 2, infra: 6.0, road: 2 },
};

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
