import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Bike as BikeIcon,
  Inbox,
  LayoutDashboard,
  Menu,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { api, formatCurrencyBRL, formatShortDate, getInitials } from '../lib/api';
import {
  Bike,
  Customer,
  ORDER_STATUSES,
  Product,
  REQUEST_STATUSES,
  ServiceOrder,
  ServiceRequest,
  SummaryStats,
} from '../types';

interface AdminDashboardProps {
  onNavigate: (path: string) => void;
}

type AdminSection = 'overview' | 'requests' | 'orders' | 'customers' | 'bikes' | 'inventory';
type ModalState =
  | { type: 'none' }
  | { type: 'order'; prefillCustomerId?: string; prefillBikeId?: string; prefillProblem?: string }
  | { type: 'product' }
  | { type: 'customer' }
  | { type: 'bike' };

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });

  const [summary, setSummary] = useState<SummaryStats>({
    requests: 0,
    orders: 0,
    customers: 0,
    bikes: 0,
    low_stock: 0,
  });
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const timer = window.setTimeout(() => setToastMsg(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toastMsg]);

  const loadAll = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setErrorMsg(null);
    try {
      const [sumData, reqData, ordData, prodData, custData, bikeData] = await Promise.all([
        api<SummaryStats>('/summary'),
        api<ServiceRequest[]>('/requests'),
        api<ServiceOrder[]>('/orders'),
        api<Product[]>('/products'),
        api<Customer[]>('/customers'),
        api<Bike[]>('/bikes'),
      ]);
      setSummary(sumData);
      setRequests(reqData);
      setOrders(ordData);
      setProducts(prodData);
      setCustomers(custData);
      setBikes(bikeData);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao carregar dados da oficina.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const interval = window.setInterval(() => {
      loadAll();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [loadAll]);

  async function handleStatusChange(table: 'requests' | 'orders', id: string, status: string) {
    try {
      await api(`/${table}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      showToast('Status atualizado');
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao atualizar status.');
    }
  }

  async function handleStockDelta(product: Product, delta: number) {
    const nextQty = Math.max(0, product.quantity + delta);
    if (nextQty === product.quantity) return;
    try {
      await api(`/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: nextQty }),
      });
      showToast(`${product.name}: ${nextQty} em estoque`);
      await loadAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao atualizar estoque.');
    }
  }

  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const c of customers) map.set(c.id, c);
    return map;
  }, [customers]);

  const bikeMap = useMemo(() => {
    const map = new Map<string, Bike>();
    for (const b of bikes) map.set(b.id, b);
    return map;
  }, [bikes]);

  const query = searchQuery.trim().toLowerCase();

  const filteredRequests = useMemo(() => {
    if (!query) return requests;
    return requests.filter((r) => {
      const c = customerMap.get(r.customer_id);
      return (
        (c?.name || '').toLowerCase().includes(query) ||
        (r.kind || '').toLowerCase().includes(query) ||
        (r.message || '').toLowerCase().includes(query) ||
        (r.status || '').toLowerCase().includes(query)
      );
    });
  }, [requests, customerMap, query]);

  const filteredOrders = useMemo(() => {
    if (!query) return orders;
    return orders.filter((o) => {
      const c = o.customer_id ? customerMap.get(o.customer_id) : undefined;
      return (
        `os-${o.number}`.includes(query) ||
        (c?.name || '').toLowerCase().includes(query) ||
        (o.problem || '').toLowerCase().includes(query) ||
        (o.mechanic || '').toLowerCase().includes(query) ||
        (o.status || '').toLowerCase().includes(query)
      );
    });
  }, [orders, customerMap, query]);

  const filteredProducts = useMemo(() => {
    if (!query) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
    );
  }, [products, query]);

  const filteredCustomers = useMemo(() => {
    if (!query) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.phone.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query)
    );
  }, [customers, query]);

  const filteredBikes = useMemo(() => {
    if (!query) return bikes;
    return bikes.filter((b) => {
      const c = customerMap.get(b.customer_id);
      return (
        b.brand.toLowerCase().includes(query) ||
        b.model.toLowerCase().includes(query) ||
        b.category.toLowerCase().includes(query) ||
        (c?.name || '').toLowerCase().includes(query)
      );
    });
  }, [bikes, customerMap, query]);

  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  const navItems: { id: AdminSection; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Resumo', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'requests', label: 'Solicitações', icon: <Inbox className="h-4 w-4" />, count: summary.requests },
    { id: 'orders', label: 'Ordens de serviço', icon: <Wrench className="h-4 w-4" />, count: summary.orders },
    { id: 'customers', label: 'Clientes', icon: <Users className="h-4 w-4" /> },
    { id: 'bikes', label: 'Bicicletas', icon: <BikeIcon className="h-4 w-4" /> },
    { id: 'inventory', label: 'Estoque', icon: <Package className="h-4 w-4" />, count: summary.low_stock },
  ];

  const sectionLabels: Record<AdminSection, string> = {
    overview: 'Resumo operacional',
    requests: 'Solicitações do site',
    orders: 'Ordens de serviço',
    customers: 'Base de clientes',
    bikes: 'Bicicletas cadastradas',
    inventory: 'Estoque de peças e acessórios',
  };

  return (
    <div className="min-h-screen bg-[#11120f] text-[#f3f4ef]">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/70 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex w-60 flex-col border-r border-white/10 bg-[#161815] px-4 py-6 transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-8 flex items-center justify-between px-2">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2.5 whitespace-nowrap font-display text-lg font-extrabold tracking-[0.1em] text-[#f3f4ef]"
          >
            <span className="grid h-7 w-7 -skew-x-12 place-items-center border border-[#c5ef3a] font-display text-base font-extrabold text-[#c5ef3a]">
              V
            </span>
            <span>
              VALE <span className="text-[#c5ef3a]">BIKE</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu lateral"
            className="p-1.5 text-[#969b90] lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-3 px-2 text-[11px] font-semibold tracking-[0.14em] text-[#757a70] uppercase">
          Operação da loja
        </p>

        <nav className="flex flex-col gap-1" aria-label="Navegação do painel">
          {navItems.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveSection(item.id);
                  setSidebarOpen(false);
                }}
                className={`flex h-10 w-full items-center gap-3 px-3 text-left text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#c5ef3a]/12 text-[#c5ef3a]'
                    : 'text-[#a9ada4] hover:bg-white/5 hover:text-[#f3f4ef]'
                }`}
              >
                {item.icon}
                <span className="flex-1 truncate">{item.label}</span>
                {typeof item.count === 'number' && item.count > 0 && (
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      item.id === 'inventory' ? 'text-[#ff6b25]' : 'text-[#c5ef3a]'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 px-2 py-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center bg-[#c5ef3a]/15 font-mono text-xs font-bold text-[#c5ef3a]">
              VB
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[#f3f4ef]">Equipe Vale Bike</p>
              <p className="truncate text-[11px] text-[#969b90]">Gestão da oficina</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="mt-2 flex w-full items-center gap-2 px-2 py-2 text-xs text-[#969b90] transition-colors hover:text-[#c5ef3a]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Voltar ao site público
          </button>
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex min-h-20 flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-[#11120f]/95 px-5 py-4 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menu lateral"
              className="inline-flex h-10 w-10 items-center justify-center border border-white/15 text-[#f3f4ef] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[11px] font-medium tracking-[0.12em] text-[#82877c] capitalize">
                {formattedToday}
              </p>
              <h1 className="font-display text-2xl font-bold text-[#f3f4ef] md:text-3xl">
                {sectionLabels[activeSection]}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#777d72]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cliente, OS, peça..."
                className="h-10 w-48 border border-[#30332d] bg-[#181a17] pr-3 pl-9 text-xs text-[#f3f4ef] placeholder-[#777d72] outline-none focus:border-[#c5ef3a] sm:w-64"
              />
            </div>

            <button
              type="button"
              onClick={() => loadAll(true)}
              title="Atualizar dados"
              className="inline-flex h-10 w-10 items-center justify-center border border-[#30332d] bg-[#181a17] text-[#f3f4ef] transition-colors hover:border-[#c5ef3a]"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setModal({ type: 'order' })}
              className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap bg-[#ff6b25] px-4 text-xs font-bold uppercase tracking-wider text-[#17130f] transition-transform duration-150 hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nova ordem de serviço
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-5 py-7 md:px-8">
          {errorMsg && (
            <div
              role="alert"
              className="mb-6 flex items-center justify-between border border-[#ff6b25]/50 bg-[#ff6b25]/10 px-4 py-3 text-xs text-[#f3f4ef]"
            >
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => loadAll(true)}
                className="font-bold text-[#ff6b25] underline"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {/* KPI Stats Row (always visible on Overview, compact summary) */}
          {activeSection === 'overview' && (
            <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <button
                type="button"
                onClick={() => setActiveSection('requests')}
                className="border border-white/10 bg-[#181a17] p-5 text-left transition-colors hover:border-[#c5ef3a]/40"
              >
                <div className="flex items-center justify-between text-xs font-medium text-[#a2a69c]">
                  <span>Solicitações novas</span>
                  <Inbox className="h-4 w-4 text-[#c5ef3a]" aria-hidden="true" />
                </div>
                <strong className="mt-2 block font-display text-4xl font-bold text-[#f3f4ef] tabular-nums">
                  {loading ? '—' : summary.requests}
                </strong>
                <span className="mt-1 block text-xs text-[#858a80]">Pedidos recebidos pelo site</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('orders')}
                className="border border-white/10 bg-[#181a17] p-5 text-left transition-colors hover:border-[#c5ef3a]/40"
              >
                <div className="flex items-center justify-between text-xs font-medium text-[#a2a69c]">
                  <span>OS em aberto</span>
                  <Wrench className="h-4 w-4 text-[#ff6b25]" aria-hidden="true" />
                </div>
                <strong className="mt-2 block font-display text-4xl font-bold text-[#f3f4ef] tabular-nums">
                  {loading ? '—' : summary.orders}
                </strong>
                <span className="mt-1 block text-xs text-[#858a80]">Acompanhar andamento</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('customers')}
                className="border border-white/10 bg-[#181a17] p-5 text-left transition-colors hover:border-[#c5ef3a]/40"
              >
                <div className="flex items-center justify-between text-xs font-medium text-[#a2a69c]">
                  <span>Clientes cadastrados</span>
                  <Users className="h-4 w-4 text-[#969b90]" aria-hidden="true" />
                </div>
                <strong className="mt-2 block font-display text-4xl font-bold text-[#f3f4ef] tabular-nums">
                  {loading ? '—' : summary.customers}
                </strong>
                <span className="mt-1 block text-xs text-[#858a80]">Na base da Vale Bike</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('inventory')}
                className="border border-white/10 bg-[#181a17] p-5 text-left transition-colors hover:border-[#c5ef3a]/40"
              >
                <div className="flex items-center justify-between text-xs font-medium text-[#a2a69c]">
                  <span>Estoque para revisar</span>
                  <Package className="h-4 w-4 text-[#ff6b25]" aria-hidden="true" />
                </div>
                <strong className="mt-2 block font-display text-4xl font-bold text-[#f3f4ef] tabular-nums">
                  {loading ? '—' : summary.low_stock}
                </strong>
                <span className="mt-1 block text-xs text-[#858a80]">Abaixo do mínimo definido</span>
              </button>
            </section>
          )}

          {/* Overview Layout */}
          {activeSection === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {/* Recent Requests */}
                <section className="border border-white/10 bg-[#181a17] p-5 xl:col-span-2">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.14em] text-[#c5ef3a] uppercase">
                        Entrada do site
                      </p>
                      <h2 className="font-display text-2xl font-bold text-[#f3f4ef]">
                        Solicitações recentes
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSection('requests')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#c5ef3a] hover:underline"
                    >
                      Ver todas
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <RequestsTable
                    items={filteredRequests.slice(0, 6)}
                    customerMap={customerMap}
                    bikeMap={bikeMap}
                    loading={loading}
                    onStatusChange={(id, status) => handleStatusChange('requests', id, status)}
                    onCreateOrder={(req) =>
                      setModal({
                        type: 'order',
                        prefillCustomerId: req.customer_id,
                        prefillBikeId: req.bike_id,
                        prefillProblem: [req.kind, req.message].filter(Boolean).join(' — '),
                      })
                    }
                  />
                </section>

                {/* Priorities Panel */}
                <section className="flex flex-col justify-between border border-white/10 bg-[#181a17] p-5">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.14em] text-[#c5ef3a] uppercase">
                      Atenção da equipe
                    </p>
                    <h2 className="font-display text-2xl font-bold text-[#f3f4ef]">Prioridades</h2>

                    <div className="mt-4 divide-y divide-white/10">
                      <button
                        type="button"
                        onClick={() => setActiveSection('requests')}
                        className="flex w-full items-center gap-3 py-4 text-left transition-colors hover:bg-white/[0.02]"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center bg-[#ff6b25]/15 text-[#ff6b25]">
                          <Inbox className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[#f3f4ef] tabular-nums">
                            {summary.requests} novas solicitações
                          </p>
                          <p className="text-[11px] text-[#969b90]">Pedidos esperando primeiro contato</p>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-[#969b90]" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSection('inventory')}
                        className="flex w-full items-center gap-3 py-4 text-left transition-colors hover:bg-white/[0.02]"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center bg-[#c5ef3a]/15 text-[#c5ef3a]">
                          <Package className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[#f3f4ef] tabular-nums">
                            {summary.low_stock} itens com estoque baixo
                          </p>
                          <p className="text-[11px] text-[#969b90]">Confira reposição necessária</p>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-[#969b90]" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-relaxed text-[#898e83]">
                    Dica: clique em &quot;Abrir OS&quot; em qualquer solicitação recebida para gerar a ordem de serviço já vinculada ao cliente.
                  </p>
                </section>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {/* Service Orders */}
                <section className="border border-white/10 bg-[#181a17] p-5 xl:col-span-2">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.14em] text-[#c5ef3a] uppercase">
                        Fluxo da oficina
                      </p>
                      <h2 className="font-display text-2xl font-bold text-[#f3f4ef]">
                        Ordens de serviço
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModal({ type: 'order' })}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#c5ef3a] hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Criar OS
                    </button>
                  </div>

                  <OrdersTable
                    items={filteredOrders.slice(0, 6)}
                    customerMap={customerMap}
                    bikeMap={bikeMap}
                    loading={loading}
                    onStatusChange={(id, status) => handleStatusChange('orders', id, status)}
                  />
                </section>

                {/* Inventory Summary */}
                <section className="border border-white/10 bg-[#181a17] p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.14em] text-[#c5ef3a] uppercase">
                        Peças &amp; acessórios
                      </p>
                      <h2 className="font-display text-2xl font-bold text-[#f3f4ef]">Estoque</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModal({ type: 'product' })}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#c5ef3a] hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Produto
                    </button>
                  </div>

                  <div className="divide-y divide-white/10">
                    {filteredProducts.length === 0 ? (
                      <p className="py-6 text-center text-xs text-[#858a7f]">
                        Nenhum produto cadastrado.
                      </p>
                    ) : (
                      filteredProducts.slice(0, 6).map((item) => {
                        const isLow = item.quantity <= item.min_quantity;
                        return (
                          <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-[#f3f4ef]">
                                {item.name}
                              </p>
                              <p className="text-[11px] text-[#969b90]">
                                {item.sku || item.category}
                                {isLow && (
                                  <span className="ml-2 font-semibold text-[#ff6b25]">
                                    · Estoque baixo
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleStockDelta(item, -1)}
                                aria-label={`Reduzir estoque de ${item.name}`}
                                className="grid h-7 w-7 place-items-center border border-white/15 text-[#d1d3cd] hover:border-[#c5ef3a]"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span
                                className={`min-w-7 text-center font-display text-xl font-bold tabular-nums ${
                                  isLow ? 'text-[#ff6b25]' : 'text-[#c5ef3a]'
                                }`}
                              >
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStockDelta(item, 1)}
                                aria-label={`Aumentar estoque de ${item.name}`}
                                className="grid h-7 w-7 place-items-center border border-white/15 text-[#d1d3cd] hover:border-[#c5ef3a]"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              </div>

              {/* Recent Customers */}
              <section className="border border-white/10 bg-[#181a17] p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.14em] text-[#c5ef3a] uppercase">
                      Relacionamento
                    </p>
                    <h2 className="font-display text-2xl font-bold text-[#f3f4ef]">
                      Clientes recentes
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModal({ type: 'customer' })}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#c5ef3a] hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Novo cliente
                  </button>
                </div>

                {filteredCustomers.length === 0 ? (
                  <p className="py-4 text-xs text-[#858a7f]">
                    Nenhum cliente cadastrado. Solicitações do site geram cadastro automaticamente.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {filteredCustomers.slice(0, 8).map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 border border-white/10 bg-[#131512] p-3"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center bg-[#c5ef3a]/15 font-mono text-xs font-bold text-[#c5ef3a]">
                          {getInitials(c.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-[#f3f4ef]">{c.name}</p>
                          <p className="truncate font-mono text-[11px] text-[#969b90] tabular-nums">
                            {c.phone || c.email || 'Sem contato'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Dedicated Section: Requests */}
          {activeSection === 'requests' && (
            <section className="border border-white/10 bg-[#181a17] p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-[#f3f4ef]">
                    Todas as solicitações ({filteredRequests.length})
                  </h2>
                  <p className="text-xs text-[#969b90]">
                    Pedidos enviados pelo formulário público do site.
                  </p>
                </div>
              </div>
              <RequestsTable
                items={filteredRequests}
                customerMap={customerMap}
                bikeMap={bikeMap}
                loading={loading}
                onStatusChange={(id, status) => handleStatusChange('requests', id, status)}
                onCreateOrder={(req) =>
                  setModal({
                    type: 'order',
                    prefillCustomerId: req.customer_id,
                    prefillBikeId: req.bike_id,
                    prefillProblem: [req.kind, req.message].filter(Boolean).join(' — '),
                  })
                }
              />
            </section>
          )}

          {/* Dedicated Section: Orders */}
          {activeSection === 'orders' && (
            <section className="border border-white/10 bg-[#181a17] p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-[#f3f4ef]">
                    Ordens de serviço ({filteredOrders.length})
                  </h2>
                  <p className="text-xs text-[#969b90]">
                    Controle de entrada, manutenção, orçamento e entrega.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModal({ type: 'order' })}
                  className="inline-flex h-10 items-center gap-2 bg-[#c5ef3a] px-4 text-xs font-bold uppercase tracking-wider text-[#151810]"
                >
                  <Plus className="h-4 w-4" />
                  Nova OS
                </button>
              </div>
              <OrdersTable
                items={filteredOrders}
                customerMap={customerMap}
                bikeMap={bikeMap}
                loading={loading}
                onStatusChange={(id, status) => handleStatusChange('orders', id, status)}
              />
            </section>
          )}

          {/* Dedicated Section: Customers */}
          {activeSection === 'customers' && (
            <section className="border border-white/10 bg-[#181a17] p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-[#f3f4ef]">
                    Clientes ({filteredCustomers.length})
                  </h2>
                  <p className="text-xs text-[#969b90]">
                    Cadastro automático via orçamento do site ou registro manual no balcão.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModal({ type: 'customer' })}
                  className="inline-flex h-10 items-center gap-2 bg-[#c5ef3a] px-4 text-xs font-bold uppercase tracking-wider text-[#151810]"
                >
                  <Plus className="h-4 w-4" />
                  Novo cliente
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] font-semibold tracking-wider text-[#777d72] uppercase">
                      <th className="py-3 pr-4">Cliente</th>
                      <th className="py-3 pr-4">WhatsApp / Telefone</th>
                      <th className="py-3 pr-4">E-mail</th>
                      <th className="py-3">Cadastro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-xs">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-[#858a7f]">
                          Nenhum cliente encontrado.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((c) => (
                        <tr key={c.id} className="hover:bg-white/[0.02]">
                          <td className="py-3.5 pr-4 font-semibold text-[#f3f4ef]">{c.name}</td>
                          <td className="py-3.5 pr-4 font-mono text-[#d1d3cd] tabular-nums">
                            {c.phone || '—'}
                          </td>
                          <td className="py-3.5 pr-4 text-[#969b90]">{c.email || '—'}</td>
                          <td className="py-3.5 font-mono text-[#969b90] tabular-nums">
                            {formatShortDate(c.created_at)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Dedicated Section: Bikes */}
          {activeSection === 'bikes' && (
            <section className="border border-white/10 bg-[#181a17] p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-[#f3f4ef]">
                    Bicicletas ({filteredBikes.length})
                  </h2>
                  <p className="text-xs text-[#969b90]">
                    Histórico de modelos vinculados aos clientes da oficina.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModal({ type: 'bike' })}
                  className="inline-flex h-10 items-center gap-2 bg-[#c5ef3a] px-4 text-xs font-bold uppercase tracking-wider text-[#151810]"
                >
                  <Plus className="h-4 w-4" />
                  Cadastrar bike
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] font-semibold tracking-wider text-[#777d72] uppercase">
                      <th className="py-3 pr-4">Marca / Modelo</th>
                      <th className="py-3 pr-4">Cliente</th>
                      <th className="py-3 pr-4">Categoria</th>
                      <th className="py-3">Cor / Série</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-xs">
                    {filteredBikes.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-[#858a7f]">
                          Nenhuma bicicleta cadastrada.
                        </td>
                      </tr>
                    ) : (
                      filteredBikes.map((b) => {
                        const owner = customerMap.get(b.customer_id);
                        return (
                          <tr key={b.id} className="hover:bg-white/[0.02]">
                            <td className="py-3.5 pr-4 font-semibold text-[#f3f4ef]">
                              {[b.brand, b.model].filter(Boolean).join(' ') || 'Bike sem identificação'}
                            </td>
                            <td className="py-3.5 pr-4 text-[#d1d3cd]">{owner?.name || 'Balcão'}</td>
                            <td className="py-3.5 pr-4 text-[#969b90]">{b.category || '—'}</td>
                            <td className="py-3.5 font-mono text-[#969b90] tabular-nums">
                              {[b.color, b.serial].filter(Boolean).join(' · ') || '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Dedicated Section: Inventory */}
          {activeSection === 'inventory' && (
            <section className="border border-white/10 bg-[#181a17] p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-[#f3f4ef]">
                    Estoque completo ({filteredProducts.length})
                  </h2>
                  <p className="text-xs text-[#969b90]">
                    Ajuste quantidades rapidamente ou cadastre novas peças e acessórios.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModal({ type: 'product' })}
                  className="inline-flex h-10 items-center gap-2 bg-[#c5ef3a] px-4 text-xs font-bold uppercase tracking-wider text-[#151810]"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar produto
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] font-semibold tracking-wider text-[#777d72] uppercase">
                      <th className="py-3 pr-4">Produto</th>
                      <th className="py-3 pr-4">SKU / Categoria</th>
                      <th className="py-3 pr-4 text-right">Preço</th>
                      <th className="py-3 pr-4">Situação</th>
                      <th className="py-3 text-right">Quantidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-xs">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-[#858a7f]">
                          Nenhum produto encontrado.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => {
                        const isLow = p.quantity <= p.min_quantity;
                        return (
                          <tr key={p.id} className="hover:bg-white/[0.02]">
                            <td className="py-3.5 pr-4 font-semibold text-[#f3f4ef]">{p.name}</td>
                            <td className="py-3.5 pr-4 text-[#969b90]">
                              {[p.sku, p.category].filter(Boolean).join(' · ') || 'Geral'}
                            </td>
                            <td className="py-3.5 pr-4 text-right font-mono text-[#d1d3cd] tabular-nums">
                              {formatCurrencyBRL(p.price)}
                            </td>
                            <td className="py-3.5 pr-4">
                              <span className={isLow ? 'font-semibold text-[#ff6b25]' : 'text-[#c5ef3a]'}>
                                {isLow ? `Repor (mín. ${p.min_quantity})` : 'Normal'}
                              </span>
                            </td>
                            <td className="py-3.5 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleStockDelta(p, -1)}
                                  className="grid h-7 w-7 place-items-center border border-white/15 hover:border-[#c5ef3a]"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span
                                  className={`min-w-7 text-center font-mono text-sm font-bold tabular-nums ${
                                    isLow ? 'text-[#ff6b25]' : 'text-[#c5ef3a]'
                                  }`}
                                >
                                  {p.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleStockDelta(p, 1)}
                                  className="grid h-7 w-7 place-items-center border border-white/15 hover:border-[#c5ef3a]"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Modals */}
      {modal.type === 'order' && (
        <OrderModal
          customers={customers}
          bikes={bikes}
          prefillCustomerId={modal.prefillCustomerId}
          prefillBikeId={modal.prefillBikeId}
          prefillProblem={modal.prefillProblem}
          onClose={() => setModal({ type: 'none' })}
          onSuccess={async (num) => {
            setModal({ type: 'none' });
            showToast(`OS-${num} criada`);
            await loadAll();
          }}
          onError={showToast}
        />
      )}

      {modal.type === 'product' && (
        <ProductModal
          onClose={() => setModal({ type: 'none' })}
          onSuccess={async () => {
            setModal({ type: 'none' });
            showToast('Produto cadastrado');
            await loadAll();
          }}
          onError={showToast}
        />
      )}

      {modal.type === 'customer' && (
        <CustomerModal
          onClose={() => setModal({ type: 'none' })}
          onSuccess={async () => {
            setModal({ type: 'none' });
            showToast('Cliente cadastrado');
            await loadAll();
          }}
          onError={showToast}
        />
      )}

      {modal.type === 'bike' && (
        <BikeModal
          customers={customers}
          onClose={() => setModal({ type: 'none' })}
          onSuccess={async () => {
            setModal({ type: 'none' });
            showToast('Bicicleta cadastrada');
            await loadAll();
          }}
          onError={showToast}
        />
      )}

      {/* Toast */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-6 bottom-6 z-50 bg-[#c5ef3a] px-5 py-3 text-xs font-bold text-[#171910] shadow-lg"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}

function RequestsTable({
  items,
  customerMap,
  bikeMap,
  loading,
  onStatusChange,
  onCreateOrder,
}: {
  items: ServiceRequest[];
  customerMap: Map<string, Customer>;
  bikeMap: Map<string, Bike>;
  loading: boolean;
  onStatusChange: (id: string, status: string) => void;
  onCreateOrder: (req: ServiceRequest) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="border-b border-white/10 text-[11px] font-semibold tracking-wider text-[#777d72] uppercase">
            <th className="py-3 pr-4">Cliente</th>
            <th className="py-3 pr-4">Interesse</th>
            <th className="py-3 pr-4">Recebido</th>
            <th className="py-3 pr-4">Status</th>
            <th className="py-3 text-right">Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 text-xs">
          {loading ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-[#858a7f]">
                Carregando solicitações...
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-[#858a7f]">
                Nenhuma solicitação recebida ainda.
              </td>
            </tr>
          ) : (
            items.map((req) => {
              const customer = customerMap.get(req.customer_id);
              const bike = bikeMap.get(req.bike_id);
              return (
                <tr key={req.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 pr-4">
                    <p className="font-semibold text-[#f3f4ef]">{customer?.name || 'Cliente'}</p>
                    <p className="font-mono text-[11px] text-[#969b90] tabular-nums">
                      {customer?.phone || 'Sem WhatsApp'}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-[#d1d3cd]">{req.kind}</p>
                    {(bike?.model || req.message) && (
                      <p className="max-w-xs truncate text-[11px] text-[#969b90]">
                        {[bike?.model, req.message].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-4 font-mono text-[#969b90] tabular-nums">
                    {formatShortDate(req.created_at)}
                  </td>
                  <td className="py-3 pr-4">
                    <select
                      aria-label={`Status da solicitação de ${customer?.name || 'cliente'}`}
                      value={req.status}
                      onChange={(e) => onStatusChange(req.id, e.target.value)}
                      className="h-8 border border-white/15 bg-[#242620] px-2 text-xs font-medium text-[#c5ef3a] outline-none focus:border-[#c5ef3a]"
                    >
                      {REQUEST_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onCreateOrder(req)}
                      className="inline-flex h-8 items-center border border-white/15 px-2.5 text-[11px] font-semibold text-[#f3f4ef] transition-colors hover:border-[#c5ef3a] hover:text-[#c5ef3a]"
                    >
                      Abrir OS
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function OrdersTable({
  items,
  customerMap,
  bikeMap,
  loading,
  onStatusChange,
}: {
  items: ServiceOrder[];
  customerMap: Map<string, Customer>;
  bikeMap: Map<string, Bike>;
  loading: boolean;
  onStatusChange: (id: string, status: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] border-collapse text-left">
        <thead>
          <tr className="border-b border-white/10 text-[11px] font-semibold tracking-wider text-[#777d72] uppercase">
            <th className="py-3 pr-4">Número</th>
            <th className="py-3 pr-4">Cliente / Bike</th>
            <th className="py-3 pr-4">Problema</th>
            <th className="py-3 pr-4">Status</th>
            <th className="py-3 text-right">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 text-xs">
          {loading ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-[#858a7f]">
                Carregando ordens de serviço...
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-[#858a7f]">
                Nenhuma OS cadastrada ainda.
              </td>
            </tr>
          ) : (
            items.map((ord) => {
              const customer = ord.customer_id ? customerMap.get(ord.customer_id) : undefined;
              const bike = ord.bike_id ? bikeMap.get(ord.bike_id) : undefined;
              return (
                <tr key={ord.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 pr-4 font-mono font-semibold text-[#f3f4ef] tabular-nums">
                    OS-{ord.number}
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-[#d1d3cd]">{customer?.name || 'Atendimento de balcão'}</p>
                    {bike && (bike.brand || bike.model) && (
                      <p className="text-[11px] text-[#969b90]">
                        {[bike.brand, bike.model].filter(Boolean).join(' ')}
                      </p>
                    )}
                  </td>
                  <td className="max-w-xs py-3 pr-4">
                    <p className="truncate text-[#d1d3cd]">{ord.problem || '—'}</p>
                    {ord.mechanic && (
                      <p className="text-[11px] text-[#969b90]">Mecânico: {ord.mechanic}</p>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <select
                      aria-label={`Status da OS-${ord.number}`}
                      value={ord.status}
                      onChange={(e) => onStatusChange(ord.id, e.target.value)}
                      className="h-8 border border-white/15 bg-[#242620] px-2 text-xs font-medium text-[#c5ef3a] outline-none focus:border-[#c5ef3a]"
                    >
                      {ORDER_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 text-right font-mono text-[#d1d3cd] tabular-nums">
                    {ord.total > 0 ? formatCurrencyBRL(ord.total) : '—'}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function OrderModal({
  customers,
  bikes,
  prefillCustomerId,
  prefillBikeId,
  prefillProblem,
  onClose,
  onSuccess,
  onError,
}: {
  customers: Customer[];
  bikes: Bike[];
  prefillCustomerId?: string;
  prefillBikeId?: string;
  prefillProblem?: string;
  onClose: () => void;
  onSuccess: (orderNumber: number) => void;
  onError: (msg: string) => void;
}) {
  const [customerId, setCustomerId] = useState(prefillCustomerId || '');
  const [bikeId, setBikeId] = useState(prefillBikeId || '');
  const [problem, setProblem] = useState(prefillProblem || '');
  const [mechanic, setMechanic] = useState('');
  const [total, setTotal] = useState('0');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api<{ ok: boolean; number: number }>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: customerId || null,
          bike_id: bikeId || null,
          problem,
          mechanic,
          total: Number(total) || 0,
          status: 'Recebida',
        }),
      });
      onSuccess(res.number);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao criar OS.');
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg border border-white/20 bg-[#1a1c18] p-6 shadow-2xl">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-[#c5ef3a] uppercase">
          Oficina · Novo registro
        </p>
        <h2 className="mt-1 mb-5 font-display text-3xl font-bold text-[#f3f4ef]">
          Nova ordem de serviço
        </h2>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="grid gap-1.5 text-xs text-[#aeb2a8]">
            Cliente
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="h-10 border border-[#353831] bg-[#10110f] px-3 text-xs text-[#f3f4ef] outline-none focus:border-[#c5ef3a]"
            >
              <option value="">Atendimento de balcão</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `· ${c.phone}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-xs text-[#aeb2a8]">
            Bicicleta
            <select
              value={bikeId}
              onChange={(e) => setBikeId(e.target.value)}
              className="h-10 border border-[#353831] bg-[#10110f] px-3 text-xs text-[#f3f4ef] outline-none focus:border-[#c5ef3a]"
            >
              <option value="">Selecione (opcional)</option>
              {bikes.map((b) => {
                const owner = customers.find((c) => c.id === b.customer_id);
                return (
                  <option key={b.id} value={b.id}>
                    {[b.brand, b.model].filter(Boolean).join(' ') || 'Sem modelo'}{' '}
                    {owner ? `· ${owner.name}` : ''}
                  </option>
                );
              })}
            </select>
          </label>

          <label className="grid gap-1.5 text-xs text-[#aeb2a8]">
            Problema relatado
            <textarea
              rows={3}
              required
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Descreva o que precisa ser avaliado"
              className="border border-[#353831] bg-[#10110f] p-3 text-xs text-[#f3f4ef] outline-none focus:border-[#c5ef3a]"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-xs text-[#aeb2a8]">
              Mecânico
              <input
                type="text"
                value={mechanic}
                onChange={(e) => setMechanic(e.target.value)}
                placeholder="Responsável"
                className="h-10 border border-[#353831] bg-[#10110f] px-3 text-xs text-[#f3f4ef] outline-none focus:border-[#c5ef3a]"
              />
            </label>

            <label className="grid gap-1.5 text-xs text-[#aeb2a8]">
              Valor estimado (R$)
              <input
                type="number"
                step="0.01"
                min="0"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                className="h-10 border border-[#353831] bg-[#10110f] px-3 font-mono text-xs text-[#f3f4ef] tabular-nums outline-none focus:border-[#c5ef3a]"
              />
            </label>
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 border border-white/25 px-4 text-xs font-bold uppercase tracking-wider text-[#f3f4ef]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 bg-[#c5ef3a] px-5 text-xs font-bold uppercase tracking-wider text-[#151810] disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Criar OS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProductModal({
  onClose,
  onSuccess,
  onError,
}: {
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [minQuantity, setMinQuantity] = useState('0');
  const [price, setPrice] = useState('0');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/products', {
        method: 'POST',
        body: JSON.stringify({
          name,
          sku,
          category: category || 'Geral',
          quantity: Number(quantity) || 0,
          min_quantity: Number(minQuantity) || 0,
          price: Number(price) || 0,
        }),
      });
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao cadastrar produto.');
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg border border-white/20 bg-[#1a1c18] p-6 shadow-2xl">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-[#c5ef3a] uppercase">
          Loja · Novo item
        </p>
        <h2 className="mt-1 mb-5 font-display text-3xl font-bold text-[#f3f4ef]">
          Adicionar produto
        </h2>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="grid gap-1.5 text-xs text-[#aeb2a8]">
            Nome do produto
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Câmara aro 29"
              className="h-10 border border-[#353831] bg-[#10110f] px-3 text-xs text-[#f3f4ef] outline-none focus:border-[#c5ef3a]"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-xs text-[#aeb2a8]">
              SKU / código
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Ex.: CAM-29"
                className="h-10 border border-[#353831] bg-[#10110f] px-3 text-xs text-[#f3f4ef] outline-none focus:border-[#c5ef3a]"
              />
            </label>
            <label className="grid gap-1.5 text-xs text-[#aeb2a8]">
              Categoria
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex.: Câmaras"
                className="h-10 border border-[#353831] bg-[#10110f] px-3 text-xs text-[#f3f4ef] outline-none focus:border-[#c5ef3a]"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-xs text-[#aeb2a8]">
              Quantidade
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-10 border border-[#353831] bg-[#10110f] px-3 font-mono text-xs text-[#f3f4ef] tabular-nums outline-none focus:border-[#c5ef3a]"
              />
            </label>
            <label className="grid gap-1.5 text-xs text-[#aeb2a8]">
              Estoque mínimo
              <input
                type="number"
                min="0"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                className="h-10 border border-[#353831] bg-[#10110f] px-3 font-mono text-xs text-[#f3f4ef] tabular-nums outline-none focus:border-[#c5ef3a]"
              />
            </label>
          </div>

          <label className="grid gap-1.5 text-xs text-[#aeb2a8]">
            Preço de venda (R$)
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-10 border border-[#353831] bg-[#10110f] px-3 font-mono text-xs text-[#f3f4ef] tabular-nums outline-none focus:border-[#c5ef3a]"
            />
          </label>

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 border border-white/25 px-4 text-xs font-bold uppercase tracking-wider text-[#f3f4ef]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 bg-[#c5ef3a] px-5 text-xs font-bold uppercase tracking-wider text-[#151810] disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CustomerModal({
  onClose,
  onSuccess,
  onError,
}: {
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/customers', {
        method: 'POST',
        body: JSON.stringify({ name, phone, email }),
      });
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao cadastrar cliente.');
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md border border-white/20 bg-[#1a1c18] p-6 shadow-2xl">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-[#c5ef3a] uppercase">
          Relacionamento · Novo cliente
        </p>
        <h2 className="mt-1 mb-5 font-display text-3xl font-bold text-[#f3f4ef]">
          Cadastrar cliente
        </h2>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="grid gap-1.5 text-xs text-[#aeb2a8]">
            Nome completo
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do ciclista"
              className="h-10 border border-[#353831] bg-[#10110f] px-3 text-xs text-[#f3f4ef] outline-none focus:border-[#c5ef3a]"
            />
          </label>
          <label className="grid gap-1.5 text-xs text-[#aeb2a8]">
            WhatsApp / Telefone
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(13) 9 0000-0000"
              className="h-10 border border-[#353831] bg-[#10110f] px-3 text-xs text-[#f3f4ef] outline-none focus:border-[#c5ef3a]"
            />
          </label>
          <label className="grid gap-1.5 text-xs text-[#aeb2a8]">
            E-mail (opcional)
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@email.com"
              className="h-10 border border-[#353831] bg-[#10110f] px-3 text-xs text-[#f3f4ef] outline-none focus:border-[#c5ef3a]"
            />
          </label>

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 border border-white/25 px-4 text-xs font-bold uppercase tracking-wider text-[#f3f4ef]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 bg-[#c5ef3a] px-5 text-xs font-bold uppercase tracking-wider text-[#151810] disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BikeModal({
  customers,
  onClose,
  onSuccess,
  onError,
}: {
  customers: Customer[];
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [customerId, setCustomerId] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [category, setCategory] = useState('MTB');
  const [color, setColor] = useState('');
  const [serial, setSerial] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/bikes', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: customerId || null,
          brand,
          model,
          category,
          color,
          serial,
        }),
      });
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao cadastrar bicicleta.');
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg border border-white/20 bg-[#1a1c18] p-6 shadow-2xl">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-[#c5ef3a] uppercase">
          Oficina · Registro de bicicleta
        </p>
        <h2 className="mt-1 mb-5 font-display text-3xl font-bold text-[#f3f4ef]">
          Cadastrar bicicleta
        </h2>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="grid gap-1.5 text-xs text-[#aeb2a8]">
            Proprietário
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="h-10 border border-[#353831] bg-[#10110f] px-3 text-xs text-[#f3f4ef] outline-none focus:border-[#c5ef3a]"
            >
              <option value="">Sem vínculo</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-xs text-[#aeb2a8]">
              Marca
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ex.: Caloi, Oggi, Specialized"
                className="h-10 border border-[#353831] bg-[#10110f] px-3 text-xs text-[#f3f4ef] outline-none focus:border-[#c5ef3a]"
              />
            </label>
            <label className="grid gap-1.5 text-xs text-[#aeb2a8]">
              Modelo
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Ex.: Explorer Comp"
                className="h-10 border border-[#353831] bg-[#10110f] px-3 text-xs text-[#f3f4ef] outline-none focus:border-[#c5ef3a]"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="grid gap-1.5 text-xs text-[#aeb2a8]">
              Categoria
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 border border-[#353831] bg-[#10110f] px-3 text-xs text-[#f3f4ef] outline-none focus:border-[#c5ef3a]"
              >
                <option value="MTB">MTB</option>
                <option value="Speed / Road">Speed / Road</option>
                <option value="Gravel">Gravel</option>
                <option value="Urbana">Urbana</option>
                <option value="Infantil">Infantil</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-xs text-[#aeb2a8]">
              Cor
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Ex.: Preta"
                className="h-10 border border-[#353831] bg-[#10110f] px-3 text-xs text-[#f3f4ef] outline-none focus:border-[#c5ef3a]"
              />
            </label>
            <label className="grid gap-1.5 text-xs text-[#aeb2a8]">
              Série / Quadro
              <input
                type="text"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                placeholder="Opcional"
                className="h-10 border border-[#353831] bg-[#10110f] px-3 text-xs text-[#f3f4ef] outline-none focus:border-[#c5ef3a]"
              />
            </label>
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 border border-white/25 px-4 text-xs font-bold uppercase tracking-wider text-[#f3f4ef]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 bg-[#c5ef3a] px-5 text-xs font-bold uppercase tracking-wider text-[#151810] disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar bike'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
