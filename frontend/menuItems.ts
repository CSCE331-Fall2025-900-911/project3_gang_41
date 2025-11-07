/**
 * menuPage.ts - Frontend TypeScript for Menu Item Management
 * Implements type safety for a modern web application structure.
 */

// --- 1. Data Interfaces (Defining the shape of API data) ---

interface MenuItem {
    item_id: number;
    item_name: string;
    cost: number; // Cost is expected as a numeric value
}

// --- 2. UI Element References (Type Assertion is necessary here) ---

// Using 'as' assertion to tell TypeScript what type of HTML element we expect
const menuTableBody = document.querySelector('#menu-table tbody') as HTMLTableSectionElement;
const refreshButton = document.getElementById('refresh-button') as HTMLButtonElement;
const selectedItemLabel = document.getElementById('selected-item-label') as HTMLLabelElement;
const priceTextField = document.getElementById('price-text-field') as HTMLInputElement;
const updatePriceButton = document.getElementById('update-price-button') as HTMLButtonElement;
const deleteItemButton = document.getElementById('delete-item-button') as HTMLButtonElement;
const newItemNameField = document.getElementById('new-item-name-field') as HTMLInputElement;
const newItemCostField = document.getElementById('new-item-cost-field') as HTMLInputElement;
const addItemButton = document.getElementById('add-item-button') as HTMLButtonElement;

// --- 3. State Variables (Explicit Typing) ---

let selectedItemId: number | null = null;
let selectedItemName: string | null = null;
const API_BASE_URL: string = 'http://localhost:3000/api/menu';

// --- 4. Utility and UI Functions ---

function navigateToPage(pageName: string): void {
    alert(`Navigating to ${pageName}. (Implementation requires actual routing.)`);
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

/**
 * Loads menu items from the backend API and populates the HTML table.
 */
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
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Explicitly cast the incoming JSON to an array of MenuItems
        const menuItems: MenuItem[] = await response.json() as MenuItem[]; 
        
        menuItems.forEach((item: MenuItem) => {
            const row: HTMLTableRowElement = menuTableBody.insertRow();
            
            // Add event listener, passing typed parameters
            row.addEventListener('click', () => handleTableSelection(row, item));
            
            row.insertCell().textContent = item.item_id.toString();
            row.insertCell().textContent = item.item_name;
            row.insertCell().textContent = `$${item.cost.toFixed(2)}`; 
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

/**
 * Handles table row clicks to set the selected item state.
 * @param row The clicked table row element.
 * @param item The data object for the selected item.
 */
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
                // Sending the raw string cost to the backend
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

        // Assuming backend returns an object with the new item_id
        const result: { item_id: number } = await response.json(); 
        const newDrinkId: number = result.item_id; 

        alert("Item added successfully!\nNow, please add its ingredients.");
        
        newItemNameField.value = "";
        newItemCostField.value = "";
        loadMenuItems();

        console.log(`Opening Ingredient Dialog for new item ID: ${newDrinkId}`); 

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


// --- 7. Initialization ---

function init(): void {
    // Left Menu Button Listeners
    document.getElementById('menuButton2')?.addEventListener('click', () => navigateToPage('Inventory'));
    document.getElementById('menuButton3')?.addEventListener('click', () => navigateToPage('Order History'));
    document.getElementById('menuButton4')?.addEventListener('click', () => navigateToPage('Employees'));
    document.getElementById('menuButton5')?.addEventListener('click', () => navigateToPage('Log Out'));
    
    // Main Panel Button Listeners
    refreshButton.addEventListener('click', loadMenuItems);
    updatePriceButton.addEventListener('click', updateItemPrice);
    addItemButton.addEventListener('click', addNewItem);
    deleteItemButton.addEventListener('click', deleteSelectedItem);
    
    loadMenuItems();
}

// Start the application when the HTML structure is ready 
document.addEventListener('DOMContentLoaded', init);