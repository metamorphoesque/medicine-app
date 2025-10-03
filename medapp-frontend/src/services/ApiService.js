
// src/apiService.js
const API_BASE = process.env.backend-eugy.onrender.com || "http://localhost:5000";

const ApiService = {
  getMedicines: async ({ page, limit, search, category }) => {
    const params = new URLSearchParams({
      page,
      limit,
      search,
      category,
    });

    const response = await fetch(`${API_BASE}/api/medicines?${params}`);
    if (!response.ok) throw new Error("Failed to fetch medicines");
    return response.json();
  },
};

export default ApiService;
