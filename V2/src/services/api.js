// API Service for database operations
const API_BASE_URL = 'http://localhost:3001/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      // Check if response is ok before parsing JSON
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          // If JSON parsing fails, create a basic error
          errorData = { 
            error: `HTTP ${response.status}: ${response.statusText}`,
            details: 'Unable to parse error response'
          };
        }
        throw new Error(errorData.error || errorData.details || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      // Handle network errors separately
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.error(`API Error (${endpoint}): Network error - Server may not be running`);
        throw new Error('Failed to connect to server. Please ensure the server is running.');
      }
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Products API
  async getProducts() {
    return this.request('/products');
  }

  async getProduct(id) {
    return this.request(`/products/${id}`);
  }

  async createProduct(productData) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  async updateProduct(id, productData) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  }

  async deleteProduct(id) {
    return this.request(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Ingredients API
  async getIngredients() {
    return this.request('/ingredients');
  }

  async getIngredient(id) {
    return this.request(`/ingredients/${id}`);
  }

  async createIngredient(ingredientData) {
    return this.request('/ingredients', {
      method: 'POST',
      body: JSON.stringify(ingredientData),
    });
  }

  async updateIngredient(id, ingredientData) {
    return this.request(`/ingredients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(ingredientData),
    });
  }

  async deleteIngredient(id) {
    return this.request(`/ingredients/${id}`, {
      method: 'DELETE',
    });
  }

  // Formulations API
  async getFormulations() {
    return this.request('/formulations');
  }

  async getFormulation(id) {
    return this.request(`/formulations/${id}`);
  }

  async getFormulationIngredients(formulationId) {
    return this.request(`/formulations/${formulationId}/ingredients`);
  }

  // History and Work Orders
  async getProductionHistory() {
    return this.request('/history');
  }

  async getWorkOrderByNumber(moNumber) {
    return this.request(`/work-orders/${encodeURIComponent(moNumber)}`);
  }

  async createFormulation(formulationData) {
    return this.request('/formulations', {
      method: 'POST',
      body: JSON.stringify(formulationData),
    });
  }

  async updateFormulation(id, formulationData) {
    return this.request(`/formulations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(formulationData),
    });
  }

  async deleteFormulation(id) {
    return this.request(`/formulations/${id}`, {
      method: 'DELETE',
    });
  }

  // Tolerance Groupings API
  async getToleranceGroupings() {
    return this.request('/tolerance-groupings');
  }

  async getToleranceGrouping(id) {
    return this.request(`/tolerance-groupings/${id}`);
  }

  async createToleranceGrouping(groupingData) {
    return this.request('/tolerance-groupings', {
      method: 'POST',
      body: JSON.stringify(groupingData),
    });
  }

  async updateToleranceGrouping(id, groupingData) {
    return this.request(`/tolerance-groupings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(groupingData),
    });
  }

  async deleteToleranceGrouping(id) {
    return this.request(`/tolerance-groupings/${id}`, {
      method: 'DELETE',
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;

