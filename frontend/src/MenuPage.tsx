import React, { useState, useEffect } from 'react';
import { API_URL } from '@/lib/api';

const API_BASE_URL = `${API_URL}/api`;

interface MenuItem {
  item_id: number;
  item_name: string;
  cost: string;
}

interface InventoryItem {
  item_id: number;
  item_name: string;
  supply: number;
  unit: string;
  cost: string;
}

function MenuPage() {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
      const [isLoading, setIsLoading] = useState(false);
      const [error, setError] = useState<string | null>(null);
    
      // State for forms
      const [newItemName, setNewItemName] = useState('');
      const [newItemCost, setNewItemCost] = useState('');
      
      // State for selected item and update
      const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
      const [updatePrice, setUpdatePrice] = useState('');
      
      // State for the ingredient modal
      const [isModalOpen, setIsModalOpen] = useState(false);
      const [modalItem, setModalItem] = useState<MenuItem | null>(null);
    
      // --- Data Loading ---
      const loadMenuItems = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await fetch(`${API_BASE_URL}/menu`);
          if (!response.ok) throw new Error('Failed to fetch menu items.');
          const data: MenuItem[] = await response.json();
          setMenuItems(data);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
          setIsLoading(false);
        }
      };
    
      // Load menu items on component mount
      useEffect(() => {
        loadMenuItems();
      }, []);
    
      // --- CRUD Functions ---
      const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
          const response = await fetch(`${API_BASE_URL}/menu`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item_name: newItemName, cost: newItemCost }),
          });
          if (!response.ok) throw new Error('Failed to add new item.');
          
          const newItem: MenuItem = await response.json();
          
          setNewItemName('');
          setNewItemCost('');
          
          // Show ingredient modal for the new item
          setModalItem(newItem);
          setIsModalOpen(true);
          
          loadMenuItems(); // Refresh the list
        } catch (err) {
          alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      };
    
      const handleUpdatePrice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem) return;
        try {
          const response = await fetch(`${API_BASE_URL}/menu/${selectedItem.item_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cost: updatePrice }),
          });
          if (!response.ok) throw new Error('Failed to update price.');
          
          setUpdatePrice('');
          setSelectedItem(null);
          loadMenuItems(); // Refresh the list
        } catch (err) {
          alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      };
    
      const handleDeleteItem = async () => {
        if (!selectedItem) return;
        if (window.confirm(`Are you sure you want to delete ${selectedItem.item_name}?`)) {
          try {
            const response = await fetch(`${API_BASE_URL}/menu/${selectedItem.item_id}`, {
              method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete item.');
            
            setSelectedItem(null);
            loadMenuItems(); // Refresh the list
          } catch (err) {
            alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }
      };
    
      const openModalForExisting = () => {
        if (!selectedItem) return;
        setModalItem(selectedItem);
        setIsModalOpen(true);
      };

    return (
        <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Menu Items Management</h1>
      
      {isLoading && <p>Loading menu...</p>}
      {error && <p className="text-red-500">{error}</p>}
      
      {/* Table of Menu Items */}
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3">Item ID</th>
              <th scope="col" className="px-6 py-3">Item Name</th>
              <th scope="col" className="px-6 py-3">Cost</th>
            </tr>
          </thead>
          <tbody>
            {menuItems.map((item) => (
              <tr
                key={item.item_id}
                className="bg-white border-b hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  setSelectedItem(item);
                  setUpdatePrice(parseFloat(item.cost).toFixed(2));
                }}
              >
                <td className="px-6 py-4">{item.item_id}</td>
                <td className="px-6 py-4 font-medium text-gray-900">{item.item_name}</td>
                <td className="px-6 py-4">${parseFloat(item.cost).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Forms Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Add New Item Form */}
        <form onSubmit={handleAddItem} className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Add New Item</h2>
          <div className="mb-2">
            <label htmlFor="itemName" className="block text-sm font-medium text-gray-700">Item Name</label>
            <input
              type="text"
              id="itemName"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              required
            />
          </div>
          <div className="mb-2">
            <label htmlFor="itemCost" className="block text-sm font-medium text-gray-700">Cost</label>
            <input
              type="text"
              id="itemCost"
              value={newItemCost}
              onChange={(e) => setNewItemCost(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              placeholder="e.g., 5.99"
              required
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Add Item
          </button>
        </form>

        {/* Manage Selected Item Form */}
        {selectedItem && (
          <form onSubmit={handleUpdatePrice} className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">Manage: {selectedItem.item_name}</h2>
            <div className="mb-2">
              <label htmlFor="newPrice" className="block text-sm font-medium text-gray-700">New Price</label>
              <input
                type="text"
                id="newPrice"
                value={updatePrice}
                onChange={(e) => setUpdatePrice(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                required
              />
            </div>
            <div className="flex space-x-2">
              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                Update Price
              </button>
              <button type="button" onClick={openModalForExisting} className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600">
                Edit Ingredients
              </button>
              <button type="button" onClick={handleDeleteItem} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                Delete Item
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Ingredient Modal */}
      {isModalOpen && modalItem && (
        <IngredientModal
          item={modalItem}
          onClose={() => {
            setIsModalOpen(false);
            setModalItem(null);
          }}
        />
      )}
    </div>
    );
}

interface IngredientModalProps {
  item: MenuItem;
  onClose: () => void;
}

function IngredientModal({ item, onClose }: IngredientModalProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<Record<number, number>>({});
  
  // Form for new ingredient
  const [newIngName, setNewIngName] = useState('');
  const [newIngStock, setNewIngStock] = useState(0);
  const [newIngCost, setNewIngCost] = useState('0.00');

  const loadInventory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/inventory`);
      const data: InventoryItem[] = await response.json();
      setInventory(data);
    } catch (err) {
      console.error("Failed to load inventory", err);
    }
  };

  // Load inventory when modal opens
  useEffect(() => {
    loadInventory();
    // You could also fetch the *currently selected* ingredients here
  }, []);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    const invId = parseInt(value);
    
    if (checked) {
      setSelectedIngredients(prev => ({ ...prev, [invId]: 1 }));
    } else {
      setSelectedIngredients(prev => {
        const newState = { ...prev };
        delete newState[invId];
        return newState;
      });
    }
  };

  const handleQuantityChange = (invId: number, quantity: number) => {
    if (quantity >= 0) {
      setSelectedIngredients(prev => ({ ...prev, [invId]: quantity }));
    }
  };

  const handleSaveIngredients = async () => {
    try {
      const ingredientsToSave = Object.entries(selectedIngredients).map(([id, quantity]) => ({
        id: parseInt(id),
        quantity,
      }));

      const response = await fetch(`${API_BASE_URL}/menu/${item.item_id}/ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: ingredientsToSave }),
      });

      if (!response.ok) throw new Error('Failed to save ingredients.');
      
      alert('Ingredients saved!');
      onClose();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  
  const handleAddNewIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/inventory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            item_name: newIngName, 
            quantity: newIngStock, 
            cost: newIngCost 
          })
      });
      if (!response.ok) throw new Error('Failed to add new ingredient.');
      
      setNewIngName('');
      setNewIngStock(0);
      setNewIngCost('0.00');
      loadInventory(); // Refresh the list
      
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add Ingredients for: {item.item_name}</h2>
          <button onClick={onClose} className="text-gray-500 text-2xl">&times;</button>
        </div>

        {/* Ingredient List */}
        <div className="max-h-64 overflow-y-auto border p-4 rounded-md mb-4">
          {inventory.map(invItem => (
            <div key={invItem.item_id} className="flex items-center justify-between mb-2">
              <div>
                <input
                  type="checkbox"
                  id={`inv-${invItem.item_id}`}
                  value={invItem.item_id}
                  onChange={handleCheckboxChange}
                  checked={selectedIngredients[invItem.item_id] !== undefined}
                />
                <label htmlFor={`inv-${invItem.item_id}`} className="ml-2">{invItem.item_name}</label>
              </div>
              <input
                type="number"
                min="1"
                value={selectedIngredients[invItem.item_id] || 1}
                onChange={(e) => handleQuantityChange(invItem.item_id, parseInt(e.target.value))}
                className="w-16 px-2 py-1 border rounded"
                disabled={selectedIngredients[invItem.item_id] === undefined}
              />
            </div>
          ))}
        </div>
        
        {/* Add New Ingredient Form */}
        <form onSubmit={handleAddNewIngredient} className="border-t pt-4">
          <h3 className="text-md font-semibold mb-2">Add New Ingredient to Inventory</h3>
          <div className="grid grid-cols-3 gap-2">
            <input 
              type="text" 
              placeholder="Ingredient Name" 
              value={newIngName}
              onChange={e => setNewIngName(e.target.value)}
              className="col-span-1 px-3 py-2 border border-gray-300 rounded-md" 
            />
            <input 
              type="number" 
              placeholder="Stock" 
              value={newIngStock}
              onChange={e => setNewIngStock(parseInt(e.target.value))}
              className="col-span-1 px-3 py-2 border border-gray-300 rounded-md" 
            />
            <input 
              type="text" 
              placeholder="Cost (e.g. 4.99)" 
              value={newIngCost}
              onChange={e => setNewIngCost(e.target.value)}
              className="col-span-1 px-3 py-2 border border-gray-300 rounded-md" 
            />
          </div>
          <button type="submit" className="mt-2 px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700">
            Add to Inventory
          </button>
        </form>

        {/* Save/Close Buttons */}
        <div className="flex justify-end space-x-2 mt-6 border-t pt-4">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded-md">Close</button>
          <button onClick={handleSaveIngredients} className="px-4 py-2 bg-blue-600 text-white rounded-md">
            Save Ingredients
          </button>
        </div>
      </div>
    </div>
  );
}

export default MenuPage;