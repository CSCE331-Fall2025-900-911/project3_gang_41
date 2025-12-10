import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { MenuItem, InventoryItem } from "@project3/shared";
import { toast } from "sonner";
import { useSoundEffects } from "@/hooks/useSoundEffects";
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
import confetti from "canvas-confetti";

export default function MenuPage() {
  const { t: translate } = useTranslation();
  const { playSound } = useSoundEffects();

  const fireConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");

  // --- Add State ---
  const [addOpen, setAddOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCost, setNewItemCost] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [newItemDescription, setNewItemDescription] = useState(""); // NEW
  const [openIngredientsAfterCreate, setOpenIngredientsAfterCreate] = useState(true);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  // --- Edit State ---
  const [editOpen, setEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [updateName, setUpdateName] = useState("");
  const [updatePrice, setUpdatePrice] = useState("");
  const [updateCategory, setUpdateCategory] = useState("");
  const [updateDescription, setUpdateDescription] = useState(""); // NEW
  const [showEditCategorySuggestions, setShowEditCategorySuggestions] = useState(false);

  // --- Other Dialogs ---
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [ingredientsOpen, setIngredientsOpen] = useState(false);

  // --- EXPERIMENTAL MODE STATE ---
  const [isExperimental, setIsExperimental] = useState(false);

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
      setError(e?.message ?? translate("menu.unknownError"));
      toast.error(translate("menu.failedToLoad"));
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
      toast.error(translate("menu.provideCategory"));
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
          description: newItemDescription, // Send description
        }),
      });

      toast.success(translate("menu.added", { name: created.item_name }));
      if (isExperimental) {
          fireConfetti();
          playSound('success');
      }

      setAddOpen(false);
      setNewItemName("");
      setNewItemCost("");
      setNewItemCategory("");
      setNewItemDescription(""); // Reset
      setShowCategorySuggestions(false);
      await loadMenuItems();

      if (openIngredientsAfterCreate) {
        setSelectedItem(created);
        setIngredientsOpen(true);
      }
    } catch (e: any) {
      toast.error(e?.message ?? translate("menu.errorAdding"));
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
          category: updateCategory,
          description: updateDescription, // Send description
        }),
      });
      toast.success(translate("menu.itemUpdated"));
      if (isExperimental) {
          fireConfetti();
          playSound('success');
      }
      setEditOpen(false);
      setSelectedItem(null);
      setUpdateName("");
      setUpdatePrice("");
      setUpdateCategory("");
      setUpdateDescription(""); // Reset
      await loadMenuItems();
    } catch (e: any) {
      toast.error(e?.message ?? translate("menu.errorUpdating"));
      if (isExperimental) playSound('error');
    }
  };

  // Delete Item
  const handleDeleteItem = async () => {
    if (isExperimental) playSound('click');
    if (!selectedItem) return;
    try {
      await fetchApi<null>(`/api/menu/${selectedItem.item_id}`, { method: "DELETE" });
      toast.success(translate("menu.deleted", { name: selectedItem.item_name }));
      if (isExperimental) playSound('delete');
      setDeleteOpen(false);
      setSelectedItem(null);
      await loadMenuItems();
    } catch (e: any) {
      toast.error(e?.message ?? translate("menu.errorDeleting"));
      if (isExperimental) playSound('error');
    }
  };

  // Open Dialogs
  const openEdit = (item: MenuItem) => {
    if (isExperimental) playSound('pop');
    setSelectedItem(item);
    setUpdateName(item.item_name);
    setUpdatePrice(parseFloat(String(item.cost ?? "0")).toFixed(2));
    setUpdateCategory(item.category || "");
    setUpdateDescription(item.description || ""); // Load existing
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
                {isExperimental ? `✨ ${translate("menu.dopamineMode")} ✨` : translate("menu.title")}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:block">
                <Input
                  placeholder={isExperimental ? translate("menu.searchPlaceholderFun") : translate("menu.searchPlaceholder")}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); if (isExperimental) playSound('type'); }}
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
                title={translate("menu.experimentalTooltip")}
                className={isExperimental ? "text-purple-600 bg-purple-100 hover:bg-purple-200" : "text-muted-foreground"}
              >
                <FlaskConical className="h-5 w-5" />
              </Button>

              <Button
                variant="outline"
                className={`gap-2 ${buttonClass} ${isExperimental ? "border-purple-300 hover:bg-purple-50 text-purple-700" : ""}`}
                onClick={() => { if (isExperimental) playSound('click'); loadMenuItems(); }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className={`h-4 w-4 ${isExperimental ? "animate-spin-slow" : ""}`} />
                )}
                {translate("menu.refresh")}
              </Button>
              <Button
                className={`gap-2 ${buttonClass} ${isExperimental ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0" : ""}`}
                onClick={() => { if (isExperimental) playSound('click'); setAddOpen(true); }}
              >
                <Plus className="h-4 w-4" />
                {translate("menu.newItem")}
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
                 {translate("menu.allMenuItems")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading && menuItems.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  {translate("menu.loading")}
                </div>
              ) : error ? (
                <div className="p-6 text-sm text-destructive">{error}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className={isExperimental ? "bg-purple-50/50 hover:bg-purple-50/80" : ""}>
                        <TableHead className="w-24">ID</TableHead>
                        <TableHead>{translate("menu.name")}</TableHead>
                        <TableHead>{translate("menu.category")}</TableHead>
                        <TableHead className="w-32">{translate("menu.price")}</TableHead>
                        <TableHead className="w-48 text-right">{translate("menu.actions")}</TableHead>
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
                            {/* Short Preview of Description if exists */}
                            {item.description && (
                              <div className="text-xs text-muted-foreground truncate max-w-[200px] mt-0.5">
                                {item.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {isExperimental ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 shadow-sm transform hover:scale-110 transition-transform">
                                    {item.category}
                                </span>
                            ) : item.category}
                          </TableCell>
                          <TableCell className={isExperimental ? "font-bold text-green-600 text-lg" : ""}>
                            {formatCurrency(parseFloat(String(item.cost ?? "0")))}
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
                                {translate("menu.edit")}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className={`gap-2 ${buttonClass}`}
                                onClick={(e) => { e.stopPropagation(); openIngredients(item); }}
                              >
                                <ListChecks className="h-4 w-4" />
                                {translate("menu.ingredients")}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className={`gap-2 ${buttonClass}`}
                                onClick={(e) => { e.stopPropagation(); confirmDelete(item); }}
                              >
                                <Trash2 className="h-4 w-4" />
                                {translate("menu.delete")}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filtered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                            {isExperimental ? `🏜️ ${translate("menu.noItemsFun")}` : translate("menu.noItems")}
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
            <DialogTitle>{isExperimental ? `✨ ${translate("menu.createMasterpiece")} ✨` : translate("menu.addNewItem")}</DialogTitle>
            <DialogDescription>
              {translate("menu.createDescription")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="newName">{translate("menu.name")}</Label>
              <Input
                id="newName"
                value={newItemName}
                onChange={(e) => { setNewItemName(e.target.value); if (isExperimental) playSound('type'); }}
                required
                className={isExperimental ? "border-purple-200 focus-visible:ring-purple-400" : ""}
              />
            </div>

            {/* NEW DESCRIPTION FIELD */}
            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="newDesc">Description</Label>
                <span className={`text-xs ${newItemDescription.length >= 100 ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                  {newItemDescription.length}/100
                </span>
              </div>
              <textarea
                id="newDesc"
                value={newItemDescription}
                onChange={(e) => {
                  if (e.target.value.length <= 100) {
                    setNewItemDescription(e.target.value); 
                    if (isExperimental) playSound('type');
                  }
                }}
                className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-none ${isExperimental ? "border-purple-200 focus-visible:ring-purple-400" : ""}`}
                placeholder="e.g. Refreshing jasmine green tea with natural honey..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="newCost">{translate("menu.price")}</Label>
              <Input
                id="newCost"
                value={newItemCost}
                onChange={(e) => { setNewItemCost(e.target.value); if (isExperimental) playSound('type'); }}
                placeholder={translate("menu.pricePlaceholder")}
                required
                className={isExperimental ? "border-purple-200 focus-visible:ring-purple-400" : ""}
              />
            </div>

            {/* Custom Autocomplete for Category */}
            <div className="grid gap-2 relative">
              <Label htmlFor="newCategory">{translate("menu.category")}</Label>
              <Input
                id="newCategory"
                value={newItemCategory}
                onChange={(e) => {
                  setNewItemCategory(e.target.value);
                  setShowCategorySuggestions(true);
                  if (isExperimental) playSound('type');
                }}
                onFocus={() => setShowCategorySuggestions(true)}
                onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                placeholder={translate("menu.selectCategory")}
                required
                autoComplete="off"
                className={isExperimental ? "border-purple-200 focus-visible:ring-purple-400" : ""}
              />
              
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
                        if (isExperimental) playSound('click');
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
                onChange={(e) => { setOpenIngredientsAfterCreate(e.target.checked); if (isExperimental) playSound('click'); }}
              />
              <Label htmlFor="afterCreate">{translate("menu.openIngredientsAfter")}</Label>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => { setAddOpen(false); if (isExperimental) playSound('click'); }}>
                {translate("menu.cancel")}
              </Button>
              <Button type="submit" className={`gap-2 ${isExperimental ? "bg-purple-600 hover:bg-purple-700" : ""}`}>
                <Plus className="h-4 w-4" />
                {translate("menu.add")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className={`${isExperimental ? "border-4 border-blue-200 shadow-xl" : ""} overflow-visible`}>
          <DialogHeader className={editDialogHeaderClass}>
            <DialogTitle className={editTitleClass}>{isExperimental ? `✨ ${translate("menu.remixItem")} ✨` : translate("menu.editItem")}</DialogTitle>
            <DialogDescription className={isExperimental ? "text-blue-700" : ""}>
              {isExperimental ? translate("menu.editDescriptionFun") : translate("menu.editDescription", { name: selectedItem?.item_name })}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateItem} className={`grid gap-4 ${isExperimental ? "p-4" : ""}`}>
            <div className="grid gap-2">
              <Label htmlFor="editName">{translate("menu.name")}</Label>
              <Input
                id="editName"
                value={updateName}
                onChange={(e) => { setUpdateName(e.target.value); if (isExperimental) playSound('type'); }}
                required
                className={isExperimental ? "border-blue-200 focus-visible:ring-blue-400" : ""}
              />
            </div>

            {/* NEW DESCRIPTION FIELD IN EDIT */}
            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="editDesc">Description</Label>
                <span className={`text-xs ${updateDescription.length >= 100 ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                  {updateDescription.length}/100
                </span>
              </div>
              <textarea
                id="editDesc"
                value={updateDescription}
                onChange={(e) => {
                  if (e.target.value.length <= 100) {
                    setUpdateDescription(e.target.value); 
                    if (isExperimental) playSound('type');
                  }
                }}
                className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-none ${isExperimental ? "border-blue-200 focus-visible:ring-blue-400" : ""}`}
                placeholder="Description..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editPrice">{translate("menu.price")}</Label>
              <Input
                id="editPrice"
                value={updatePrice}
                onChange={(e) => { setUpdatePrice(e.target.value); if (isExperimental) playSound('type'); }}
                required
                className={isExperimental ? "border-blue-200 focus-visible:ring-blue-400" : ""}
              />
            </div>

            {/* NEW: Category Edit with Custom Autocomplete */}
            <div className="grid gap-2 relative">
              <Label htmlFor="editCategory">{translate("menu.category")}</Label>
              <Input
                id="editCategory"
                value={updateCategory}
                onChange={(e) => {
                  setUpdateCategory(e.target.value);
                  setShowEditCategorySuggestions(true);
                  if (isExperimental) playSound('type');
                }}
                onFocus={() => setShowEditCategorySuggestions(true)}
                onBlur={() => setTimeout(() => setShowEditCategorySuggestions(false), 200)}
                placeholder={translate("menu.selectCategory")}
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
                        if (isExperimental) playSound('click');
                      }}
                    >
                      {category}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => { setEditOpen(false); if (isExperimental) playSound('click'); }}>
                {translate("menu.cancel")}
              </Button>
              <Button type="submit" className={editSaveButtonClass}>
                <Pencil className="h-4 w-4" />
                {translate("menu.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isExperimental ? `🗑️ ${translate("menu.deleteTitleFun")}` : translate("menu.deleteTitle", { name: selectedItem?.item_name })}</AlertDialogTitle>
            <AlertDialogDescription>
              {isExperimental
                ? translate("menu.deleteDescriptionFun")
                : translate("menu.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { if (isExperimental) playSound('click'); }}>{translate("menu.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {translate("menu.delete")}
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
          translate={translate}
          onSaved={() => {
            toast.success(translate("menu.ingredientsSaved"));
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
  translate: (key: string, options?: Record<string, string>) => string;
};

function IngredientsDialog({ open, onOpenChange, item, onSaved, isExperimental, playSound, onConfetti, translate }: IngredientsDialogProps) {
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
      const data = await fetchApi<InventoryItem[]>('/api/inventory');
      setInventory(data);
    } catch {
      toast.error(translate("menu.failedToLoadInventory"));
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
      toast.error(translate("menu.setQuantityError"));
      if (playSound) playSound('error');
      return;
    }

    setLoading(true);
    try {
      const ingredientsToSave = Object.entries(selected).map(([id, quantity]) => ({
        id: Number(id),
        quantity,
      }));
      
      await fetchApi(`/api/menu/${item.item_id}/ingredients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: ingredientsToSave }),
      });
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? translate("menu.errorSavingIngredients"));
      if (playSound) playSound('error');
    } finally {
      setLoading(false);
    }
  };

  const addInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    handleClick();
    try {
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
      toast.success(translate("menu.inventoryAdded"));
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
      toast.error(e?.message ?? translate("menu.errorAddingInventory"));
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
            {isExperimental ? `🧪 ${translate("menu.configuringItem", { name: item.item_name })}` : translate("menu.ingredientsFor", { name: item.item_name })}
          </DialogTitle>
          <DialogDescription className={isExperimental ? "text-purple-700 font-medium" : ""}>
            {isExperimental ? translate("menu.ingredientsDescriptionFun") : translate("menu.ingredientsDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-8 pt-4">
          {/* Left Column: Ingredient picker */}
          <div>
            <div className={`text-sm font-medium mb-2 ${isExperimental ? "text-purple-800" : ""}`}>{translate("menu.selectInventory")}</div>
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
                          {translate("menu.qty")}
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
                  {translate("menu.noInventory")}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Add new inventory item */}
          <div className="border-l pl-8 flex flex-col">
            <div className="mb-6">
                <h3 className={`font-semibold text-sm ${isExperimental ? "text-purple-800" : ""}`}>{translate("menu.missingIngredient")}</h3>
                <p className="text-sm text-muted-foreground">
                    {translate("menu.missingIngredientDesc")}
                </p>
            </div>

            <form onSubmit={addInventoryItem} className={`space-y-4 p-4 rounded-lg border ${isExperimental ? "bg-white border-purple-200 shadow-sm" : "bg-muted/20"}`}>
              {isExperimental && <div className="text-xs text-purple-500 font-bold uppercase tracking-widest mb-2">{translate("menu.quickAdd")}</div>}
              <div className="grid gap-2">
                <Label htmlFor="ingName">{translate("menu.ingredientName")}</Label>
                <Input
                  id="ingName"
                  value={newIngName}
                  onChange={(e) => { setNewIngName(e.target.value); handleTyping(); }}
                  placeholder={translate("menu.ingredientNamePlaceholder")}
                  required
                  className={isExperimental ? "border-purple-200 focus-visible:ring-purple-400" : ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ingStock">{translate("menu.initialStock")}</Label>
                <Input
                  id="ingStock"
                  type="number"
                  min={0}
                  value={newIngStock}
                  onChange={(e) => {
                    setNewIngStock(e.target.value === "" ? "" : parseInt(e.target.value, 10));
                    handleTyping();
                  }}
                  placeholder={translate("menu.initialStockPlaceholder")}
                  className={isExperimental ? "border-purple-200 focus-visible:ring-purple-400" : ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ingCost">{translate("menu.unitCost")}</Label>
                <Input
                  id="ingCost"
                  value={newIngCost}
                  onChange={(e) => { setNewIngCost(e.target.value); handleTyping(); }}
                  placeholder={translate("menu.unitCostPlaceholder")}
                  required
                  className={isExperimental ? "border-purple-200 focus-visible:ring-purple-400" : ""}
                />
              </div>

              {/* Unit Custom Autocomplete */}
              <div className="grid gap-2 relative">
                <Label htmlFor="ingUnit">{translate("menu.unit")}</Label>
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
                  placeholder={translate("menu.unitPlaceholder")}
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
                {translate("menu.addToDatabase")}
              </Button>
            </form>
          </div>
        </div>

        <Separator className="my-4" />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { onOpenChange(false); handleClick(); }}>
            {translate("menu.cancel")}
          </Button>
          <Button className={saveButtonClass} onClick={saveIngredients} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {translate("menu.saveRecipe")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}