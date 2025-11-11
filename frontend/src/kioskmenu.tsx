import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button"
import { SidebarProvider} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar"

export default function kioskmenu() {
    const navigate = useNavigate()

    return (
        <div className="flex min-h-screen">
            <AppSidebar />
        
            <main className="flex-1 flex items-center justify-center w-full relative">
                <div>
                    hello world
                </div>


                <div className="fixed bottom-0 left-0 right-0 h-[10%] bg-gray-500 flex items-center justify-center">
                    <div className="flex items-center justify-center gap-4 w-full max-w-[500px] px-4">
                        <span className="text-white">Total:</span>
                        <Button variant="default" className="flex-1 max-w-[200px]">
                            Checkout
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    )
}