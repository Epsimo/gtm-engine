export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  code?: string;
  requestId?: string;
}

export interface ApiClientConfig {
  apiKey: string;
  baseUrl: string;
  adminKey?: string;
  epsimoToken?: string;
}

export class ApiClient {
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  public async request<T = any>(
    method: string,
    endpoint: string,
    body?: any,
    options: { extraHeaders?: Record<string, string> } = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl.replace(/\/$/, '')}/api/automation${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.config.apiKey,
      ...options.extraHeaders
    };

    if (this.config.adminKey) {
      headers['X-Admin-Key'] = this.config.adminKey;
    }

    if (this.config.epsimoToken) {
      headers['X-Epsimo-Token'] = this.config.epsimoToken;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Request failed',
          details: data.details,
          code: data.code,
          requestId: data.requestId
        };
      }

      return data as ApiResponse<T>;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  }

  public get<T = any>(endpoint: string, options?: any) {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  public post<T = any>(endpoint: string, body?: any, options?: any) {
    return this.request<T>('POST', endpoint, body, options);
  }

  public put<T = any>(endpoint: string, body?: any, options?: any) {
    return this.request<T>('PUT', endpoint, body, options);
  }

  public delete<T = any>(endpoint: string, body?: any, options?: any) {
    return this.request<T>('DELETE', endpoint, body, options);
  }
}
