export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  created_at: string;
}

export interface Bike {
  id: string;
  customer_id: string;
  brand: string;
  model: string;
  category: string;
  color: string;
  serial: string;
  notes: string;
}

export interface ServiceRequest {
  id: string;
  customer_id: string;
  bike_id: string;
  kind: string;
  message: string;
  status: string;
  created_at: string;
}

export interface ServiceOrder {
  id: string;
  number: number;
  customer_id: string | null;
  bike_id: string | null;
  problem: string;
  mechanic: string;
  status: string;
  total: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  min_quantity: number;
  price: number;
}

export interface SummaryStats {
  requests: number;
  orders: number;
  customers: number;
  bikes: number;
  low_stock: number;
}

export const REQUEST_STATUSES = [
  'Novo',
  'Em contato',
  'Agendado',
  'Concluído',
  'Cancelado',
] as const;

export const ORDER_STATUSES = [
  'Recebida',
  'Em avaliação',
  'Orçamento enviado',
  'Aguardando aprovação',
  'Aprovada',
  'Em manutenção',
  'Aguardando peças',
  'Controle de qualidade',
  'Pronta para retirada',
  'Entregue',
  'Cancelada',
] as const;
