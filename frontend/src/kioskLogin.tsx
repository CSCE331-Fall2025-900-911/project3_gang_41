import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"

export default function KioskLogin(){
    const navigate = useNavigate()
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Rewards</CardTitle>
                    <CardDescription>
                    Earn points on your next order
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form>
                    <div className="flex flex-col gap-6">
                        <div className="grid gap-2">
                        <Input
                            id="number-input"
                            type="number"
                            placeholder="Enter your id"
                            required
                        />
                        </div>
                    </div>
                    </form>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                    <Button type="submit" className="w-full" onClick={() => navigate("/kioskmenu")}>
                        Login
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => navigate("/kioskmenu")}>
                        Continue without rewards
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}