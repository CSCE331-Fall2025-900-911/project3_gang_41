import { useEffect, useMemo, useState } from "react";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Pencil,
  Trash2,
  ListChecks,
  Loader2,
  RefreshCw,
  Coffee,
} from "lucide-react";

const API_BASE_URL = `${API_URL}/api`;

interface MenuItem {
  item_id: number;
  item_name: string;
  cost: string;     // numeric -> string from API
  category: string; // now in DB
}

interface InventoryItem {
  item_id: number;
  item_name: string;
  supply: number;
  unit: string;
  cost: string;
}

const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search
  const [query, setQuery] = useState("");

  // Add item dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCost, setNewItemCost] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [openIngredientsAfterCreate, setOpenIngredientsAfterCreate] =
    useState(true);

  // Edit item dialog
  const [editOpen, setEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [updateName, setUpdateName] = useState("");
  const [updatePrice, setUpdatePrice] = useState("");

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Ingredients dialog
  const [ingredientsOpen, setIngredientsOpen] = useState(false);

  const loadMenuItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/menu`);
      if (!res.ok) throw new Error("Failed to fetch menu items");
      const data: MenuItem[] = await res.json();
      setMenuItems(data);
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
      toast.error("Failed to load menu");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMenuItems();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return menuItems;
    const q = query.toLowerCase();
    return menuItems.filter(
      (m) =>
        m.item_name.toLowerCase().includes(q) ||
        (m.category || "").toLowerCase().includes(q)
    );
  }, [menuItems, query]);

  const categoryOptions = useMemo(
    () => Array.from(new Set(menuItems.map((m) => m.category))).sort(),
    [menuItems]
  );

  // Add
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemCategory.trim()) {
      toast.error("Please provide a category");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_name: newItemName,
          cost: newItemCost,
          category: newItemCategory,
        }),
      });
      if (!res.ok) throw new Error("Failed to add new item");
      const created: MenuItem = await res.json();

      toast.success(`Added ${created.item_name}`);
      setAddOpen(false);
      setNewItemName("");
      setNewItemCost("");
      setNewItemCategory("");
      await loadMenuItems();

      if (openIngredientsAfterCreate) {
        setSelectedItem(created);
        setIngredientsOpen(true);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Error adding item");
    }
  };

  // Edit
  const openEdit = (item: MenuItem) => {
    setSelectedItem(item);
    setUpdateName(item.item_name);
    setUpdatePrice(parseFloat(item.cost || "0").toFixed(2));
    setEditOpen(true);
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      const res = await fetch(`${API_BASE_URL}/menu/${selectedItem.item_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_name: updateName,
          cost: updatePrice,
          // include category here too if you want to edit it later
        }),
      });
      if (!res.ok) throw new Error("Failed to update item");
      toast.success("Item updated");
      setEditOpen(false);
      setSelectedItem(null);
      setUpdateName("");
      setUpdatePrice("");
      await loadMenuItems();
    } catch (e: any) {
      toast.error(e?.message ?? "Error updating item");
    }
  };

  // Delete
  const confirmDelete = (item: MenuItem) => {
    setSelectedItem(item);
    setDeleteOpen(true);
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/menu/${selectedItem.item_id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete item");
      toast.success(`Deleted ${selectedItem.item_name}`);
      setDeleteOpen(false);
      setSelectedItem(null);
      await loadMenuItems();
    } catch (e: any) {
      toast.error(e?.message ?? "Error deleting item");
    }
  };

  // Ingredients
  const openIngredients = (item: MenuItem) => {
    setSelectedItem(item);
    setIngredientsOpen(true);
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b">
          <div className="flex h-16 items-center px-6 justify-between">
            <div className="flex items-center gap-2">
              <Coffee className="h-5 w-5" />
              <h1 className="text-2xl font-bold">Menu Items</h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:block">
                <Input
                  placeholder="Search by name or category..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-[260px]"
                />
              </div>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => loadMenuItems()}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </Button>
              <Button className="gap-2" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                New Item
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-lg">All Menu Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading && menuItems.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading menu...
                </div>
              ) : error ? (
                <div className="p-6 text-sm text-destructive">{error}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="w-32">Price</TableHead>
                        <TableHead className="w-48 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((item) => (
                        <TableRow key={item.item_id} className="hover:bg-muted/50">
                          <TableCell className="font-mono text-xs">
                            #{item.item_id}
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.item_name}
                          </TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>
                            {currency(parseFloat(item.cost || "0"))}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => openEdit(item)}
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => openIngredients(item)}
                              >
                                <ListChecks className="h-4 w-4" />
                                Ingredients
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="gap-2"
                                onClick={() => confirmDelete(item)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filtered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                            No items found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Item Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add new item</DialogTitle>
            <DialogDescription>
              Create a menu item with a base (pre-tax) price and category.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="newName">Name</Label>
              <Input
                id="newName"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newCost">Price</Label>
              <Input
                id="newCost"
                value={newItemCost}
                onChange={(e) => setNewItemCost(e.target.value)}
                placeholder="e.g. 5.99"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newCategory">Category</Label>
              {/* Using native datalist for suggestions based on existing categories */}
              <Input
                id="newCategory"
                list="categoryOptions"
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                placeholder="e.g. Milk Tea, Matcha, Fruit Tea, Slush"
                required
              />
              <datalist id="categoryOptions">
                {categoryOptions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="afterCreate"
                type="checkbox"
                className="h-4 w-4"
                checked={openIngredientsAfterCreate}
                onChange={(e) => setOpenIngredientsAfterCreate(e.target.checked)}
              />
              <Label htmlFor="afterCreate">Open ingredients after create</Label>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog (name + price) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit item</DialogTitle>
            <DialogDescription>
              Update the name and price for {selectedItem?.item_name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateItem} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="editName">Name</Label>
              <Input
                id="editName"
                value={updateName}
                onChange={(e) => setUpdateName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editPrice">Price</Label>
              <Input
                id="editPrice"
                value={updatePrice}
                onChange={(e) => setUpdatePrice(e.target.value)}
                required
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2">
                <Pencil className="h-4 w-4" />
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedItem?.item_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone and will remove the item from the menu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ingredients Dialog */}
      {selectedItem && (
        <IngredientsDialog
          open={ingredientsOpen}
          onOpenChange={setIngredientsOpen}
          item={selectedItem}
          onSaved={() => {
            toast.success("Ingredients saved");
            setIngredientsOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Ingredients Dialog (unchanged behavior) ---------- */

type IngredientsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuItem;
  onSaved: () => void;
};

function IngredientsDialog({ open, onOpenChange, item, onSaved }: IngredientsDialogProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);

  // Add new inventory
  const [newIngName, setNewIngName] = useState("");
  const [newIngStock, setNewIngStock] = useState<number | "">("");
  const [newIngCost, setNewIngCost] = useState("0.00");

  const loadInventory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory`);
      const data: InventoryItem[] = await res.json();
      setInventory(data);
    } catch {
      toast.error("Failed to load inventory");
    }
  };

  const loadExisting = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/menu/${item.item_id}/ingredients`);
      if (!res.ok) throw new Error("Failed to load existing ingredients");
      const payload = await res.json();
      const list: { id: number; name?: string; quantity: number }[] =
        Array.isArray(payload) ? payload : payload.ingredients || [];

      // Map to { [inventory_id]: quantity }
      const preselected: Record<number, number> = {};
      for (const ing of list) {
        preselected[ing.id] = Number(ing.quantity) || 1;
      }
      setSelected(preselected);
    } catch (e: any) {
      // Not fatal—dialog still works
      console.warn(e?.message || e);
    }
  };

  useEffect(() => {
    if (open) {
      loadInventory();
      loadExisting();
    } else {
      // reset when closing to avoid leak across items
      setSelected({});
    }
  }, [open, item.item_id]);

  const toggleIngredient = (id: number, checked: boolean) => {
    setSelected((prev) => {
      const copy = { ...prev };
      if (checked) copy[id] = copy[id] ?? 1;
      else delete copy[id];
      return copy;
    });
  };

  const changeQty = (id: number, qty: number) => {
    setSelected((prev) => ({ ...prev, [id]: Math.max(1, qty) }));
  };

  const saveIngredients = async () => {
    setLoading(true);
    try {
      const ingredientsToSave = Object.entries(selected).map(([id, quantity]) => ({
        id: Number(id),
        quantity,
      }));
      const res = await fetch(`${API_BASE_URL}/menu/${item.item_id}/ingredients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: ingredientsToSave }),
      });
      if (!res.ok) throw new Error("Failed to save ingredients");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Error saving ingredients");
    } finally {
      setLoading(false);
    }
  };

  const addInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_name: newIngName,
          quantity: newIngStock || 0,
          cost: newIngCost,
        }),
      });
      if (!res.ok) throw new Error("Failed to add inventory item");
      toast.success("Inventory item added");
      setNewIngName("");
      setNewIngStock("");
      setNewIngCost("0.00");
      await loadInventory();
    } catch (e: any) {
      toast.error(e?.message ?? "Error adding inventory item");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Ingredients for {item.item_name}</DialogTitle>
          <DialogDescription>
            Select ingredients and set the quantity used per drink.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Ingredient picker */}
          <div>
            <div className="text-sm font-medium mb-2">Inventory</div>
            <div className="max-h-72 overflow-auto rounded border">
              {inventory.map((inv) => {
                const checked = selected[inv.item_id] !== undefined;
                return (
                  <div
                    key={inv.item_id}
                    className="flex items-center justify-between px-3 py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        id={`inv-${inv.item_id}`}
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked}
                        onChange={(e) => toggleIngredient(inv.item_id, e.target.checked)}
                      />
                      <Label htmlFor={`inv-${inv.item_id}`} className="cursor-pointer">
                        {inv.item_name}
                      </Label>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      className="w-20"
                      value={checked ? selected[inv.item_id] : 1}
                      disabled={!checked}
                      onChange={(e) =>
                        changeQty(inv.item_id, parseInt(e.target.value || "1", 10))
                      }
                    />
                  </div>
                );
              })}
              {inventory.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">
                  No inventory items yet.
                </div>
              )}
            </div>
          </div>

          {/* Add new inventory item */}
          <form onSubmit={addInventoryItem} className="space-y-3">
            <div className="text-sm font-medium">Add inventory item</div>
            <div className="grid gap-2">
              <Label htmlFor="ingName">Name</Label>
              <Input
                id="ingName"
                value={newIngName}
                onChange={(e) => setNewIngName(e.target.value)}
                placeholder="e.g. Tapioca pearls"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ingStock">Starting stock</Label>
              <Input
                id="ingStock"
                type="number"
                min={0}
                value={newIngStock}
                onChange={(e) =>
                  setNewIngStock(e.target.value === "" ? "" : parseInt(e.target.value, 10))
                }
                placeholder="e.g. 100"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ingCost">Cost</Label>
              <Input
                id="ingCost"
                value={newIngCost}
                onChange={(e) => setNewIngCost(e.target.value)}
                placeholder="e.g. 4.99"
                required
              />
            </div>
            <Button type="submit" variant="outline" className="gap-2">
              Add to inventory
            </Button>
          </form>
        </div>

        <Separator className="my-2" />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button className="gap-2" onClick={saveIngredients} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MenuPage;