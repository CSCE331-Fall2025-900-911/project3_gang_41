import { useTranslation } from "react-i18next";
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
  const { t: translate } = useTranslation();
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{translate("kioskLogin.rewardsTitle")}</CardTitle>
        <CardDescription>
          {translate("kioskLogin.earnPoints")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Input
                id="number-input"
                type="number"
                placeholder={translate("kioskLogin.enterId")}
                required
              />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button type="submit" className="w-full">
          {translate("kioskLogin.login")}
        </Button>
        <Button variant="outline" className="w-full">
          {translate("kioskLogin.continueGuest")}
        </Button>
      </CardFooter>
    </Card>
  )
}
