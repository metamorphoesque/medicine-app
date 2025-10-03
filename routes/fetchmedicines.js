const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";


// Map frontend category slugs to backend category slugs
const categorySlugMapping = {
  'heart-blood-pressure-care': 'heart-blood-pressure',
  'diabetes-care': 'diabetes-care',
  'respiratory-care': 'respiratory-care',
  'mental-neurological-care': 'mental-health',
  'digestive-care': 'digestive-health',
  'allergy-care': 'respiratory-care', // Allergy is part of respiratory care
  'dental-care': 'dental-care',
  'eye-care': 'eye-ear-care',
  'ear-care': 'eye-ear-care',
  'dermal-care': 'skin-care',
  'baby-care': 'baby-care'
};

class ApiService {
  static async get(endpoint, params = {}) {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        url.searchParams.append(key, params[key]);
      }
    });

    console.log('API Request:', url.toString());

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  static async post(endpoint, data = {}) {
    console.log('API POST Request:', `${API_BASE_URL}${endpoint}`, data);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log('API Response:', result);
      return result;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Medicine-related API calls
  static async getMedicines(params = {}) {
    const { search, page = 1, limit = 20, category } = params;
    const backendCategory = category ? categorySlugMapping[category] || category : null;

    return this.get('/api/medicines', {
      search,
      page,
      limit,
      category: backendCategory
    });
  }

  static async getMedicineById(id) {
    return this.get(`/api/medicines/${id}`);
  }

  static async getCategories() {
    return this.get('/api/categories');
  }

  static async getCategoryButtons() {
    return this.get('/api/category-buttons');
  }

  // Healthcare-related API calls
  static async getHealthcareFacilities(params = {}) {
    const { type } = params;
    return this.get('/api/healthcare', { type });
  }

  static async getNearbyHealthcare(params = {}) {
    const { lat, lng, radius = 50, type } = params;
    return this.get('/api/healthcare/nearby', { lat, lng, radius, type });
  }

  static async getHealthcareByState(params = {}) {
    const { state, type, limit = 20 } = params;
    return this.get('/api/healthcare/byState', { state, type, limit });
  }

  static async getHealthcareDebug() {
    return this.get('/api/healthcare/debug');
  }

  // User-related API calls
  static async register(userData) {
    return this.post('/api/register', userData);
  }

  static async login(credentials) {
    return this.post('/api/login', credentials);
  }

  // Cart-related API calls
  static async addToCart(cartItem) {
    return this.post('/api/cart', cartItem);
  }

  static async getCart(userId) {
    return this.get(`/api/cart/${userId}`);
  }

  // Seller-related API calls
  static async getSellers() {
    return this.get('/api/sellers');
  }

  static async getSellerMedicines(params = {}) {
    return this.get('/api/seller-medicines', params);
  }
}

export default ApiService;
