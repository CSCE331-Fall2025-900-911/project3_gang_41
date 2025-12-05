import { useState } from "react";
import { useCustomer } from "@/contexts/CustomerContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GoogleLogin } from "@react-oauth/google";
import { NumericKeypad } from "./NumericKeypad";
import { UserPlus } from "lucide-react";

interface MemberLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberLoginDialog({ open, onOpenChange }: MemberLoginDialogProps) {
  const { loginPhone, registerCustomer, loginGoogleCustomer } = useCustomer();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [newName, setNewName] = useState("");
  const [activeTab, setActiveTab] = useState("phone");

  const handleKeyPress = (key: string) => {
    if (phoneNumber.length < 10) {
      setPhoneNumber(prev => prev + key);
    }
  };

  const handleDelete = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const formatPhone = (val: string) => {
    if (!val) return "";
    const cleaned = val.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      return !match[2] ? match[1] : `(${match[1]}) ${match[2]}${match[3] ? '-' + match[3] : ''}`;
    }
    return val;
  };

  const handleSubmitPhone = async () => {
    if (phoneNumber.length !== 10) return;
    
    if (isRegistering) {
       await registerCustomer(phoneNumber, newName);
       resetAndClose();
    } else {
       const found = await loginPhone(phoneNumber);
       if (found) {
         resetAndClose();
       } else {
         setIsRegistering(true); // Switch to registration mode
       }
    }
  };

  const resetAndClose = () => {
    setPhoneNumber("");
    setNewName("");
    setIsRegistering(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold flex flex-col items-center gap-2">
            {isRegistering ? (
              <>
                <UserPlus className="h-8 w-8 text-primary" />
                Join Rewards
              </>
            ) : (
              "Member Login"
            )}
          </DialogTitle>
          <DialogDescription className="text-center">
             {isRegistering 
               ? "We didn't find that number. Enter your name to join!" 
               : "Earn points on every order. 10 points per $1."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {!isRegistering && (
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="phone">Phone Number</TabsTrigger>
              <TabsTrigger value="google">Google</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="phone" className="space-y-4">
             <div className="text-center text-3xl font-mono tracking-wider font-bold h-12 flex items-center justify-center border-b-2 border-primary/20">
                {formatPhone(phoneNumber) || <span className="text-muted-foreground/30">(555) 000-0000</span>}
             </div>
             
             {isRegistering && (
               <div className="animate-in slide-in-from-right fade-in duration-300">
                  <Input 
                    placeholder="Enter your First Name" 
                    className="text-center text-lg h-12"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                  />
               </div>
             )}

             <NumericKeypad onKeyPress={handleKeyPress} onDelete={handleDelete} />

             <Button 
                className="w-full h-12 text-lg mt-4" 
                onClick={handleSubmitPhone}
                disabled={phoneNumber.length < 10 || (isRegistering && newName.length < 2)}
             >
                {isRegistering ? "Join & Earn Points" : "Continue"}
             </Button>
          </TabsContent>

          <TabsContent value="google" className="py-8">
            <div className="flex flex-col items-center justify-center gap-4">
               <GoogleLogin
                  onSuccess={(res) => {
                    if (res.credential) {
                      loginGoogleCustomer(res.credential).then(resetAndClose);
                    }
                  }}
                  onError={() => console.log('Login Failed')}
                  width="300"
                  size="large"
                />
                <p className="text-sm text-muted-foreground">Secure login via Google</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
