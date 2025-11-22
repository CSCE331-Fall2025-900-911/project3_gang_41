import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { API_URL } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Pencil,
  Save,
  X,
  Trash2,
  Search,
  PlusCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Settings,
  AlertTriangle,
  Plus,
  Package,
  TrendingDown,
  Check,
  Info,
} from 'lucide-react';

// Dialog components
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const API_BASE_URL = `${API_URL}/api`;

const BUILTIN_UNITS = ['units', 'fl oz', 'bags', 'g', 'servings', 'L', 'mL', 'oz'] as const;
const CURRENCY = 'USD';

type InventoryRow = {
  item_id: number;
  item_name: string;
  supply: number;
  unit: string | null;
  cost: string;
};

type Severity = 'ok' | 'warn' | 'crit';
type Thresholds = { warn: number; crit: number };
type SortKey = 'item_name' | 'supply' | 'unit' | 'cost';
type SortDir = 'asc' | 'desc';

// -------------------- Hooks & Helpers --------------------
function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function useLocalStorage<T>(key: string, initial: T) {
  const [val, setVal] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key, val]);
  return [val, setVal] as const;
}

function formatCurrency(val: number) {
  if (!Number.isFinite(val)) return '$0.00';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 2,
  }).format(val);
}

function getSeverity(supply: number, t: Thresholds): Severity {
  if (supply <= t.crit) return 'crit';
  if (supply <= t.warn) return 'warn';
  return 'ok';
}

