export interface SettingsRecord {
  appName: string;
  merchantDisplayName: string;
  baseUrl: string;
  defaultCurrency: string;
  allowedPaymentMethods: string[];
  moneiApiKey: string;
  moneiAccountId: string;
  callbackPath: string;
  completeUrl: string;
  failUrl: string;
  cancelUrl: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  smtpFromName: string;
  notificationDefaultEmail: string;
  emailSubjectTemplate: string;
  emailBodyTemplate: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = "superadmin" | "user";

export interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  canViewAllPayments: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSummary extends UserRecord {
  paylinksCount: number;
}

export interface PaginatedUsersResult {
  items: UserSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MoneiCheckoutSnapshot {
  accountId: string;
  merchantName: string;
  countryCode: string;
  currency: string;
  paymentMethods: string[];
}

export interface PaylinkRecord {
  id: string;
  ownerUserId: string;
  ownerDisplayName: string;
  ownerUsername: string;
  orderId: string;
  title: string;
  description: string;
  amountCents: number;
  currency: string;
  recipientEmail: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  allowedPaymentMethods: string[];
  checkoutUrl: string;
  moneiPaymentId: string;
  moneiStatus: string;
  moneiStatusCode: string;
  paymentUrl: string;
  nextActionType: string;
  lastPayload: string;
  notificationSentAt: string;
  notificationRecipients: string[];
  notificationError: string;
  paidAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedPaylinksResult {
  items: PaylinkRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  query: string;
}
