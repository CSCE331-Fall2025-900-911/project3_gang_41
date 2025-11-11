import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Package, Users, History, LayoutDashboard, SquareMenu } from 'lucide-react'; //icons
import MenuPage from './menupage';
import EmployeesPage from './EmployeesPage';
import InventoryPage from './InventoryPage';
import HistoryPage from './HistoryPage';

const categories = ['Dashboard', 'Menu Items', 'Inventory', 'Employees', 'Order History'];

const InventoryContent = () => (
    <InventoryPage/>
);

const EmployeesContent = () => (
    <EmployeesPage/>
);

const HistoryContent = () => (
    <HistoryPage/>
);

const MenuContent = () => (
    <MenuPage/>
);

const DashboardContent = () => (
    <div className="flex h-screen bg-background">
        

        <div className="flex-1 p-8 overflow-y-auto">
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
            
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                    {/*inventory */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total Inventory
                            </CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">67 items</div>
                            <p className="text-xs text-muted-foreground">
                                placeholder info
                            </p>
                        </CardContent>
                        <CardFooter>
                            <Button variant="link" className="p-0">View Details</Button>
                        </CardFooter>
                    </Card>
                    
                    {/*employees info */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Employees
                            </CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">45</div>
                            <p className="text-xs text-muted-foreground">
                                placeholder info
                            </p>
                        </CardContent>
                        <CardFooter>
                            <Button variant="link" className="p-0">Manage Staff</Button>
                        </CardFooter>
                    </Card>

                    {/* order hist card */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Recent Activity
                            </CardTitle>
                            <History className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">15 logs</div>
                            <p className="text-xs text-muted-foreground">
                                placeholder info
                            </p>
                        </CardContent>
                        <CardFooter>
                            <Button variant="link" className="p-0">Review History</Button>
                        </CardFooter>
                    </Card>

                </div>
            </section>
            
            {/*put charts here*/}
            <section className="mb-8">
                <div>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Charts here
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">big performative table</div>
                            <p className="text-xs text-muted-foreground">
                                
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </section>

        </div>
    </div>
);


function Manager() {
    const [activeCategory, setActiveCategory] = useState('Dashboard'); 

    const renderContent = () => {
        switch (activeCategory) {
            case 'Dashboard':
                return <DashboardContent />;
            case 'Inventory':
                return <InventoryContent />;
            case 'Employees':
                return <EmployeesContent />;
            case 'Order History':
                return <HistoryContent />;
            case 'Menu Items':
                return <MenuContent/>
            default:
                return <DashboardContent />;
        }
    };
    
    // Optional: Map categories to icons for a better sidebar look
    const categoryIcons = {
        'Dashboard': <LayoutDashboard className="h-4 w-4 mr-2" />,
        'Menu Items': <SquareMenu className="h-4 w-4 mr-2" />,
        'Inventory': <Package className="h-4 w-4 mr-2" />,
        'Employees': <Users className="h-4 w-4 mr-2" />,
        'Order History': <History className="h-4 w-4 mr-2" />,
    };

    return (
        <div className="flex h-screen bg-background">
            <div className="w-64 bg-gray-100 dark:bg-gray-900 border-r p-4 flex flex-col gap-2">
                <h2 className="text-lg font-semibold mb-2 text-foreground">Management</h2>
                {categories.map((category) => (
                    <Button
                        key={category}
                        variant={activeCategory === category ? "default" : "ghost"}
                        className="w-full justify-start text-left"
                        onClick={() => setActiveCategory(category)}
                    >
                        {categoryIcons[category]}
                        {category}
                    </Button>
                ))}
            </div>

            <div className="flex-1 p-8 overflow-y-auto">
                {renderContent()}
            </div>
        </div>
    );
}

export default Manager;