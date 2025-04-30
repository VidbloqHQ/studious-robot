// API Client for HTTP requests with automatic auth header injection
export class ApiClient {
    private apiKey: string;
    private apiSecret: string;
    private baseUrl: string;
  
    constructor(apiKey: string, apiSecret: string, baseUrl: string) {
      this.apiKey = apiKey;
      this.apiSecret = apiSecret;
      this.baseUrl = baseUrl;
    }
  
    // Helper for GET requests
    async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
      const url = new URL(this.baseUrl + endpoint);
  
      // Add query parameters if provided
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }
  
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: this.getHeaders(),
      });
  
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${await response.text()}`);
      }
  
      return response.json() as Promise<T>;
    }
  
    // Helper for POST requests
    async post<T>(endpoint: string, data: unknown): Promise<T> {
      const response = await fetch(this.baseUrl + endpoint, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
  
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${await response.text()}`);
      }
  
      return response.json() as Promise<T>;
    }
  
    // Helper for PUT requests
    async put<T>(endpoint: string, data: unknown): Promise<T> {
      const response = await fetch(this.baseUrl + endpoint, {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
  
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${await response.text()}`);
      }
  
      return response.json() as Promise<T>;
    }
  
    // Helper for DELETE requests
    async delete<T>(endpoint: string): Promise<T> {
      const response = await fetch(this.baseUrl + endpoint, {
        method: "DELETE",
        headers: this.getHeaders(),
      });
  
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${await response.text()}`);
      }
  
      return response.json() as Promise<T>;
    }
  
    // Get headers with auth credentials
    private getHeaders(): HeadersInit {
      return {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "x-api-secret": this.apiSecret,
      };
    }
  }