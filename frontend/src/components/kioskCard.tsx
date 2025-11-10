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

export function KioskCard() {
  return (
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
        <Button type="submit" className="w-full">
          Login
        </Button>
        <Button variant="outline" className="w-full">
          Continue without rewards
        </Button>
      </CardFooter>
    </Card>
  )
}
