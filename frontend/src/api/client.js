import axios from 'axios';

const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Submit environmental parameters for flood risk prediction
 */
export async function predictFloodRisk(data) {
  try {
    const response = await api.post('/api/predict', data);
    return response.data;
  } catch (error) {
    console.error('Prediction API error:', error);
    throw error.response?.data || { detail: 'Failed to get prediction. Please try again.' };
  }
}

/**
 * Submit user feedback on a prediction
 */
export async function submitFeedback(data) {
  try {
    const response = await api.post('/api/feedback', data);
    return response.data;
  } catch (error) {
    console.error('Feedback API error:', error);
    throw error.response?.data || { detail: 'Failed to submit feedback.' };
  }
}

/**
 * Fetch analytics data
 */
export async function getAnalytics() {
  try {
    const response = await api.get('/api/analytics');
    return response.data;
  } catch (error) {
    console.error('Analytics API error:', error);
    throw error.response?.data || { detail: 'Failed to fetch analytics.' };
  }
}

/**
 * Fetch admin dashboard overview data
 */
export async function getAdminOverview() {
  try {
    const response = await api.get('/api/admin/overview');
    return response.data;
  } catch (error) {
    console.error('Admin overview API error:', error);
    throw error.response?.data || { detail: 'Failed to fetch admin overview.' };
  }
}

/**
 * Fetch users for admin management
 */
export async function getAdminUsers(search = '') {
  try {
    const response = await api.get('/api/admin/users', {
      params: search ? { search } : {},
    });
    return response.data;
  } catch (error) {
    console.error('Admin users API error:', error);
    throw error.response?.data || { detail: 'Failed to fetch users.' };
  }
}

/**
 * Update a user's role
 */
export async function updateAdminUserRole(userId, role) {
  try {
    const response = await api.patch(`/api/admin/users/${userId}/role`, { role });
    return response.data;
  } catch (error) {
    console.error('Admin role update API error:', error);
    throw error.response?.data || { detail: 'Failed to update user role.' };
  }
}

/**
 * Activate or deactivate a user
 */
export async function updateAdminUserStatus(userId, isActive) {
  try {
    const response = await api.patch(`/api/admin/users/${userId}/status`, {
      is_active: isActive,
    });
    return response.data;
  } catch (error) {
    console.error('Admin status update API error:', error);
    throw error.response?.data || { detail: 'Failed to update user status.' };
  }
}

// ─── Auth Interceptor ───
// Add request interceptor to include JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Auth API Functions ───

/**
 * Login user with email and password
 */
export async function loginUser(data) {
  try {
    const response = await api.post('/api/auth/login', data);
    return response.data;
  } catch (error) {
    console.error('Login API error:', error);
    throw error.response?.data || { detail: 'Login failed. Please try again.' };
  }
}

/**
 * Register a new user
 */
export async function registerUser(data) {
  try {
    const response = await api.post('/api/auth/register', data);
    return response.data;
  } catch (error) {
    console.error('Register API error:', error);
    throw error.response?.data || { detail: 'Registration failed. Please try again.' };
  }
}

/**
 * Get current authenticated user info
 */
export async function getCurrentUser() {
  try {
    const response = await api.get('/api/auth/me');
    return response.data;
  } catch (error) {
    console.error('Get user API error:', error);
    throw error.response?.data || { detail: 'Failed to get user info.' };
  }
}

export default api;
