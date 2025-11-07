/**
 * menuPage.ts - Frontend TypeScript for Menu Item Management
 * Implements type safety for a modern web application structure.
 */

// --- 1. Data Interfaces (Defining the shape of API data) ---

interface MenuItem {
    item_id: number;
    item_name: string;
    cost: string; // Cost is expected as a string from the DB
}

interface InventoryItem {
    item_id: number;
    item_name: string;
    supply: number;
    unit: string;
    cost: string;
}

// --- 2. UI Element References (Type Assertion is necessary here) ---

const menuTableBody = document.querySelector('#menu-table tbody') as HTMLTableSectionElement;
const refreshButton = document.getElementById('refresh-button') as HTMLButtonElement;
const selectedItemLabel = document.getElementById('selected-item-label') as HTMLLabelElement;
const priceTextField = document.getElementById('price-text-field') as HTMLInputElement;
const updatePriceButton = document.getElementById('update-price-button') as HTMLButtonElement;
const deleteItemButton = document.getElementById('delete-item-button') as HTMLButtonElement;
const newItemNameField = document.getElementById('new-item-name-field') as HTMLInputElement;
const newItemCostField = document.getElementById('new-item-cost-field') as HTMLInputElement;
const addItemButton = document.getElementById('add-item-button') as HTMLButtonElement;
const newIngredientName = document.getElementById('new-ingredient-name') as HTMLInputElement;
const newIngredientQuantity = document.getElementById('new-ingredient-quantity') as HTMLInputElement;
const addNewIngredientButton = document.getElementById('add-new-ingredient-button') as HTMLButtonElement;
const newIngredientCost = document.getElementById('new-ingredient-cost') as HTMLInputElement;

// Modal Element References
const ingredientModal = document.getElementById('ingredient-modal') as HTMLDivElement;
const modalCloseButton = document.getElementById('modal-close-button') as HTMLSpanElement;
const modalSaveButton = document.getElementById('modal-save-button') as HTMLButtonElement;
const modalItemName = document.getElementById('modal-item-name') as HTMLSpanElement;
const modalIngredientList = document.getElementById('modal-ingredient-list') as HTMLDivElement;


// --- 3. State Variables (Explicit Typing) ---

let selectedItemId: number | null = null;
let selectedItemName: string | null = null;
const API_BASE_URL: string = 'http://localhost:3000/api/menu'; 

// --- 4. Utility and UI Functions ---

function navigateToPage(pageName: string): void {
    window.location.href = pageName;
}

function isValidPrice(str: string): boolean {
    const num: number = parseFloat(str);
    return !isNaN(num) && num > 0 && str.trim() !== '';
}

function updateSelectionState(): void {
    const isItemSelected: boolean = selectedItemId !== null;

    selectedItemLabel.textContent = isItemSelected 
        ? `Item: ${selectedItemName}` 
        : "Select an item to manage.";
        
    priceTextField.disabled = !isItemSelected;
    updatePriceButton.disabled = !isItemSelected;
    deleteItemButton.disabled = !isItemSelected;

    if (!isItemSelected) {
        priceTextField.value = "";
    }
}

// --- 5. Data Loading & Table Population ---

async function loadMenuItems(): Promise<void> {
    refreshButton.disabled = true;
    refreshButton.textContent = 'Loading...';
    menuTableBody.innerHTML = ''; 
    selectedItemId = null;
    selectedItemName = null;
    updateSelectionState(); 

    try {
        const response: Response = await fetch(API_BASE_URL); 
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        const menuItems: MenuItem[] = await response.json() as MenuItem[]; 
        
        menuItems.forEach((item: MenuItem) => {
            const row: HTMLTableRowElement = menuTableBody.insertRow();
            
            row.addEventListener('click', () => handleTableSelection(row, item));
            
            row.insertCell().textContent = item.item_id.toString();
            row.insertCell().textContent = item.item_name;
            row.insertCell().textContent = `$${parseFloat(item.cost).toFixed(2)}`; 
        });

    } catch (e: unknown) {
        let errorMessage = 'An unknown error occurred.';
        if (e instanceof Error) {
            errorMessage = e.message;
        }
        console.error("Error loading menu items:", e);
        alert(`Error loading menu items: ${errorMessage}`);
    } finally {
        refreshButton.disabled = false;
        refreshButton.textContent = 'Refresh Menu';
    }
}

