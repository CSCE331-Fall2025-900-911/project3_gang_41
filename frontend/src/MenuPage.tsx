import React, { useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/api";
// Types from shared package
import type { MenuItem, InventoryItem } from "@project3/shared";
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
  FlaskConical, 
  PartyPopper,
  Sparkles,
  Zap,
} from "lucide-react";


// --- Types are imported from `@project3/shared` ---

const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

// --- Sound Effects Engine (Web Audio API) ---
// Safety check: window is undefined during build time
const AudioContextConstructor = typeof window !== 'undefined' 
  ? (window.AudioContext || (window as any).webkitAudioContext) 
  : null;

const audioCtx: AudioContext | null = AudioContextConstructor ? new AudioContextConstructor() : null;

const playSound = (type: 'success' | 'pop' | 'delete' | 'toggle' | 'error' | 'type' | 'click') => {
  if (!audioCtx) return;
  // Resume if suspended due to browser autoplay policies.
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume().catch(() => {});
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === 'success') {
    // Satisfying "Ding!"
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.1); // C6
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.5);
  } else if (type === 'pop') {
    // Short "Pop"
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(50, now + 0.05);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'delete') {
    // Descending "Bloop"
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === 'toggle') {
    // High pitch "Zip"
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.1);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'error') {
    // Low pitch "Buzz"
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.linearRampToValueAtTime(50, now + 0.2);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  } else if (type === 'type') {
    // Very short, quiet "click" for typing
    osc.type = 'sine'; 
    const randomPitch = 800 + Math.random() * 200; 
    osc.frequency.setValueAtTime(randomPitch, now);
    gain.gain.setValueAtTime(0.05, now); 
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03); 
    osc.start(now);
    osc.stop(now + 0.03);
  } else if (type === 'click') {
    // Generic UI click
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, now);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.05);
  }
};

