const API_BASE = '/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  
  if (!response.ok) {
    let errorMsg = `Server xatosi: ${response.status}`;
    try {
      const errData = await response.json();
      if (typeof errData === 'object' && errData !== null) {
        errorMsg = Object.entries(errData)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join('\n');
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMsg);
  }

  // Handle empty or file responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response as unknown as T;
}

export const api = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    request<{ message: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
  getMe: () => request<any>('/auth/me'),

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