function handleTableSelection(row: HTMLTableRowElement, item: MenuItem): void {
    document.querySelectorAll('#menu-table tbody tr').forEach((r: Element) => r.classList.remove('selected-row'));
    row.classList.add('selected-row');

    selectedItemId = item.item_id;
    selectedItemName = item.item_name;

    updateSelectionState();
}

// --- 6. CRUD Operations (Type-Checked API Interaction) ---

async function updateItemPrice(): Promise<void> {
    if (selectedItemId === null) return;
    const newPriceStr: string = priceTextField.value.trim();

    if (!isValidPrice(newPriceStr)) {
        alert("Invalid price format. Please enter a valid positive number.");
        return;
    }

    if (confirm(`Are you sure you want to update the price of '${selectedItemName}' to $${parseFloat(newPriceStr).toFixed(2)}?`)) {
        updatePriceButton.disabled = true;
        
        try {
            const response: Response = await fetch(`${API_BASE_URL}/${selectedItemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cost: newPriceStr }) 
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update price.');
            }

            alert("Price updated successfully!");
            priceTextField.value = ""; 
            loadMenuItems(); 
        } catch (e: unknown) {
            let errorMessage = 'An unknown error occurred.';
            if (e instanceof Error) {
                errorMessage = e.message;
            }
            console.error("Update error:", e);
            alert(`An error occurred during update: ${errorMessage}`);
        } finally {
            updatePriceButton.disabled = false;
        }
    }
}

async function addNewItem(): Promise<void> {
    const itemName: string = newItemNameField.value.trim();
    const itemCostStr: string = newItemCostField.value.trim();

    if (!itemName || !itemCostStr) {
        alert("Item name and cost cannot be empty.");
        return;
    }
    if (!isValidPrice(itemCostStr)) {
        alert("Invalid cost format. Please enter a valid number (e.g., 9.99).");
        return;
    }

    addItemButton.disabled = true;

    try {
        const response: Response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item_name: itemName, cost: itemCostStr })
        });
        
        if (!response.ok) {
             const errorData = await response.json();
             throw new Error(errorData.message || 'Failed to add new item.');
        }

        const result: { item_id: number } = await response.json(); 
        const newDrinkId: number = result.item_id; 

        openIngredientModal(newDrinkId, itemName);
        
        newItemNameField.value = "";
        newItemCostField.value = "";
        loadMenuItems();

    } catch (e: unknown) {
        let errorMessage = 'An unknown error occurred.';
        if (e instanceof Error) {
            errorMessage = e.message;
        }
        console.error("Add item error:", e);
        alert(`An error occurred during addition: ${errorMessage}`);
    } finally {
        addItemButton.disabled = false;
    }
}

async function deleteSelectedItem(): Promise<void> {
    if (selectedItemId === null || selectedItemName === null) return;

    const message: string = `Are you sure you want to delete '${selectedItemName}'?\nThis will also remove all its ingredient links. This action cannot be undone.`;
    
    if (confirm(message)) {
        deleteItemButton.disabled = true;

        try {
            const response: Response = await fetch(`${API_BASE_URL}/${selectedItemId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete item.');
            }

            alert("Item deleted successfully!");
            loadMenuItems();

        } catch (e: unknown) {
            let errorMessage = 'An unknown error occurred.';
            if (e instanceof Error) {
                errorMessage = e.message;
            }
            console.error("Deletion error:", e);
            alert(`An error occurred during deletion: ${errorMessage}`);
        } finally {
            deleteItemButton.disabled = false;
        }
    }
}

// --- 7. Modal Functions ---


async function loadIngredientsForModal() {
    modalIngredientList.innerHTML = '<p>Loading ingredients...</p>';

    try {
        const response = await fetch('http://localhost:3000/api/inventory');
        if (!response.ok) {
            throw new Error('Failed to fetch inventory.');
        }
        const ingredients: InventoryItem[] = await response.json();

        modalIngredientList.innerHTML = '';
        ingredients.forEach(item => {
            const div = document.createElement('div');
            div.innerHTML = `
                <input type="checkbox" id="inv-${item.item_id}" value="${item.item_id}">
                <label for="inv-${item.item_id}">${item.item_name}</label>
                <input type="number" class="ingredient-quantity" min="1" value="1" style="width: 50px; margin-left: 10px;" disabled>
            `;
            modalIngredientList.appendChild(div);

            const checkbox = div.querySelector('input[type="checkbox"]') as HTMLInputElement;
            const quantityInput = div.querySelector('input[type="number"]') as HTMLInputElement;
            checkbox.addEventListener('change', () => {
                quantityInput.disabled = !checkbox.checked;
            });
        });

    } catch (e: unknown) {
        if (e instanceof Error) {
            modalIngredientList.innerHTML = `<p style="color: red;">Error: ${e.message}</p>`;
        }
    }
}

async function openIngredientModal(itemId: number, itemName: string) {
    modalItemName.textContent = itemName;
    ingredientModal.dataset.itemId = itemId.toString(); 
    ingredientModal.style.display = 'block';

    loadIngredientsForModal();
}

function closeIngredientModal() {
    ingredientModal.style.display = 'none';
    modalIngredientList.innerHTML = ''; 
}

async function saveIngredients() {
    const itemId = ingredientModal.dataset.itemId;

    console.log('Attempting to save ingredients for item ID:', itemId);

    if (!itemId) {
        alert('Error: No item ID found.');
        return;
    }

    const checkedBoxes = modalIngredientList.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked');
    
    const ingredients = Array.from(checkedBoxes).map(box => {
        const quantityInput = box.nextElementSibling?.nextElementSibling as HTMLInputElement;
        return {
            id: parseInt(box.value),
            quantity: parseInt(quantityInput.value)
        };
    });

    if (ingredients.length === 0) {
        alert("No ingredients selected. Click 'Close' if you don't want to add any.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/${itemId}/ingredients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ingredients: ingredients }) 
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to save ingredients.');
        }

        alert('Ingredients saved successfully!');
        closeIngredientModal();

    } catch (e: unknown) {
        if (e instanceof Error) {
            alert(`Error saving: ${e.message}`);
        }
    }
}


async function addNewIngredient() {
    const name = newIngredientName.value;
    const quantity = parseInt(newIngredientQuantity.value);
    const cost = newIngredientCost.value; // Get the cost value

    // 3. Update validation
    if (!name || isNaN(quantity) || !cost) {
        alert('Please enter a valid ingredient name, stock quantity, and cost.');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // 4. Add cost to the request body
            body: JSON.stringify({ item_name: name, quantity: quantity, cost: cost })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to add item.');
        }

        alert(`Successfully added '${name}' to inventory.`);
        newIngredientName.value = '';
        newIngredientQuantity.value = '0';
        newIngredientCost.value = ''; // Clear the cost field

        loadIngredientsForModal(); 

    } catch (e: unknown) {
        if (e instanceof Error) {
            alert(`Error: ${e.message}`);
        }
    }
}

// --- 8. Initialization ---

function init(): void {
    document.getElementById('menuButton2')?.addEventListener('click', () => navigateToPage('Inventory'));
    document.getElementById('menuButton3')?.addEventListener('click', () => navigateToPage('orderHistory.html'));
    document.getElementById('menuButton4')?.addEventListener('click', () => navigateToPage('Employees'));
    document.getElementById('menuButton5')?.addEventListener('click', () => navigateToPage('Log Out'));
    
    refreshButton.addEventListener('click', loadMenuItems);
    updatePriceButton.addEventListener('click', updateItemPrice);
    addItemButton.addEventListener('click', addNewItem);
    deleteItemButton.addEventListener('click', deleteSelectedItem);
    
    // Add listeners for the modal
    modalCloseButton.addEventListener('click', closeIngredientModal);
    modalSaveButton.addEventListener('click', saveIngredients);
    addNewIngredientButton.addEventListener('click', addNewIngredient);
    
    loadMenuItems();
}

document.addEventListener('DOMContentLoaded', init);