// --- Simple Confetti Effect ---
const fireConfetti = () => {
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff'];
  for (let i = 0; i < 50; i++) {
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.left = Math.random() * 100 + 'vw';
    div.style.top = '-10px';
    div.style.width = '10px';
    div.style.height = '10px';
    div.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    div.style.transition = 'transform 2s linear, opacity 2s ease-out';
    div.style.zIndex = '9999';
    div.style.pointerEvents = 'none';
    document.body.appendChild(div);
    setTimeout(() => {
      div.style.transform = `translate(${Math.random() * 100 - 50}px, ${window.innerHeight + 20}px) rotate(${Math.random() * 360}deg)`;
      div.style.opacity = '0';
    }, 50);
    setTimeout(() => {
      div.remove();
    }, 2000);
  }
};

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCost, setNewItemCost] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [openIngredientsAfterCreate, setOpenIngredientsAfterCreate] = useState(true);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [updateName, setUpdateName] = useState("");
  const [updatePrice, setUpdatePrice] = useState("");
  // NEW: State for editing category
  const [updateCategory, setUpdateCategory] = useState("");
  const [showEditCategorySuggestions, setShowEditCategorySuggestions] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [ingredientsOpen, setIngredientsOpen] = useState(false);

  // --- EXPERIMENTAL MODE STATE ---
  const [isExperimental, setIsExperimental] = useState(false);

  const handleBtnClick = () => {
    if (isExperimental) playSound('click');
  };

  const handleTyping = () => {
    if (isExperimental) playSound('type');
  };

  const loadMenuItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use typed fetch helper which unwraps ApiResponse
      const data = await fetchApi<MenuItem[]>('/api/menu');
      setMenuItems(data);
      if (isExperimental && !isLoading) { 
         fireConfetti(); 
         playSound('success');
      }
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
      toast.error("Failed to load menu");
      if (isExperimental) playSound('error');
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

  const filteredCategoryOptions = useMemo(() => {
    if (!newItemCategory) return categoryOptions;
    return categoryOptions.filter(c => 
      c.toLowerCase().includes(newItemCategory.toLowerCase())
    );
  }, [categoryOptions, newItemCategory]);

  // Separate filtered list for the EDIT dialog
  const filteredEditCategoryOptions = useMemo(() => {
    if (!updateCategory) return categoryOptions;
    return categoryOptions.filter(c => 
      c.toLowerCase().includes(updateCategory.toLowerCase())
    );
  }, [categoryOptions, updateCategory]);


  // Add Item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExperimental) playSound('click');

    if (!newItemCategory.trim()) {
      toast.error("Please provide a category");
      if (isExperimental) playSound('error');
      return;
    }
    try {
      const created = await fetchApi<MenuItem>('/api/menu', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_name: newItemName,
          cost: newItemCost,
          category: newItemCategory,
        }),
      });

      toast.success(`Added ${created.item_name}`);
      if (isExperimental) {
          fireConfetti();
          playSound('success');
      }

      setAddOpen(false);
      setNewItemName("");
      setNewItemCost("");
      setNewItemCategory("");
      setShowCategorySuggestions(false);
      await loadMenuItems();

      if (openIngredientsAfterCreate) {
        setSelectedItem(created);
        setIngredientsOpen(true);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Error adding item");
      if (isExperimental) playSound('error');
    }
  };

  // Update Item
  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExperimental) playSound('click');

    if (!selectedItem) return;
    try {
      await fetchApi<MenuItem>(`/api/menu/${selectedItem.item_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_name: updateName,
          cost: updatePrice,
          category: updateCategory, // NEW: Send updated category
        }),
      });
      toast.success("Item updated");
      if (isExperimental) {
          fireConfetti();
          playSound('success');
      }
      setEditOpen(false);
      setSelectedItem(null);
      setUpdateName("");
      setUpdatePrice("");
      setUpdateCategory("");
      await loadMenuItems();
    } catch (e: any) {
      toast.error(e?.message ?? "Error updating item");
      if (isExperimental) playSound('error');
    }
  };

  // Delete Item
  const handleDeleteItem = async () => {
    if (isExperimental) playSound('click');
    if (!selectedItem) return;
    try {
      await fetchApi<null>(`/api/menu/${selectedItem.item_id}`, { method: "DELETE" });
      toast.success(`Deleted ${selectedItem.item_name}`);
      if (isExperimental) playSound('delete');
      setDeleteOpen(false);
      setSelectedItem(null);
      await loadMenuItems();
    } catch (e: any) {
      toast.error(e?.message ?? "Error deleting item");
      if (isExperimental) playSound('error');
    }
  };

  // Open Dialogs
  const openEdit = (item: MenuItem) => {
    if (isExperimental) playSound('pop');
    setSelectedItem(item);
    setUpdateName(item.item_name);
    setUpdatePrice(parseFloat(String(item.cost ?? "0")).toFixed(2));
    setUpdateCategory(item.category || ""); // Pre-fill category
    setEditOpen(true);
  };

  const openIngredients = (item: MenuItem) => {
    if (isExperimental) playSound('pop');
    setSelectedItem(item);
    setIngredientsOpen(true);
  };

  const confirmDelete = (item: MenuItem) => {
    if (isExperimental) playSound('pop');
    setSelectedItem(item);
    setDeleteOpen(true);
  };

  // --- Experimental Styles ---
  const containerClass = isExperimental 
    ? "flex h-full bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 animate-in fade-in duration-500" 
    : "flex h-full bg-background";
    
  const cardClass = isExperimental
    ? "border-2 border-purple-300 shadow-xl shadow-purple-100/50 rounded-xl overflow-hidden bg-white/80 backdrop-blur-sm transition-all hover:scale-[1.005]"
    : "";

  const buttonClass = isExperimental
    ? "transform transition-all hover:scale-105 hover:rotate-1 active:scale-95 font-bold shadow-sm"
    : "";
  
  // Styles for Edit Dialog
  const editDialogHeaderClass = isExperimental ? "bg-gradient-to-r from-blue-100 to-cyan-100 border-b p-6 rounded-t-lg" : "";
  const editTitleClass = isExperimental ? "text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600" : "";
  const editSaveButtonClass = isExperimental ? "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border-0 font-bold text-white transform hover:scale-105 transition-all" : "gap-2";

  // Row Styles - Exaggerated hover and colors
  const rowClass = isExperimental
    ? "hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-50 transition-all duration-300 hover:scale-[1.01] hover:shadow-md cursor-pointer border-l-4 border-transparent hover:border-purple-500"
    : "hover:bg-muted/50";

  return (
    <div className={containerClass}>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`border-b ${isExperimental ? "bg-white/60 backdrop-blur-md border-purple-200" : "bg-white"}`}>
          <div className="flex h-16 items-center px-6 justify-between">
            <div className="flex items-center gap-2">
              {isExperimental ? (
                <PartyPopper className="h-6 w-6 text-purple-600 animate-bounce" />
              ) : (
                <Coffee className="h-5 w-5" />
              )}
              <h1 className={`text-2xl font-bold ${isExperimental ? "bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent" : ""}`}>
                {isExperimental ? "✨ Dopamine Mode ✨" : "Menu Items"}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:block">
                <Input
                  placeholder={isExperimental ? "Search for tasty things..." : "Search by name or category..."}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); handleTyping(); }}
                  className={`w-[260px] ${isExperimental ? "border-purple-300 focus:ring-purple-400 rounded-full bg-white/80" : ""}`}
                />
              </div>
              
              {/* Experimental Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                    setIsExperimental(!isExperimental);
                    playSound('toggle');
                    if (!isExperimental) fireConfetti();
                }}
                title="Huh, what the heck is this?"
                className={isExperimental ? "text-purple-600 bg-purple-100 hover:bg-purple-200" : "text-muted-foreground"}
              >
                <FlaskConical className="h-5 w-5" />
              </Button>

              <Button
                variant="outline"
                className={`gap-2 ${buttonClass} ${isExperimental ? "border-purple-300 hover:bg-purple-50 text-purple-700" : ""}`}
                onClick={() => { handleBtnClick(); loadMenuItems(); }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className={`h-4 w-4 ${isExperimental ? "animate-spin-slow" : ""}`} />
                )}
                Refresh
              </Button>
              <Button 
                className={`gap-2 ${buttonClass} ${isExperimental ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0" : ""}`} 
                onClick={() => { handleBtnClick(); setAddOpen(true); }}
              >
                <Plus className="h-4 w-4" />
                New Item
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <Card className={cardClass}>
            <CardHeader className="p-4">
              <CardTitle className="text-lg flex items-center gap-2">
                 {isExperimental && <Sparkles className="h-4 w-4 text-yellow-500" />}
                 All Menu Items
              </CardTitle>
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
                      <TableRow className={isExperimental ? "bg-purple-50/50 hover:bg-purple-50/80" : ""}>
                        <TableHead className="w-24">ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="w-32">Price</TableHead>
                        <TableHead className="w-48 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((item, index) => (
                        <TableRow 
                            key={item.item_id} 
                            className={rowClass}
                            style={isExperimental ? { animationDelay: `${index * 50}ms` } : {}}
                            onClick={() => { if (isExperimental) playSound('pop'); }}
                        >
                          <TableCell className="font-mono text-xs">
                            #{item.item_id}
                          </TableCell>
                          <TableCell className={`font-medium ${isExperimental ? "text-lg text-slate-700" : ""}`}>
                            {item.item_name}
                          </TableCell>
                          <TableCell>
                            {isExperimental ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 shadow-sm transform hover:scale-110 transition-transform">
                                    {item.category}
                                </span>
                            ) : item.category}
                          </TableCell>
                          <TableCell className={isExperimental ? "font-bold text-green-600 text-lg" : ""}>
                            {currency(parseFloat(String(item.cost ?? "0")))}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className={`gap-2 ${buttonClass}`}
                                onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className={`gap-2 ${buttonClass}`}
                                onClick={(e) => { e.stopPropagation(); openIngredients(item); }}
                              >
                                <ListChecks className="h-4 w-4" />
                                Ingredients
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className={`gap-2 ${buttonClass}`}
                                onClick={(e) => { e.stopPropagation(); confirmDelete(item); }}
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
                            {isExperimental ? "🏜️ Wow, such empty. Much void." : "No items found."}
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
            <DialogTitle>{isExperimental ? "✨ Create Masterpiece ✨" : "Add new item"}</DialogTitle>
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
                onChange={(e) => { setNewItemName(e.target.value); handleTyping(); }}
                required
                className={isExperimental ? "border-purple-200 focus-visible:ring-purple-400" : ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newCost">Price</Label>
              <Input
                id="newCost"
                value={newItemCost}
                onChange={(e) => { setNewItemCost(e.target.value); handleTyping(); }}
                placeholder="e.g. 5.99"
                required
                className={isExperimental ? "border-purple-200 focus-visible:ring-purple-400" : ""}
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
                  handleTyping();
                }}
                onFocus={() => setShowCategorySuggestions(true)}
                onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                placeholder="Select or type category..."
                required
                autoComplete="off"
                className={isExperimental ? "border-purple-200 focus-visible:ring-purple-400" : ""}
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
                        handleBtnClick();
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
                className={`h-4 w-4 ${isExperimental ? "accent-purple-600" : ""}`}
                checked={openIngredientsAfterCreate}
                onChange={(e) => { setOpenIngredientsAfterCreate(e.target.checked); handleBtnClick(); }}
              />
              <Label htmlFor="afterCreate">Open ingredients after create</Label>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => { setAddOpen(false); handleBtnClick(); }}>
                Cancel
              </Button>
              <Button type="submit" className={`gap-2 ${isExperimental ? "bg-purple-600 hover:bg-purple-700" : ""}`}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className={`${isExperimental ? "border-4 border-blue-200 shadow-xl" : ""} overflow-visible`}>
          <DialogHeader className={editDialogHeaderClass}>
            <DialogTitle className={editTitleClass}>{isExperimental ? "✨ Remix This Item ✨" : "Edit item"}</DialogTitle>
            <DialogDescription className={isExperimental ? "text-blue-700" : ""}>
              {isExperimental ? "Give it a fresh new look!" : `Update the details for ${selectedItem?.item_name}.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateItem} className={`grid gap-4 ${isExperimental ? "p-4" : ""}`}>
            <div className="grid gap-2">
              <Label htmlFor="editName">Name</Label>
              <Input
                id="editName"
                value={updateName}
                onChange={(e) => { setUpdateName(e.target.value); handleTyping(); }}
                required
                className={isExperimental ? "border-blue-200 focus-visible:ring-blue-400" : ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editPrice">Price</Label>
              <Input
                id="editPrice"
                value={updatePrice}
                onChange={(e) => { setUpdatePrice(e.target.value); handleTyping(); }}
                required
                className={isExperimental ? "border-blue-200 focus-visible:ring-blue-400" : ""}
              />
            </div>
            
            {/* NEW: Category Edit with Custom Autocomplete */}
            <div className="grid gap-2 relative">
              <Label htmlFor="editCategory">Category</Label>
              <Input
                id="editCategory"
                value={updateCategory}
                onChange={(e) => {
                  setUpdateCategory(e.target.value);
                  setShowEditCategorySuggestions(true);
                  handleTyping();
                }}
                onFocus={() => setShowEditCategorySuggestions(true)}
                onBlur={() => setTimeout(() => setShowEditCategorySuggestions(false), 200)}
                placeholder="Select or type category..."
                required
                autoComplete="off"
                className={isExperimental ? "border-blue-200 focus-visible:ring-blue-400" : ""}
              />
              
              {/* Edit Suggestions List */}
              {showEditCategorySuggestions && filteredEditCategoryOptions.length > 0 && (
                <div className="absolute top-[70px] left-0 right-0 z-10 max-h-48 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
                  {filteredEditCategoryOptions.map((category) => (
                    <div
                      key={category}
                      className="cursor-pointer px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                      onMouseDown={(e) => e.preventDefault()} 
                      onClick={() => {
                        setUpdateCategory(category);
                        setShowEditCategorySuggestions(false);
                        handleBtnClick();
                      }}
                    >
                      {category}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => { setEditOpen(false); handleBtnClick(); }}>
                Cancel
              </Button>
              <Button type="submit" className={editSaveButtonClass}>
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
            <AlertDialogTitle>{isExperimental ? "🗑️ Yeet this item?" : `Delete ${selectedItem?.item_name}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {isExperimental 
                ? "This action cannot be undone. It will be gone forever like tears in rain." 
                : "This action cannot be undone and will remove the item from the menu."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleBtnClick}>Cancel</AlertDialogCancel>
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
          isExperimental={isExperimental}
          playSound={isExperimental ? playSound : undefined}
          onConfetti={fireConfetti}
          onSaved={() => {
            toast.success("Ingredients saved");
            if (isExperimental) { fireConfetti(); playSound('success'); }
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
  isExperimental?: boolean;
  playSound?: (type: 'success' | 'pop' | 'delete' | 'toggle' | 'error' | 'type' | 'click') => void;
  onConfetti?: () => void;
};

function IngredientsDialog({ open, onOpenChange, item, onSaved, isExperimental, playSound, onConfetti }: IngredientsDialogProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);

  // Add new inventory state
  const [newIngName, setNewIngName] = useState("");
  const [newIngStock, setNewIngStock] = useState<number | "">("");
  const [newIngCost, setNewIngCost] = useState("0.00");
  const [newIngUnit, setNewIngUnit] = useState(""); 
  
  // Unit Suggestions State
  const [showUnitSuggestions, setShowUnitSuggestions] = useState(false);

  const handleTyping = () => {
      if (playSound) playSound('type');
  };
  const handleClick = () => {
      if (playSound) playSound('click');
  };

  const loadInventory = async () => {
    try {
      // Changed to fetchApi
      const data = await fetchApi<InventoryItem[]>('/api/inventory');
      setInventory(data);
    } catch {
      toast.error("Failed to load inventory");
      if (playSound) playSound('error');
    }
  };

  // Compute unique units for the list
  const uniqueUnits = useMemo(() => {
    const units = inventory.map((i) => i.unit).filter((u): u is string => !!u);
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
      // Changed to fetchApi
      // Note: fetchApi unwraps the response, so 'payload' is the actual data object
      const payload = await fetchApi<any>(`/api/menu/${item.item_id}/ingredients`);
      // The backend returns { ingredients: [...] } inside the data wrapper
      const list = payload.ingredients || [];

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
    if (isExperimental && checked && playSound) playSound('pop');
    else if (isExperimental && !checked && playSound) playSound('click');

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
    handleTyping();
    const qty = value === "" ? 0 : parseInt(value, 10);
    setSelected((prev) => ({ ...prev, [id]: Math.max(0, qty) }));
  };

  const saveIngredients = async () => {
    handleClick();
    const hasZeroQuantity = Object.values(selected).some((qty) => qty <= 0);

    if (hasZeroQuantity) {
      toast.error("Please set a quantity for all selected ingredients.");
      if (playSound) playSound('error');
      return;
    }

    setLoading(true);
    try {
      const ingredientsToSave = Object.entries(selected).map(([id, quantity]) => ({
        id: Number(id),
        quantity,
      }));
      // Changed to fetchApi
      await fetchApi(`/api/menu/${item.item_id}/ingredients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: ingredientsToSave }),
      });
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Error saving ingredients");
      if (playSound) playSound('error');
    } finally {
      setLoading(false);
    }
  };

  const addInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    handleClick();
    try {
      // Changed to fetchApi
      await fetchApi('/api/inventory', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_name: newIngName,
          quantity: newIngStock || 0,
          cost: newIngCost,
          unit: newIngUnit, 
        }),
      });
      toast.success("Inventory item added");
      if (isExperimental) { 
          if(onConfetti) onConfetti(); 
          if(playSound) playSound('success'); 
      }
      setNewIngName("");
      setNewIngStock("");
      setNewIngCost("0.00");
      setNewIngUnit(""); 
      setShowUnitSuggestions(false); // Close suggestion box
      await loadInventory();
    } catch (e: any) {
      toast.error(e?.message ?? "Error adding inventory item");
      if (playSound) playSound('error');
    }
  };

  // Conditional styles for experimental mode
  const dialogHeaderClass = isExperimental ? "bg-gradient-to-r from-purple-100 to-pink-100 border-b p-6 rounded-t-lg" : "";
  const titleClass = isExperimental ? "text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600" : "";
  const checkboxClass = isExperimental ? "accent-purple-500 h-5 w-5" : "h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary";
  const saveButtonClass = isExperimental ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 font-bold text-white transform hover:scale-105 transition-all" : "gap-2 min-w-[100px]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-5xl overflow-visible ${isExperimental ? "border-4 border-purple-200 shadow-2xl" : ""}`}>
        <DialogHeader className={dialogHeaderClass}>
          <DialogTitle className={titleClass}>
            {isExperimental ? `🧪 Configuring: ${item.item_name}` : `Ingredients for ${item.item_name}`}
          </DialogTitle>
          <DialogDescription className={isExperimental ? "text-purple-700 font-medium" : ""}>
            {isExperimental ? "Mix and match your magical components!" : "Select ingredients from the list below. You must specify the quantity used per drink."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-8 pt-4">
          {/* Left Column: Ingredient picker */}
          <div>
            <div className={`text-sm font-medium mb-2 ${isExperimental ? "text-purple-800" : ""}`}>Select Inventory Items</div>
            <div className={`max-h-[500px] overflow-auto rounded-md border p-1 ${isExperimental ? "border-purple-200 bg-purple-50/30" : ""}`}>
              {inventory.map((inv) => {
                const isChecked = selected[inv.item_id] !== undefined;
                const currentQty = isChecked ? selected[inv.item_id] : 0;
                const isInvalid = isChecked && currentQty <= 0;

                return (
                  <div
                    key={inv.item_id}
                    className={`flex items-start gap-3 px-3 py-3 border-b last:border-0 transition-colors ${
                      isChecked 
                        ? (isExperimental ? "bg-purple-100/50" : "bg-muted/30")
                        : "hover:bg-muted/20"
                    }`}
                  >
                    <input
                      id={`inv-${inv.item_id}`}
                      type="checkbox"
                      className={`${checkboxClass} mt-1 shrink-0`}
                      checked={isChecked}
                      onChange={(e) => toggleIngredient(inv.item_id, e.target.checked)}
                    />
                    <div className="flex-1 flex items-start justify-between gap-4 min-w-0">
                      <Label
                        htmlFor={`inv-${inv.item_id}`}
                        className={`cursor-pointer font-normal leading-snug break-words pt-0.5 flex-1 ${isExperimental ? "text-base" : ""}`}
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
                            className={`w-20 h-9 px-2 text-center ${isInvalid ? "border-red-500 ring-red-500" : ""} ${isExperimental ? "border-purple-200 focus-visible:ring-purple-400" : ""}`}
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
                            title={inv.unit ?? undefined}
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
                <h3 className={`font-semibold text-sm ${isExperimental ? "text-purple-800" : ""}`}>Missing an ingredient?</h3>
                <p className="text-sm text-muted-foreground">
                    Add a new database entry here so you can select it on the left.
                </p>
            </div>
            
            <form onSubmit={addInventoryItem} className={`space-y-4 p-4 rounded-lg border ${isExperimental ? "bg-white border-purple-200 shadow-sm" : "bg-muted/20"}`}>
              {isExperimental && <div className="text-xs text-purple-500 font-bold uppercase tracking-widest mb-2">Quick Add</div>}
              <div className="grid gap-2">
                <Label htmlFor="ingName">Ingredient Name</Label>
                <Input
                  id="ingName"
                  value={newIngName}
                  onChange={(e) => { setNewIngName(e.target.value); handleTyping(); }}
                  placeholder="e.g. Tapioca pearls"
                  required
                  className={isExperimental ? "border-purple-200 focus-visible:ring-purple-400" : ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ingStock">Initial Stock Level</Label>
                <Input
                  id="ingStock"
                  type="number"
                  min={0}
                  value={newIngStock}
                  onChange={(e) => {
                    setNewIngStock(e.target.value === "" ? "" : parseInt(e.target.value, 10));
                    handleTyping();
                  }}
                  placeholder="e.g. 100"
                  className={isExperimental ? "border-purple-200 focus-visible:ring-purple-400" : ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ingCost">Unit Cost ($)</Label>
                <Input
                  id="ingCost"
                  value={newIngCost}
                  onChange={(e) => { setNewIngCost(e.target.value); handleTyping(); }}
                  placeholder="e.g. 4.99"
                  required
                  className={isExperimental ? "border-purple-200 focus-visible:ring-purple-400" : ""}
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
                    handleTyping();
                  }}
                  onFocus={() => setShowUnitSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowUnitSuggestions(false), 200)}
                  placeholder="e.g. grams, oz, count"
                  autoComplete="off"
                  className={isExperimental ? "border-purple-200 focus-visible:ring-purple-400" : ""}
                />
                {showUnitSuggestions && filteredUnitOptions.length > 0 && (
                  <div className="absolute top-[70px] left-0 right-0 z-10 max-h-48 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
                    {filteredUnitOptions.map((u) => (
                      <div
                        key={u}
                        className="cursor-pointer px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setNewIngUnit(u as string);
                          setShowUnitSuggestions(false);
                          handleClick();
                        }}
                      >
                        {u}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" variant={isExperimental ? "default" : "secondary"} className={`w-full gap-2 mt-2 ${isExperimental ? "bg-purple-100 text-purple-700 hover:bg-purple-200" : ""}`}>
                {isExperimental ? <Zap className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                Add to Database
              </Button>
            </form>
          </div>
        </div>

        <Separator className="my-4" />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { onOpenChange(false); handleClick(); }}>
            Cancel
          </Button>
          <Button className={saveButtonClass} onClick={saveIngredients} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Recipe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}