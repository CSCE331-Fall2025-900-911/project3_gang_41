import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Settings, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ModeToggleProps {
  currentMode: "cashier" | "manager";
}

// Hardcoded manager credentials
const MANAGER_USERNAME = "admin";
const MANAGER_PASSWORD = "password";

export function ModeToggle({ currentMode }: ModeToggleProps) {
  const navigate = useNavigate();
  const [managerDialogOpen, setManagerDialogOpen] = useState(false);
  const [cashierDialogOpen, setCashierDialogOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleManagerClick = () => {
    if (currentMode === "manager") return;
    setManagerDialogOpen(true);
    setUsername("");
    setPassword("");
    setError("");
  };

  const handleCashierClick = () => {
    if (currentMode === "cashier") return;
    setCashierDialogOpen(true);
  };

  const handleManagerLogin = () => {
    if (username === MANAGER_USERNAME && password === MANAGER_PASSWORD) {
      setManagerDialogOpen(false);
      navigate("/manager");
    } else {
      setError("Invalid credentials");
    }
  };

  const handleCashierConfirm = () => {
    setCashierDialogOpen(false);
    navigate("/cashier");
  };

  return (
    <>
      <div className="flex items-center bg-muted/50 border rounded-full p-1 w-full">
        <button
          onClick={handleCashierClick}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200",
            currentMode === "cashier"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <ShoppingCart className="h-4 w-4" />
          Cashier
        </button>
        <button
          onClick={handleManagerClick}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200",
            currentMode === "manager"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Settings className="h-4 w-4" />
          Manager
        </button>
      </div>

      {/* Manager Login Dialog */}
      <Dialog open={managerDialogOpen} onOpenChange={setManagerDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Manager Login
            </DialogTitle>
            <DialogDescription>
              Enter manager credentials to access the management dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                onKeyDown={(e) => e.key === "Enter" && handleManagerLogin()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                onKeyDown={(e) => e.key === "Enter" && handleManagerLogin()}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setManagerDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleManagerLogin}>Login</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cashier Logout Confirmation Dialog */}
      <Dialog open={cashierDialogOpen} onOpenChange={setCashierDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Switch to Cashier Mode</DialogTitle>
            <DialogDescription>
              Are you sure you want to exit manager mode and return to cashier
              view?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCashierDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCashierConfirm}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
