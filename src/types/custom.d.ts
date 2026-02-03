// ═══════════════════════════════════════════════════════════════
// 🔐 ROLES
// ═══════════════════════════════════════════════════════════════

export type Role = 'admin' | 'user';

// ═══════════════════════════════════════════════════════════════
// 🔐 TOKEN PAYLOAD
// ═══════════════════════════════════════════════════════════════

export interface TokenPayload {
  id: string;
  name: string;
  role: Role;
  iat?: number;
  exp?: number;
}

// ═══════════════════════════════════════════════════════════════
// 📱 APP USER (Alias for TokenPayload)
// ═══════════════════════════════════════════════════════════════

export type AppUser = TokenPayload;

// ═══════════════════════════════════════════════════════════════
// 🔄 EXPRESS EXTENSION
// ═══════════════════════════════════════════════════════════════

declare global {
  namespace Express {
    interface Request {
      user?: AppUser;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 👤 USER MODEL
// ═══════════════════════════════════════════════════════════════

export interface IUser {
  id: number;
  name: string;
  email: string;
  password: string;
  role: Role | null;
  isActive: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

// ═══════════════════════════════════════════════════════════════
// 📦 ORDER TYPES
// ═══════════════════════════════════════════════════════════════

export type Currency = 'USD' | 'EUR' | 'SAR' | 'AED' | 'EGP' | 'SDG' | 'INR';
export type PaymentMethod = 'تحويل بنكي' | 'بطاقة' | 'كاش';
export type OrderStatus = 'مكتمل' | 'قيد الانتظار' | 'مرفوض' | 'ملغي';

// ═══════════════════════════════════════════════════════════════
// 👤 SENDER & RECIPIENT
// ═══════════════════════════════════════════════════════════════

export interface ISender {
  name: string;
  address: string;
  phone: string;
}

export interface IRecipient {
  name: string;
  accountNumber: string;
  phone: string;
}

// ═══════════════════════════════════════════════════════════════
// 📦 ORDER MODEL
// ═══════════════════════════════════════════════════════════════

export interface IOrder {
  id: number;
  orderNumber: string | null;
  fromCurrency: Currency;
  toCurrency: Currency | null;
  amount: string;
  convertedAmount: string;
  exchangeRate: string;
  senderName: string;
  senderAddress: string;
  senderPhone: string;
  recipientName: string;
  recipientAccountNumber: string;
  recipientPhone: string;
  receiptImage: string | null;
  status: OrderStatus | null;
  createdBy: number | null;
  date: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

// ═══════════════════════════════════════════════════════════════
// 💱 EXCHANGE RATE TYPES
// ═══════════════════════════════════════════════════════════════

export type RateStatus = 'مكتمل' | 'متوقف';

export interface IExchangeRate {
  id: number;
  currency: Currency;
  currencyName: string;
  baseCurrency: Currency | null;
  buyPrice: string;
  sellPrice: string;
  status: RateStatus | null;
  lastUpdated: Date | null;
  updatedBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

// ═══════════════════════════════════════════════════════════════
// 📊 API RESPONSE
// ═══════════════════════════════════════════════════════════════

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: number;
    message: string;
    details?: any;
  };
}

// ═══════════════════════════════════════════════════════════════
// 📈 DASHBOARD STATS
// ═══════════════════════════════════════════════════════════════

export interface DashboardStats {
  completedOrders: number;
  pendingOrders: number;
  rejectedOrders: number;
  cancelledOrders: number;
  totalAmount: number;
}
