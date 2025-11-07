// frontend/src/orderHistory.ts

/**
 * Interface for a single item *inside* an order
 */
interface OrderItem {
    name: string;
    qty: number;
    price: string;
}

/**
 * Updated interface to match the new GROUPED data from the API
 */
interface Order {
    orderid: number;
    customerid: number;
    orderdate: string;
    employeeatcheckout: number;
    paymentmethod: string;
    total_order_price: string; // This is the SUM(totalprice)
    items: OrderItem[]; // This is the JSON array of items
}

// --- 1. UI Element References ---
const historyTableBody = document.getElementById('history-table-body') as HTMLTableSectionElement;
const refreshButton = document.getElementById('refresh-button') as HTMLButtonElement;

// Pagination elements
const prevButton = document.getElementById('prev-button') as HTMLButtonElement;
const nextButton = document.getElementById('next-button') as HTMLButtonElement;
const pageInfo = document.getElementById('page-info') as HTMLSpanElement;

const API_BASE_URL = 'http://localhost:3000/api/order-history';
const LIMIT = 50; // Show 50 orders per page

// --- 2. State Variables ---
let currentPage = 1;
let totalPages = 1;

// --- 3. Navigation Function ---
function navigateToPage(pageName: string): void {
    window.location.href = pageName;
}

// --- 4. Data Loading Function ---
async function loadOrderHistory(page: number) {
    refreshButton.disabled = true;
    refreshButton.textContent = 'Loading...';
    prevButton.disabled = true;
    nextButton.disabled = true;
    
    // Update URL to send page and limit
    const url = `${API_BASE_URL}?page=${page}&limit=${LIMIT}`;
    
    historyTableBody.innerHTML = '<tr><td colspan="6">Loading history...</td></tr>';

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to fetch history');
        }

        // The response is now an object
        const data: { orders: Order[], totalPages: number, currentPage: number } = await response.json();
        
        historyTableBody.innerHTML = '';
        
        // Update state
        currentPage = data.currentPage;
        totalPages = data.totalPages;

        if (data.orders.length === 0) {
            historyTableBody.innerHTML = '<tr><td colspan="6">No order history found for this page.</td></tr>';
            pageInfo.textContent = 'No data';
            return;
        }

        // Populate the table
        data.orders.forEach(order => {
            const row = historyTableBody.insertRow();
            
            row.insertCell().textContent = order.orderid.toString();
            row.insertCell().textContent = new Date(order.orderdate).toLocaleString(); 
            row.insertCell().textContent = order.employeeatcheckout.toString();
            row.insertCell().textContent = order.paymentmethod;

            // Create the nested list of items
            const itemsCell = row.insertCell();
            const itemList = document.createElement('ul');
            itemList.className = 'item-list'; // For styling
            
            order.items.forEach(item => {
                const li = document.createElement('li');
                li.textContent = `${item.name} (x${item.qty}) - $${parseFloat(item.price).toFixed(2)}`;
                itemList.appendChild(li);
            });
            itemsCell.appendChild(itemList);
            // End of item list cell

            // Add the total price
            row.insertCell().textContent = `$${parseFloat(order.total_order_price).toFixed(2)}`;
        });

        // --- 5. Update Pagination Controls ---
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        
        // Enable/disable buttons based on current page
        prevButton.disabled = currentPage <= 1;
        nextButton.disabled = currentPage >= totalPages;

    } catch (e: unknown) {
        let msg = 'An unknown error occurred.';
        if (e instanceof Error) msg = e.message;
        historyTableBody.innerHTML = `<tr><td colspan="6" style="color: red;">Error: ${msg}</td></tr>`;
    } finally {
        refreshButton.disabled = false;
        refreshButton.textContent = 'Refresh Order History';
    }
}

// --- 6. Initialization ---
function init() {
    // Sidebar navigation
    document.getElementById('menuButton1')?.addEventListener('click', () => navigateToPage('menuItems.html'));
    document.getElementById('menuButton2')?.addEventListener('click', () => navigateToPage('inventory.html')); // Assuming you'll make this
    document.getElementById('menuButton4')?.addEventListener('click', () => navigateToPage('employees.html')); // Assuming you'll make this
    document.getElementById('menuButton5')?.addEventListener('click', () => navigateToPage('login.html')); // Assuming you'll make this

    // Add Listeners for new buttons
    refreshButton.addEventListener('click', () => loadOrderHistory(currentPage));
    
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            loadOrderHistory(currentPage - 1);
        }
    });

    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            loadOrderHistory(currentPage + 1);
        }
    });

    // Initial load
    loadOrderHistory(currentPage);
}

document.addEventListener('DOMContentLoaded', init);