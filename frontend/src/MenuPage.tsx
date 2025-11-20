import React, { useEffect, useMemo, useState } from "react";
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

// --- Removed unused imports (Command, Popover, Check, ChevronsUpDown) ---

const API_BASE_URL = `${API_URL}/api`;

interface MenuItem {
  item_id: number;
  item_name: string;
  cost: string;
  category: string;
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

export default function MenuPage() {
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
  const [openIngredientsAfterCreate, setOpenIngredientsAfterCreate] = useState(true);
  
  // Category Suggestions State (Custom Autocomplete)
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

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
    let res = menuItems;
    if (query.trim()) {
      const q = query.toLowerCase();
      res = menuItems.filter(
        (m) =>
          m.item_name.toLowerCase().includes(q) ||
          (m.category || "").toLowerCase().includes(q)
      );
    }
    return [...res].sort((a, b) => a.item_id - b.item_id);
  }, [menuItems, query]);

  const categoryOptions = useMemo(
    () => Array.from(new Set(menuItems.map((m) => m.category).filter(Boolean))).sort(),
    [menuItems]
  );

  // Filter category options based on what user types
  const filteredCategoryOptions = useMemo(() => {
    if (!newItemCategory) return categoryOptions;
    return categoryOptions.filter(c => 
      c.toLowerCase().includes(newItemCategory.toLowerCase())
    );
  }, [categoryOptions, newItemCategory]);

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

  // Delete Item
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
    <div className="flex h-full bg-background">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b bg-white">
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
        <DialogContent className="overflow-visible">
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
            
            {/* Custom Autocomplete for Category */}
            <div className="grid gap-2 relative">
              <Label htmlFor="newCategory">Category</Label>
              <Input
                id="newCategory"
                value={newItemCategory}
                onChange={(e) => {
                  setNewItemCategory(e.target.value);
                  setShowCategorySuggestions(true);
                }}
                onFocus={() => setShowCategorySuggestions(true)}
                onBlur={() => {
                  // Delay closing to allow click event to fire
                  setTimeout(() => setShowCategorySuggestions(false), 200);
                }}
                placeholder="Select or type category..."
                required
                autoComplete="off"
              />
              
              {/* Suggestions List */}
              {showCategorySuggestions && filteredCategoryOptions.length > 0 && (
                <div className="absolute top-[70px] left-0 right-0 z-10 max-h-48 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
                  {filteredCategoryOptions.map((category) => (
                    <div
                      key={category}
                      className="cursor-pointer px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                      onMouseDown={(e) => e.preventDefault()} 
                      onClick={() => {
                        setNewItemCategory(category);
                        setShowCategorySuggestions(false);
                      }}
                    >
                      {category}
                    </div>
                  ))}
                </div>
              )}
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

      {/* Edit Item Dialog */}
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

