import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import type { MenuItem } from "@project3/shared";
import { Loader2 } from 'lucide-react';

// Configuration for the board
const ITEMS_PER_PAGE = 8; // How many drink items to show at once
const ROTATION_INTERVAL = 8000; // Time in ms (8 seconds) to swap boards
const TRANSITION_DURATION = 500; // Time for fade effect (ms)

// Plain text list of toppings
const TOPPINGS_LIST = [
  "Tapioca Pearls",
  "Coconut Jelly", 
  "Aloe Vera", 
  "Red Bean", 
  "Lychee Jelly", 
  "Crystal Boba"
];

const TOPPING_PRICE = 0.50;

export default function Menuboards() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [fade, setFade] = useState(true); // State to control opacity

  // 1. Fetch Data
  useEffect(() => {
    fetchApi<MenuItem[]>('/api/menu')
      .then((data) => {
        // Group/Sort by Category first
        const sortedMenu = data
            .map((item) => ({ ...item, cost: parseFloat(String(item.cost)) }))
            .sort((a, b) => a.category.localeCompare(b.category) || a.item_name.localeCompare(b.item_name));
        
        setMenu(sortedMenu);
      })
      .catch(() => setMenu([]));
  }, []);

  // 2. Setup Auto-Rotation Timer with Fade Effect
  useEffect(() => {
    if (menu.length === 0) return;

    const totalPages = Math.ceil(menu.length / ITEMS_PER_PAGE);
    
    const interval = setInterval(() => {
      // Start fade out
      setFade(false);

      // Wait for fade out to complete, then swap page and fade back in
      setTimeout(() => {
        setCurrentPage((prev) => (prev + 1) % totalPages);
        setFade(true);
      }, TRANSITION_DURATION);

    }, ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, [menu.length]);

  // Calculate visible items for the current "Page"
  const totalPages = Math.ceil(menu.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const currentItems = menu.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Determine current category name
  const currentCategory = currentItems.length > 0 ? currentItems[0].category : "Menu";

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      
      {/* Main Content Area */}
      <div className="flex w-full h-full">
        
        {/* LEFT COLUMN: Rotating Menu Items */}
        <main className="flex-1 p-8 bg-background relative flex flex-col justify-between">
            {menu.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Loader2 className="h-10 w-10 animate-spin mr-2" />
                    <span className="text-2xl">Loading Menu...</span>
                </div>
            ) : (
                <>
                    {/* Category Header */}
                    <div 
                        className="mb-6 transition-opacity ease-in-out"
                        style={{ 
                            opacity: fade ? 1 : 0, 
                            transitionDuration: `${TRANSITION_DURATION}ms` 
                        }}
                    >
                        <h1 className="text-4xl font-extrabold text-primary uppercase tracking-tight border-b-4 border-primary/20 pb-2 inline-block">
                            {currentCategory}
                        </h1>
                    </div>

                    {/* Grid Container with Fade Transition */}
                    <div 
                      className={`grid grid-cols-2 gap-x-8 gap-y-6 content-start transition-opacity ease-in-out`}
                      style={{ 
                        opacity: fade ? 1 : 0, 
                        transitionDuration: `${TRANSITION_DURATION}ms` 
                      }}
                    >
                        {currentItems.map((item) => (
                            <div 
                                key={item.item_id}
                                className="flex items-center p-4 bg-white rounded-xl shadow-sm border border-slate-100 h-32"
                            >
                                <img
                                    src={item.image_url || "/brownsugarboba.jpg"}
                                    alt={item.item_name}
                                    className="w-24 h-24 object-cover rounded-lg shadow-sm flex-shrink-0 bg-slate-100"
                                />
                                <div className="ml-6 flex flex-col justify-center flex-1">
                                    <h3 className="text-2xl font-bold text-slate-800 leading-tight mb-1">
                                        {item.item_name}
                                    </h3>
                                    <span className="text-2xl font-bold text-primary">
                                        ${item.cost.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Page Indicator (Dots) */}
                    <div className="flex justify-center gap-2 mt-4 pb-2">
                        {Array.from({ length: totalPages }).map((_, idx) => (
                            <div 
                                key={idx}
                                className={`h-3 w-3 rounded-full transition-all duration-300 ${
                                    idx === currentPage ? "bg-primary w-8" : "bg-slate-300"
                                }`}
                            />
                        ))}
                    </div>
                </>
            )}
        </main>

        {/* RIGHT COLUMN: Static Toppings Sidebar */}
        <aside className="w-[25%] bg-slate-900 text-white p-8 flex flex-col justify-center shadow-2xl z-20">
            <div className="border-b border-slate-700 pb-6 mb-8 text-center">
                <h2 className="text-3xl font-black uppercase tracking-wider text-yellow-400">
                    Add-Ons
                </h2>
                <p className="text-slate-400 mt-2 text-lg">
                    Customize your drink
                </p>
            </div>

            <ul className="space-y-6">
                {TOPPINGS_LIST.map((topping, index) => (
                    <li key={index} className="flex items-center justify-between text-xl font-medium">
                        <span>{topping}</span>
                        <span className="text-yellow-400 font-bold ml-4">
                            +${TOPPING_PRICE.toFixed(2)}
                        </span>
                    </li>
                ))}
            </ul>

            <div className="mt-auto pt-10 text-center text-slate-500 text-sm">
                Seasonal toppings may vary.
            </div>
        </aside>

      </div>
    </div>
  );
}