function highlight(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-yellow-300/50 px-0.5 font-semibold text-yellow-900 dark:bg-yellow-500/30 dark:text-yellow-200">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// -------------------- Main Component --------------------
function InventoryPage() {
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'item_name', dir: 'asc' });
  const [stockFilter, setStockFilter] = useState<'all' | 'ok' | 'warn' | 'crit'>('all');
  const PAGE_SIZE_OPTIONS = [10, 25, 50];
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState<number>(1);

  const [thresholds, setThresholds] = useLocalStorage<Thresholds>('inventory.thresholds', { warn: 10, crit: 5 });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<{ item_name: string; supply: string; unit: string; cost: string }>({
    item_name: '',
    supply: '',
    unit: '',
    cost: '',
  });
  const [formInitial, setFormInitial] = useState<typeof form | null>(null);

  const [newItem, setNewItem] = useState<{ item_name: string; quantity: string; unit: string; cost: string }>({
    item_name: '',
    quantity: '',
    unit: '',
    cost: '',
  });

  const [quickUnits, setQuickUnits] = useLocalStorage<string[]>('inventory.quickUnits', [...BUILTIN_UNITS]);
  const [deleteTarget, setDeleteTarget] = useState<InventoryRow | null>(null);
  const [flashRowId, setFlashRowId] = useState<number | null>(null);
  const addFormRef = useRef<HTMLDivElement>(null);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    const ctrl = new AbortController();
    try {
      const res = await fetch(`${API_BASE_URL}/inventory`, { signal: ctrl.signal });
      if (!res.ok) throw new Error('Failed to load inventory.');
      const data: InventoryRow[] = await res.json();
      setItems(data);
    } catch (err: any) {
      if (err?.name !== 'AbortError') setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    let next = items;
    if (q) next = next.filter((i) => i.item_name.toLowerCase().includes(q));
    if (stockFilter !== 'all') next = next.filter((i) => getSeverity(i.supply, thresholds) === stockFilter);
    return next;
  }, [items, debouncedSearch, stockFilter, thresholds]);

  const sorted = useMemo(() => {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sort.key === 'item_name' || sort.key === 'unit') {
        return dir * collator.compare((a[sort.key] ?? '') as string, (b[sort.key] ?? '') as string);
      }
      if (sort.key === 'supply') return dir * (a.supply - b.supply);
      if (sort.key === 'cost') return dir * ((parseFloat(a.cost || '0') || 0) - (parseFloat(b.cost || '0') || 0));
      return 0;
    });
  }, [filtered, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, stockFilter, sort, pageSize]);

  const counts = useMemo(() => {
    let ok = 0,
      warn = 0,
      crit = 0;
    items.forEach((i) => {
      const s = getSeverity(i.supply, thresholds);
      if (s === 'crit') crit++;
      else if (s === 'warn') warn++;
      else ok++;
    });
    return { ok, warn, crit, all: items.length };
  }, [items, thresholds]);

  const startEdit = (row: InventoryRow) => {
    setEditingId(row.item_id);
    const next = {
      item_name: row.item_name ?? '',
      supply: String(row.supply ?? ''),
      unit: row.unit ?? '',
      cost: row.cost ? parseFloat(row.cost).toFixed(2) : '',
    };
    setForm(next);
    setFormInitial(next);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ item_name: '', supply: '', unit: '', cost: '' });
    setFormInitial(null);
  };

  const formIsDirty = useMemo(() => {
    if (!formInitial) return false;
    return (
      form.item_name.trim() !== formInitial.item_name.trim() ||
      (parseFloat(form.supply) || 0) !== (parseFloat(formInitial.supply) || 0) ||
      form.unit.trim() !== formInitial.unit.trim() ||
      (parseFloat(form.cost) || 0) !== (parseFloat(formInitial.cost) || 0)
    );
  }, [form, formInitial]);

  const formIsValid = useMemo(() => {
    const qty = Number(form.supply);
    const price = Number(form.cost);
    return !!form.item_name.trim() && Number.isFinite(qty) && qty >= 0 && Number.isFinite(price) && price >= 0;
  }, [form]);

  const saveEdit = async () => {
    if (editingId == null) return;
    const qty = Number(form.supply);
    const price = Number(form.cost);
    if (!form.item_name.trim()) return toast.error('Item name is required.');
    if (!Number.isFinite(qty) || qty < 0) return toast.error('Supply must be a non-negative number.');
    if (!Number.isFinite(price) || price < 0) return toast.error('Cost must be a non-negative number.');

    await toast.promise(
      (async () => {
        const res = await fetch(`${API_BASE_URL}/inventory/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_name: form.item_name.trim(),
            quantity: qty,
            unit: form.unit.trim() || null,
            cost: price,
          }),
        });
        if (!res.ok) throw new Error('Update failed');
        const updated: InventoryRow = await res.json();
        setItems((prev) => prev.map((i) => (i.item_id === editingId ? updated : i)));
        setFlashRowId(updated.item_id);
        setTimeout(() => setFlashRowId((id) => (id === updated.item_id ? null : id)), 1200);
        cancelEdit();
      })(),
      { loading: 'Saving changes...', success: 'Inventory updated', error: 'Failed to update inventory' }
    );
  };

  const deleteRow = async (row: InventoryRow) => {
    await toast.promise(
      (async () => {
        const res = await fetch(`${API_BASE_URL}/inventory/${row.item_id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        setItems((prev) => prev.filter((i) => i.item_id !== row.item_id));
      })(),
      { loading: 'Deleting...', success: 'Item deleted', error: 'Failed to delete item' }
    );
  };

  const addNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(newItem.quantity);
    const price = Number(newItem.cost);
    if (!newItem.item_name.trim()) return toast.error('Item name is required.');
    if (!Number.isFinite(qty) || qty < 0) return toast.error('Supply must be a non-negative number.');
    if (!Number.isFinite(price) || price < 0) return toast.error('Cost must be a non-negative number.');

    await toast.promise(
      (async () => {
        const res = await fetch(`${API_BASE_URL}/inventory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_name: newItem.item_name.trim(),
            quantity: qty,
            unit: newItem.unit.trim() || null,
            cost: price,
          }),
        });
        if (!res.ok) throw new Error('Create failed');
        const created: InventoryRow = await res.json();
        setItems((prev) => {
          const next = [...prev, created];
          return next.sort((a, b) => a.item_name.localeCompare(b.item_name));
        });
        setNewItem({ item_name: '', quantity: '', unit: '', cost: '' });
        setPage(1);
      })(),
      { loading: 'Adding item...', success: 'Item added successfully', error: 'Failed to add item' }
    );
  };

  const toggleSort = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  return (
    <TooltipProvider delayDuration={300}>
      {/* Page owns its scrolling now */}
      <div className="h-full w-full overflow-y-auto bg-background">
        <div className="container mx-auto space-y-8 p-6">
        {/* Enhanced Header Section */}
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="flex items-center gap-3 text-4xl font-bold tracking-tight">
                <Package className="h-8 w-8 text-primary" />
                Inventory Management
              </h1>
              <p className="text-muted-foreground">
                Track your stock levels and manage inventory items efficiently
              </p>
            </div>

            <div className="flex items-center gap-2">
              <ThresholdsDialog thresholds={thresholds} onSave={setThresholds}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Configure Thresholds</span>
                </Button>
              </ThresholdsDialog>
            </div>
          </div>

          {/* Stock Status Overview Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StockStatusCard
              label="Critical"
              count={counts.crit}
              icon={<AlertTriangle className="h-5 w-5" />}
              variant="destructive"
              active={stockFilter === 'crit'}
              onClick={() => setStockFilter(stockFilter === 'crit' ? 'all' : 'crit')}
            />
            <StockStatusCard
              label="Low Stock"
              count={counts.warn}
              icon={<TrendingDown className="h-5 w-5" />}
              variant="warning"
              active={stockFilter === 'warn'}
              onClick={() => setStockFilter(stockFilter === 'warn' ? 'all' : 'warn')}
            />
            <StockStatusCard
              label="In Stock"
              count={counts.ok}
              icon={<Check className="h-5 w-5" />}
              variant="success"
              active={stockFilter === 'ok'}
              onClick={() => setStockFilter(stockFilter === 'ok' ? 'all' : 'ok')}
            />
            <StockStatusCard
              label="Total Items"
              count={counts.all}
              icon={<Package className="h-5 w-5" />}
              variant="default"
              active={stockFilter === 'all'}
              onClick={() => setStockFilter('all')}
            />
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search inventory items..."
              className="h-11 pl-10 pr-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => setSearch('')}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Inventory Table */}
          <Card className="lg:col-span-8 xl:col-span-9">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Inventory Items</CardTitle>
                  <CardDescription>
                    {filtered.length} {filtered.length === 1 ? 'item' : 'items'} found
                  </CardDescription>
                </div>
                {!loading && items.length > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <Info className="h-3 w-3" />
                    Double-click to edit
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <TableSkeleton rows={6} />
              ) : error ? (
                <div className="m-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-destructive">{error}</p>
                    <Button size="sm" variant="outline" onClick={loadInventory}>
                      Retry
                    </Button>
                  </div>
                </div>
              ) : items.length === 0 ? (
                <EmptyState
                  title="No inventory items yet"
                  description="Start by adding your first inventory item"
                  icon={<Package className="h-12 w-12 text-muted-foreground/50" />}
                  primary={{
                    label: 'Add First Item',
                    onClick: () => addFormRef.current?.scrollIntoView({ behavior: 'smooth' }),
                  }}
                />
              ) : filtered.length === 0 ? (
                <EmptyState
                  title="No items match your filters"
                  description="Try adjusting your search or filter criteria"
                  icon={<Search className="h-12 w-12 text-muted-foreground/50" />}
                  secondary={{
                    label: 'Clear Filters',
                    onClick: () => {
                      setSearch('');
                      setStockFilter('all');
                    },
                  }}
                />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-y bg-muted/50">
                        <tr>
                          <TableHeader
                            label="Item Name"
                            sortKey="item_name"
                            currentSort={sort}
                            onSort={() => toggleSort('item_name')}
                            align="left"
                            width="40%"
                          />
                          <TableHeader
                            label="Supply"
                            sortKey="supply"
                            currentSort={sort}
                            onSort={() => toggleSort('supply')}
                            align="right"
                            width="15%"
                          />
                          <TableHeader
                            label="Unit"
                            sortKey="unit"
                            currentSort={sort}
                            onSort={() => toggleSort('unit')}
                            align="left"
                            width="15%"
                          />
                          <TableHeader
                            label="Cost"
                            sortKey="cost"
                            currentSort={sort}
                            onSort={() => toggleSort('cost')}
                            align="right"
                            width="15%"
                          />
                          <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {paged.map((row, idx) => (
                          <TableRow
                            key={row.item_id}
                            index={idx}
                            row={row}
                            isEditing={editingId === row.item_id}
                            isFlashing={flashRowId === row.item_id}
                            form={form}
                            thresholds={thresholds}
                            searchQuery={debouncedSearch}
                            onEdit={() => startEdit(row)}
                            onSave={saveEdit}
                            onCancel={cancelEdit}
                            onDelete={() => setDeleteTarget(row)}
                            onFormChange={setForm}
                            formIsValid={formIsValid}
                            formIsDirty={formIsDirty}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {sorted.length > 0 && (
                    <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-muted-foreground">
                        Showing{' '}
                        <span className="font-medium text-foreground">
                          {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, sorted.length)}
                        </span>{' '}
                        of <span className="font-medium text-foreground">{sorted.length}</span> items
                      </p>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <label htmlFor="pageSize" className="text-sm text-muted-foreground">
                            Items per page:
                          </label>
                          <select
                            id="pageSize"
                            className="rounded-md border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-accent"
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                          >
                            {PAGE_SIZE_OPTIONS.map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="sr-only">Previous</span>
                          </Button>

                          <div className="flex h-9 min-w-[100px] items-center justify-center rounded-md border bg-background px-3 text-sm">
                            Page {page} of {pageCount}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= pageCount}
                            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                          >
                            <ChevronRight className="h-4 w-4" />
                            <span className="sr-only">Next</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Add New Item Form */}
          <div ref={addFormRef} className="lg:col-span-4 xl:col-span-3">
            <Card className="sticky top-6">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <PlusCircle className="h-5 w-5" />
                  Add New Item
                </CardTitle>
                <CardDescription>Add a new item to your inventory</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={addNewItem} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="item-name" className="text-sm font-medium">
                      Item Name
                    </label>
                    <Input
                      id="item-name"
                      placeholder="e.g., Coffee Beans"
                      value={newItem.item_name}
                      onChange={(e) => setNewItem((s) => ({ ...s, item_name: e.target.value }))}
                      className="h-10"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label htmlFor="supply" className="text-sm font-medium">
                        Initial Supply
                      </label>
                      <Input
                        id="supply"
                        type="number"
                        min={0}
                        step="1"
                        placeholder="0"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem((s) => ({ ...s, quantity: e.target.value }))}
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="unit" className="text-sm font-medium">
                        Unit
                      </label>
                      <Input
                        id="unit"
                        placeholder="e.g., bags"
                        value={newItem.unit}
                        onChange={(e) => setNewItem((s) => ({ ...s, unit: e.target.value }))}
                        className="h-10"
                      />
                    </div>
                  </div>

                  <QuickUnits
                    units={quickUnits}
                    builtins={Array.from(BUILTIN_UNITS)}
                    selected={newItem.unit}
                    onSelect={(u) => setNewItem((s) => ({ ...s, unit: u }))}
                    onAdd={(u) => {
                      const v = u.trim();
                      if (!v) return;
                      if (quickUnits.some((q) => q.toLowerCase() === v.toLowerCase())) {
                        toast.error('This unit already exists');
                        return;
                      }
                      setQuickUnits((prev) => [...prev, v]);
                      toast.success(`Added "${v}" to quick units`);
                    }}
                    onRemove={(u) => {
                      setQuickUnits((prev) => prev.filter((q) => q.toLowerCase() !== u.toLowerCase()));
                      setNewItem((s) => (s.unit.toLowerCase() === u.toLowerCase() ? { ...s, unit: '' } : s));
                    }}
                  />

                  <div className="space-y-2">
                    <label htmlFor="cost" className="text-sm font-medium">
                      Unit Cost
                    </label>
                    <Input
                      id="cost"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      value={newItem.cost}
                      onChange={(e) => setNewItem((s) => ({ ...s, cost: e.target.value }))}
                      className="h-10"
                    />
                    {newItem.cost && parseFloat(newItem.cost) > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(parseFloat(newItem.cost))} per {newItem.unit || 'unit'}
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" size="lg">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item to Inventory
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Item</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <span className="font-semibold">{deleteTarget?.item_name}</span>? This
                action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deleteTarget) {
                    deleteRow(deleteTarget);
                    setDeleteTarget(null);
                  }
                }}
              >
                Delete Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default InventoryPage;

// -------------------- Sub-components --------------------

function StockStatusCard({
  label,
  count,
  icon,
  variant,
  active,
  onClick,
}: {
  label: string;
  count: number;
  icon: React.ReactNode;
  variant: 'default' | 'destructive' | 'warning' | 'success';
  active: boolean;
  onClick: () => void;
}) {
  const variantStyles = {
    default: 'hover:border-primary/50',
    destructive: 'hover:border-destructive/50',
    warning: 'hover:border-orange-500/50',
    success: 'hover:border-emerald-500/50',
  };

  const iconStyles = {
    default: 'text-muted-foreground',
    destructive: 'text-destructive',
    warning: 'text-orange-500',
    success: 'text-emerald-500',
  };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        variantStyles[variant],
        active && 'ring-2 ring-primary ring-offset-2'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{count}</p>
          </div>
          <div className={cn('rounded-full bg-background p-3', iconStyles[variant])}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function TableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
  align = 'left',
  width,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: { key: SortKey; dir: SortDir };
  onSort: () => void;
  align?: 'left' | 'right';
  width?: string;
}) {
  const isActive = currentSort.key === sortKey;
  return (
    <th
      style={{ width }}
      className={cn(
        'cursor-pointer select-none px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/50',
        align === 'right' && 'text-right'
      )}
      onClick={onSort}
    >
      <div className={cn('flex items-center gap-1', align === 'right' && 'justify-end')}>
        <span>{label}</span>
        {!isActive ? (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
        ) : currentSort.dir === 'asc' ? (
          <ArrowUp className="h-3.5 w-3.5" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" />
        )}
      </div>
    </th>
  );
}

function TableRow({
  index,
  row,
  isEditing,
  isFlashing,
  form,
  thresholds,
  searchQuery,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onFormChange,
  formIsValid,
  formIsDirty,
}: {
  index: number;
  row: InventoryRow;
  isEditing: boolean;
  isFlashing: boolean;
  form: { item_name: string; supply: string; unit: string; cost: string };
  thresholds: Thresholds;
  searchQuery: string;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onFormChange: (form: any) => void;
  formIsValid: boolean;
  formIsDirty: boolean;
}) {
  const severity = getSeverity(row.supply, thresholds);
  const stockPercentage = thresholds.warn > 0 ? Math.min(100, (row.supply / thresholds.warn) * 100) : 100;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isEditing) return;
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <tr
      className={cn(
        'group transition-all',
        // Subtle zebra striping for non-severity rows (every other row) a
        // Slightly darker than before for better visibility
        severity === 'ok' && !isEditing && !isFlashing && index % 2 === 1 && 'bg-muted/20 dark:bg-muted/30',
        !isEditing && 'hover:bg-muted/50',
        isEditing && 'bg-accent/50',
        isFlashing && 'animate-pulse bg-emerald-50 dark:bg-emerald-950/20',
        // Add severity-based row tints (take precedence over zebra because they only apply when severity !== 'ok')
        severity === 'crit' && !isEditing && !isFlashing && 
          'bg-red-50/50 dark:bg-red-950/10 hover:bg-red-100/50 dark:hover:bg-red-950/20',
        severity === 'warn' && !isEditing && !isFlashing && 
          'bg-amber-50/50 dark:bg-amber-950/10 hover:bg-amber-100/50 dark:hover:bg-amber-950/20'
      )}
      onDoubleClick={() => !isEditing && onEdit()}
      onKeyDown={handleKeyDown}
    >
      <td className="relative px-4 py-3">
        {/* Add severity indicator pill */}
        {severity !== 'ok' && (
          <div
            className={cn(
              'absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full transition-all',
              severity === 'crit' 
                ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]' 
                : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
            )}
          />
        )}
        {isEditing ? (
          <Input
            value={form.item_name}
            onChange={(e) => onFormChange({ ...form, item_name: e.target.value })}
            className="h-9"
            autoFocus
          />
        ) : (
          <div className={cn(
            'font-medium transition-colors',
            severity !== 'ok' && 'pl-3' // Add padding when pill is shown
          )}>
            {highlight(row.item_name, searchQuery)}
          </div>
        )}
      </td>

      <td className="px-4 py-3 text-right">
        {isEditing ? (
          <Input
            type="number"
            min={0}
            step="1"
            value={form.supply}
            onChange={(e) => onFormChange({ ...form, supply: e.target.value })}
            className="h-9 text-right"
          />
        ) : (
          <div className="space-y-1.5">
            <div className={cn('flex items-center gap-2', severity !== 'ok' ? 'justify-between' : 'justify-end')}>
              {severity !== 'ok' && (
                <Badge 
                  variant={severity === 'crit' ? 'destructive' : 'secondary'} 
                  className={cn(
                    'h-5 px-1.5 transition-colors',
                    severity === 'crit'
                      ? 'bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40 border-red-200 dark:border-red-800'
                      : 'bg-amber-100 text-amber-700 hover:bg-amber-200 hover:text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40 border-amber-200 dark:border-amber-800'
                  )}
                >
                  {severity === 'crit' ? 'Critical' : 'Low'}
                </Badge>
              )}
              <span className="font-medium tabular-nums">{row.supply}</span>
            </div>
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full transition-all',
                  severity === 'crit' ? 'bg-destructive' : severity === 'warn' ? 'bg-orange-500' : 'bg-emerald-500'
                )}
                style={{ width: `${stockPercentage}%` }}
              />
            </div>
          </div>
        )}
      </td>

      <td className="px-4 py-3">
        {isEditing ? (
          <Input
            placeholder="Unit"
            value={form.unit}
            onChange={(e) => onFormChange({ ...form, unit: e.target.value })}
            className="h-9"
          />
        ) : (
          <span className={!row.unit ? 'text-muted-foreground' : ''}>{row.unit || '—'}</span>
        )}
      </td>

      <td className="px-4 py-3 text-right">
        {isEditing ? (
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.cost}
            onChange={(e) => onFormChange({ ...form, cost: e.target.value })}
            className="h-9 text-right"
          />
        ) : (
          <span className="font-medium tabular-nums">{formatCurrency(parseFloat(row.cost))}</span>
        )}
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {isEditing ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={onSave}
                    disabled={!formIsValid || !formIsDirty}
                    className="h-8 px-2"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Save (Ctrl+Enter)</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" onClick={onCancel} className="h-8 px-2">
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cancel (Esc)</p>
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={onEdit} 
                    className="h-8 w-8 p-0"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit item</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onDelete}
                    className="group h-8 w-8 p-0 hover:border-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-destructive" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete item</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function QuickUnits({
  units,
  builtins,
  selected,
  onSelect,
  onAdd,
  onRemove,
}: {
  units: string[];
  builtins: string[];
  selected: string;
  onSelect: (u: string) => void;
  onAdd: (u: string) => void;
  onRemove: (u: string) => void;
}) {
  const [newUnit, setNewUnit] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const handleAdd = () => {
    if (newUnit.trim()) {
      onAdd(newUnit.trim());
      setNewUnit('');
      setShowAdd(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Quick Units</label>
        {!showAdd && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdd(true)}
            className="h-7 gap-1 px-2 text-xs"
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {units.map((unit) => {
          const isCustom = !builtins.includes(unit);
          return (
            <div key={unit} className="group relative">
              <Button
                type="button"
                variant={selected === unit ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSelect(unit === selected ? '' : unit)}
                className="h-8 pr-2"
              >
                {unit}
              </Button>
              {isCustom && (
                <button
                  type="button"
                  className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground group-hover:flex"
                  onClick={() => onRemove(unit)}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {showAdd && (
        <div className="flex gap-2">
          <Input
            placeholder="New unit (e.g., kg)"
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              } else if (e.key === 'Escape') {
                setNewUnit('');
                setShowAdd(false);
              }
            }}
            className="h-9"
            autoFocus
          />
          <Button type="button" size="sm" onClick={handleAdd} className="h-9">
            Add
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setNewUnit('');
              setShowAdd(false);
            }}
            className="h-9"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

function ThresholdsDialog({
  thresholds,
  onSave,
  children,
}: {
  thresholds: Thresholds;
  onSave: (t: Thresholds) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<Thresholds>(thresholds);

  useEffect(() => {
    if (open) setLocal(thresholds);
  }, [thresholds, open]);

  const handleSave = () => {
    const warn = Number(local.warn);
    const crit = Number(local.crit);

    if (!Number.isFinite(warn) || warn < 0) {
      toast.error('Warning threshold must be a positive number');
      return;
    }
    if (!Number.isFinite(crit) || crit < 0) {
      toast.error('Critical threshold must be a positive number');
      return;
    }
    if (crit > warn) {
      toast.error('Critical threshold must be less than or equal to warning threshold');
      return;
    }

    onSave({ warn, crit });
    setOpen(false);
    toast.success('Thresholds updated successfully');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Stock Thresholds</DialogTitle>
          <DialogDescription>
            Set the supply levels that trigger low stock and critical stock warnings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="warn" className="flex items-center gap-2 text-sm font-medium">
              <TrendingDown className="h-4 w-4 text-orange-500" />
              Low Stock Warning Level
            </label>
            <Input
              id="warn"
              type="number"
              min={0}
              step={1}
              value={local.warn}
              onChange={(e) => setLocal({ ...local, warn: Number(e.target.value) })}
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              Items with supply ≤ {local.warn} will be marked as low stock
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="crit" className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Critical Stock Level
            </label>
            <Input
              id="crit"
              type="number"
              min={0}
              step={1}
              value={local.crit}
              onChange={(e) => setLocal({ ...local, crit: Number(e.target.value) })}
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              Items with supply ≤ {local.crit} will be marked as critical
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-y bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Item Name
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Supply
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Unit
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Cost
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td className="px-4 py-3">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              </td>
              <td className="px-4 py-3">
                <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-12 animate-pulse rounded bg-muted" />
              </td>
              <td className="px-4 py-3">
                <div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted" />
              </td>
              <td className="px-4 py-3">
                <div className="ml-auto flex gap-1">
                  <div className="h-8 w-8 animate-pulse rounded bg-muted" />
                  <div className="h-8 w-8 animate-pulse rounded bg-muted" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({
  title,
  description,
  icon,
  primary,
  secondary,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  primary?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
      <div className="rounded-full bg-muted p-4">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 flex gap-2">
        {secondary && (
          <Button variant="outline" onClick={secondary.onClick}>
            {secondary.label}
          </Button>
        )}
        {primary && <Button onClick={primary.onClick}>{primary.label}</Button>}
      </div>
    </div>
  );
}