/* =========================================================
   INTERNAL COMPONENT: INGREDIENTS DIALOG
   =========================================================
*/

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

  // Add new inventory state
  const [newIngName, setNewIngName] = useState("");
  const [newIngStock, setNewIngStock] = useState<number | "">("");
  const [newIngCost, setNewIngCost] = useState("0.00");
  const [newIngUnit, setNewIngUnit] = useState(""); 
  
  // Unit Suggestions State (Custom Autocomplete)
  const [showUnitSuggestions, setShowUnitSuggestions] = useState(false);

  const loadInventory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory`);
      const data: InventoryItem[] = await res.json();
      setInventory(data);
    } catch {
      toast.error("Failed to load inventory");
    }
  };

  // Compute unique units for the list
  const uniqueUnits = useMemo(() => {
    const units = inventory.map((i) => i.unit).filter(Boolean);
    return Array.from(new Set(units)).sort();
  }, [inventory]);

  // Filter unit options based on input
  const filteredUnitOptions = useMemo(() => {
    if (!newIngUnit) return uniqueUnits;
    return uniqueUnits.filter(u => 
      u.toLowerCase().includes(newIngUnit.toLowerCase())
    );
  }, [uniqueUnits, newIngUnit]);

  const loadExisting = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/menu/${item.item_id}/ingredients`);
      if (!res.ok) throw new Error("Failed to load existing ingredients");
      const payload = await res.json();
      const list: { id: number; name?: string; quantity: number }[] =
        Array.isArray(payload) ? payload : payload.ingredients || [];

      const preselected: Record<number, number> = {};
      for (const ing of list) {
        preselected[ing.id] = Number(ing.quantity) || 0;
      }
      setSelected(preselected);
    } catch (e: any) {
      console.warn(e?.message || e);
    }
  };

  useEffect(() => {
    if (open) {
      loadInventory();
      loadExisting();
    } else {
      setSelected({});
    }
  }, [open, item.item_id]);

  const toggleIngredient = (id: number, checked: boolean) => {
    setSelected((prev) => {
      const copy = { ...prev };
      if (checked) {
        copy[id] = 0;
      } else {
        delete copy[id];
      }
      return copy;
    });
  };

  const changeQty = (id: number, value: string) => {
    const qty = value === "" ? 0 : parseInt(value, 10);
    setSelected((prev) => ({ ...prev, [id]: Math.max(0, qty) }));
  };

  const saveIngredients = async () => {
    const hasZeroQuantity = Object.values(selected).some((qty) => qty <= 0);

    if (hasZeroQuantity) {
      toast.error("Please set a quantity for all selected ingredients.");
      return;
    }

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
          unit: newIngUnit, 
        }),
      });
      if (!res.ok) throw new Error("Failed to add inventory item");
      toast.success("Inventory item added");
      setNewIngName("");
      setNewIngStock("");
      setNewIngCost("0.00");
      setNewIngUnit(""); 
      await loadInventory();
    } catch (e: any) {
      toast.error(e?.message ?? "Error adding inventory item");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl overflow-visible">
        <DialogHeader>
          <DialogTitle>Ingredients for {item.item_name}</DialogTitle>
          <DialogDescription>
            Select ingredients from the list below. You must specify the quantity used per drink.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column: Ingredient picker */}
          <div>
            <div className="text-sm font-medium mb-2">Select Inventory Items</div>
            <div className="max-h-[500px] overflow-auto rounded-md border p-1">
              {inventory.map((inv) => {
                const isChecked = selected[inv.item_id] !== undefined;
                const currentQty = isChecked ? selected[inv.item_id] : 0;
                const isInvalid = isChecked && currentQty <= 0;

                return (
                  <div
                    key={inv.item_id}
                    className={`flex items-start gap-3 px-3 py-3 border-b last:border-0 hover:bg-muted/20 transition-colors ${
                      isChecked ? "bg-muted/30" : ""
                    }`}
                  >
                    <input
                      id={`inv-${inv.item_id}`}
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-1 shrink-0"
                      checked={isChecked}
                      onChange={(e) => toggleIngredient(inv.item_id, e.target.checked)}
                    />
                    <div className="flex-1 flex items-start justify-between gap-4 min-w-0">
                      <Label
                        htmlFor={`inv-${inv.item_id}`}
                        className="cursor-pointer font-normal leading-snug break-words pt-0.5 flex-1"
                      >
                        {inv.item_name}
                      </Label>
                      
                      {/* Quantity Input Group */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground text-right pt-1.5">
                          Qty:
                        </span>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            className={`w-20 h-9 px-2 text-center ${isInvalid ? "border-red-500 ring-red-500" : ""}`}
                            value={isChecked && currentQty > 0 ? currentQty : ""}
                            disabled={!isChecked}
                            placeholder=""
                            onChange={(e) =>
                              changeQty(inv.item_id, e.target.value)
                            }
                          />
                          {/* Unit Label */}
                          <span 
                            className="text-xs text-muted-foreground w-28 truncate text-left pt-1.5" 
                            title={inv.unit} 
                          >
                            {inv.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {inventory.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No inventory items found. Add some on the right.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Add new inventory item */}
          <div className="border-l pl-8 flex flex-col">
            <div className="mb-6">
                <h3 className="font-semibold text-sm">Missing an ingredient?</h3>
                <p className="text-sm text-muted-foreground">
                    Add a new database entry here so you can select it on the left.
                </p>
            </div>
            
            <form onSubmit={addInventoryItem} className="space-y-4 bg-muted/20 p-4 rounded-lg border">
              <div className="grid gap-2">
                <Label htmlFor="ingName">Ingredient Name</Label>
                <Input
                  id="ingName"
                  value={newIngName}
                  onChange={(e) => setNewIngName(e.target.value)}
                  placeholder="e.g. Tapioca pearls"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ingStock">Initial Stock Level</Label>
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
                <Label htmlFor="ingCost">Unit Cost ($)</Label>
                <Input
                  id="ingCost"
                  value={newIngCost}
                  onChange={(e) => setNewIngCost(e.target.value)}
                  placeholder="e.g. 4.99"
                  required
                />
              </div>
              
              {/* Unit Custom Autocomplete */}
              <div className="grid gap-2 relative">
                <Label htmlFor="ingUnit">Unit</Label>
                <Input
                  id="ingUnit"
                  value={newIngUnit}
                  onChange={(e) => {
                    setNewIngUnit(e.target.value);
                    setShowUnitSuggestions(true);
                  }}
                  onFocus={() => setShowUnitSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowUnitSuggestions(false), 200)}
                  placeholder="e.g. grams, oz, count"
                  autoComplete="off"
                />
                {showUnitSuggestions && filteredUnitOptions.length > 0 && (
                  <div className="absolute top-[70px] left-0 right-0 z-10 max-h-48 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
                    {filteredUnitOptions.map((u) => (
                      <div
                        key={u}
                        className="cursor-pointer px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setNewIngUnit(u);
                          setShowUnitSuggestions(false);
                        }}
                      >
                        {u}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" variant="secondary" className="w-full gap-2 mt-2">
                <Plus className="h-4 w-4" />
                Add to Database
              </Button>
            </form>
          </div>
        </div>

        <Separator className="my-4" />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="gap-2 min-w-[100px]" onClick={saveIngredients} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Recipe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}