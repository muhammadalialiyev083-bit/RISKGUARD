import type { User } from '../types';

const API_BASE = '/api/v1';
let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

function errorMessage(data: unknown, status: number): string {
  if (data && typeof data === 'object') {
    const messages = Object.entries(data).map(([key, value]) => {
      const message = Array.isArray(value) ? value.join(', ') : String(value);
      return ['detail', 'non_field_errors'].includes(key) ? message : `${key}: ${message}`;
    });
    if (messages.length) return messages.join('\n');
  }
  return status >= 500
    ? 'Server vaqtincha ishlamayapti. Birozdan keyin qayta urinib ko‘ring.'
    : `Server xatosi: ${status}`;
}

async function fetchResponse(url: string, options: RequestInit): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch {
    throw new Error('Server bilan bog‘lanib bo‘lmadi. Internet aloqasini tekshirib, qayta urinib ko‘ring.');
  }
}

async function readJSON(response: Response): Promise<any> {
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(errorMessage(data, response.status), response.status);
  if (!data || typeof data !== 'object') {
    throw new Error('Serverdan kutilmagan javob olindi. Iltimos, keyinroq qayta urinib ko‘ring.');
  }
  return data;
}

async function getCSRFToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = (async () => {
      const response = await fetchResponse(`${API_BASE}/auth/csrf`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await readJSON(response);
      if (typeof data.csrfToken !== 'string' || !data.csrfToken) {
        throw new Error('Kirish uchun xavfsizlik tokeni olinmadi. Qayta urinib ko‘ring.');
      }
      csrfToken = data.csrfToken;
      return csrfToken!;
    })().finally(() => { csrfRequest = null; });
  }
  return csrfRequest;
}

async function request<T>(endpoint: string, options: RequestInit = {}, retryCSRF = true): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  const method = (options.method || 'GET').toUpperCase();
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (mutating) {
    headers.set('X-CSRFToken', await getCSRFToken());
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
    cache: 'no-store',
  };

  const response = await fetchResponse(`${API_BASE}${endpoint}`, config);

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    // A CSRF rejection happens before the action runs, so one retry is safe.
    // This also recovers when another tab rotated the session's token.
    if (mutating && retryCSRF && response.status === 403 &&
        typeof data?.detail === 'string' && data.detail.startsWith('CSRF Failed:')) {
      csrfToken = null;
      return request<T>(endpoint, options, false);
    }
    throw new ApiError(errorMessage(data, response.status), response.status);
  }

  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return readJSON(response);
  }
  throw new Error('Serverdan kutilmagan javob olindi. Iltimos, keyinroq qayta urinib ko‘ring.');
}

export const api = {
  // Auth: token fields verified against the retained deployed JS bundle.
  login: async (credentials: { username: string; password: string }) => {
    const result = await request<{ message: string; user: User; csrfToken?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    // Django rotates CSRF on login. Older servers may omit the new token.
    csrfToken = result.csrfToken || null;
    return result;
  },
  logout: async () => {
    const result = await request<{ message: string; csrfToken?: string }>('/auth/logout', { method: 'POST' });
    csrfToken = result.csrfToken || null;
    return result;
  },
  getMe: () => request<User>('/auth/me'),

  // Dashboard
  getDashboard: () => request<{ organization: string; summary: any }>('/reports/organization'),

  // Processes & Assets
  getProcesses: () => request<{ results: any[] }>('/processes/'),
  createProcess: (data: any) => request<any>('/processes/', { method: 'POST', body: JSON.stringify(data) }),
  getAssets: () => request<{ results: any[] }>('/assets/'),
  getDependencies: () => request<{ results: any[] }>('/dependencies/'),

  // BIA
  getBIA: () => request<{ results: any[] }>('/bia/'),
  createBIA: (data: any) => request<any>('/bia/', { method: 'POST', body: JSON.stringify(data) }),
  approveBIA: (id: number) => request<any>(`/bia/${id}/approve/`, { method: 'POST' }),

  // Risks
  getRisks: () => request<{ results: any[] }>('/risks/'),
  createRisk: (data: any) => request<any>('/risks/', { method: 'POST', body: JSON.stringify(data) }),

  // Calculation Engine
  getPriorityAnalysis: (processId?: number) =>
    request<any>('/analyses/priority', {
      method: 'POST',
      body: JSON.stringify(processId ? { process_id: processId } : {}),
    }),
  evaluateRiskAlgo: (data: any) =>
    request<any>('/analyses/evaluate-risk', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  evaluateStrategy: (data: any) =>
    request<any>('/analyses/evaluate-strategy', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Scenarios & Simulation
  getScenarios: () => request<{ results: any[] }>('/scenarios/'),
  runSimulation: (scenarioId: number) =>
    request<any>(`/scenarios/${scenarioId}/simulate/`, { method: 'POST' }),

  // Plans
  getPlans: () => request<{ results: any[] }>('/plans/'),
  publishPlan: (id: number) => request<any>(`/plans/${id}/publish/`, { method: 'POST' }),

  // Audit Logs
  getAuditLogs: () => request<{ results: any[] }>('/audit-logs/'),
};
