export type OrderStatus = 'PENDING' | 'WAITING_APPROVAL' | 'COMPLETED' | 'REJECTED' | 'REFUNDED';
export type PaymentStatus = 'PENDING' | 'WAITING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface CheckoutInfo {
  bankName: string;
  accountName: string;
  accountNumber: string;
  qrImageUrl: string;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  totalTHB: number;
  createdAt: string;
  orderItems: OrderItem[];
  payment?: Payment;
  checkoutInfo?: CheckoutInfo;
}

export interface OrderItem {
  id: string;
  productId: string;
  priceTHB: number;
  product?: { title: string; productType: string };
}

export interface Payment {
  id: string;
  orderId: string;
  amountTHB: number;
  status: PaymentStatus;
  transferredAt?: string;
  note?: string;
  slipUrl?: string;
}

export interface PendingOrder extends Order {
  user: { id: string; email: string; displayName: string };
  payment: Payment & { slipUrl: string | null };
}
