import { PaymentType, PaymentTypeValue } from '@/lib/payment';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:5256' : '/api');
//const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.2:5256';

interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  isFormData?: boolean;
}

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, isFormData = false } = options;
    const token = this.getToken();

    const config: RequestInit = {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
    };

    if (body) {
      config.body = isFormData ? body : JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/';
      throw new Error('Session expired. Please sign in again.');
    }

    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.detail || errorData.title || `Error ${response.status}`);
      }

      const errorText = await response.text().catch(() => '');
      throw new Error(errorText || `Error ${response.status}`);
    }

    if (response.status === 204) return {} as T;

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }
    if (
      contentType?.includes('application/pdf') ||
      contentType?.includes('application/octet-stream') ||
      contentType?.includes('application/zip')
    ) {
      return response.blob() as any;
    }
    return response.text() as any;
  }

  // Auth
  async login(credentials: { username: string; password: string }) {
    return this.request<AuthResponse>('/Auth/login', {
      method: 'POST',
      body: credentials,
    });
  }

  async register(data: RegisterRequest) {
    return this.request<AuthResponse>('/Auth/register', {
      method: 'POST',
      body: data,
    });
  }

  // Payment Requests
  async getPaymentRequests() {
    return this.request<PaymentRequest[]>('/PaymentRequests');
  }

  async getPaymentRequest(id: string) {
    return this.request<PaymentRequest>(`/PaymentRequests/${id}`);
  }

  async createPaymentRequest(data: CreatePaymentRequest) {
    return this.request<PaymentRequest>('/PaymentRequests', {
      method: 'POST',
      body: data,
    });
  }

  // CEO Actions
  async approveRequest(data: { paymentRequestId: string; status: 'Approved' | 'Rejected'; comment?: string }) {
    return this.request<PaymentRequest>('/PaymentRequests/approve', {
      method: 'POST',
      body: data,
    });
  }

  // Finance Actions
  async processPayment(id: string, data: { companyName?: string; recipientName?: string; recipientAddress?: string; recipientTelephone?: string } = {}) {
    return this.request<PaymentRequest>(`/PaymentRequests/${id}/process`, {
      method: 'POST',
      body: data,
    });
  }

  // Attachments
  async uploadAttachment(id: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<any>(`/PaymentRequests/${id}/attachments`, {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  }

  async downloadAttachment(requestId: string, attachmentId: string): Promise<Blob> {
    return this.request<Blob>(`/PaymentRequests/${requestId}/attachments/${attachmentId}`);
  }

  // Documents
  async downloadDocument(id: string): Promise<Blob> {
    return this.request<Blob>(`/PaymentRequests/${id}/document`);
  }

  async downloadArchive(id: string): Promise<Blob> {
    return this.request<Blob>(`/PaymentRequests/${id}/document/archive`);
  }

  async verifyDocument(params: { documentNumber?: string; verificationCode?: string }) {
    const searchParams = new URLSearchParams();
    if (params.documentNumber) searchParams.set('documentNumber', params.documentNumber);
    if (params.verificationCode) searchParams.set('verificationCode', params.verificationCode);
    return this.request<DocumentVerification>(`/PaymentRequests/documents/verify?${searchParams.toString()}`);
  }

  // Audit Logs
  async getAuditLogs(filters?: AuditLogFilters) {
    const searchParams = new URLSearchParams();
    if (filters?.paymentRequestId) searchParams.set('PaymentRequestId', filters.paymentRequestId);
    if (filters?.userId) searchParams.set('UserId', filters.userId);
    if (filters?.action) searchParams.set('Action', filters.action);
    if (filters?.fromUtc) searchParams.set('FromUtc', filters.fromUtc);
    if (filters?.toUtc) searchParams.set('ToUtc', filters.toUtc);
    const query = searchParams.toString();
    return this.request<AuditLog[]>(`/PaymentRequests/audit-logs${query ? `?${query}` : ''}`);
  }

  async getRequestAuditLogs(id: string) {
    return this.request<AuditLog[]>(`/PaymentRequests/${id}/audit-logs`);
  }
}

// Types
export interface AuthUser {
  id?: string;
  username: string;
  fullName?: string;
  department?: string;
  role: 'User' | 'CEO' | 'Finance' | 'HeadOfFinance';
  email?: string;
}

export interface AuthResponse {
  token: string;
  expiresAtUtc: string;
  username: string;
  email?: string;
  fullName?: string;
  department?: string;
  role: 'User' | 'CEO' | 'Finance' | 'HeadOfFinance';
}

export interface RegisterRequest {
  fullName: string;
  department: string;
  username: string;
  email: string;
  password: string;
  role: 'User' | 'CEO' | 'Finance' | 'HeadOfFinance';
}

export interface PaymentRequest {
  id: string;
  title: string;
  description: string;
  amount: number;
  vatAmount: number;
  whtAmount: number;
  currency: string;
  deadline?: string;
  paymentType?: PaymentTypeValue;
  status: 'Pending' | 'CEOApproved' | 'FinancePrepared' | 'FinanceAuthorized' | 'Approved' | 'Rejected';
  createdAt: string;
  updatedAt: string;
  requesterId: string;
  requesterName: string;
  requesterDepartment?: string;
  companyName?: string;
  recipientName?: string;
  recipientAddress?: string;
  recipientTelephone?: string;
  ceoComment?: string;
  approvedByUserId?: number;
  approvedByUserName?: string;
  approvedAt?: string;
  preparedByUserId?: number;
  preparedByUserName?: string;
  preparedAt?: string;
  authorizedByUserId?: number;
  authorizedByUserName?: string;
  authorizedAt?: string;
  documentNumber?: string;
  verificationCode?: string;
  attachments?: Attachment[];
}

export interface CreatePaymentRequest {
  title: string;
  description: string;
  amount: number;
  vatAmount: number;
  whtAmount: number;
  currency: string;
  deadline: string;
  paymentType: PaymentType;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface AuditLog {
  id: string;
  paymentRequestId: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface AuditLogFilters {
  paymentRequestId?: string;
  userId?: string;
  action?: string;
  fromUtc?: string;
  toUtc?: string;
}

export interface DocumentVerification {
  isValid: boolean;
  documentNumber: string;
  paymentRequestTitle: string;
  amount: number;
  status: string;
  verifiedAt: string;
}

export const api = new ApiClient();
