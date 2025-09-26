
const API_BASE = "http://localhost:5000"; // backend server URL

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
