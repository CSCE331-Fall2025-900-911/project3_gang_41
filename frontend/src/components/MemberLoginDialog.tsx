import { useState, useEffect, useRef } from "react";
import { useCustomer } from "@/contexts/CustomerContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GoogleLogin } from "@react-oauth/google";
import { NumericKeypad } from "./NumericKeypad";
import { VirtualKeyboard } from "./VirtualKeyboard";
import { UserPlus, Phone, Mail } from "lucide-react";

interface MemberLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberLoginDialog({ open, onOpenChange }: MemberLoginDialogProps) {
  const { loginPhone, loginEmail, registerCustomer, loginGoogleCustomer } = useCustomer();
  
  const [activeTab, setActiveTab] = useState("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [newName, setNewName] = useState("");
  
  const emailInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setPhoneNumber("");
        setEmail("");
        setNewName("");
        setIsRegistering(false);
        setActiveTab("phone");
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Focus management
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        if (isRegistering) nameInputRef.current?.focus();
        else if (activeTab === 'email') emailInputRef.current?.focus();
        else if (activeTab === 'phone') phoneInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, open, isRegistering]);

  // --- HANDLERS ---
  const handlePhoneKeyPress = (key: string) => {
    if (phoneNumber.length < 10) setPhoneNumber(prev => prev + key);
  };
  const handlePhoneDelete = () => setPhoneNumber(prev => prev.slice(0, -1));

  const handleVirtualKeyPress = (key: string) => {
    if (isRegistering) {
        setNewName(prev => prev + key);
        // Ensure input keeps focus visually and logically
        nameInputRef.current?.focus();
    } else {
        setEmail(prev => prev + key);
        emailInputRef.current?.focus();
    }
  };

  const handleVirtualDelete = () => {
    if (isRegistering) {
        setNewName(prev => prev.slice(0, -1));
        nameInputRef.current?.focus();
    } else {
        setEmail(prev => prev.slice(0, -1));
        emailInputRef.current?.focus();
    }
  };

  const handleSubmitPhone = async () => {
    if (phoneNumber.length !== 10) return;
    if (isRegistering) {
       await registerCustomer({ phone: phoneNumber, name: newName });
       onOpenChange(false);
    } else {
       const found = await loginPhone(phoneNumber);
       if (!found) setIsRegistering(true);
       else onOpenChange(false);
    }
  };

  const handleSubmitEmail = async () => {
    if (!email.includes("@") || email.length < 5) return;
    if (isRegistering) {
        await registerCustomer({ email: email, name: newName });
        onOpenChange(false);
    } else {
        const found = await loginEmail(email);
        if (!found) setIsRegistering(true);
        else onOpenChange(false);
    }
  };

  // --- GLOBAL KEYBOARD LISTENER ---
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Logic: If on Phone tab (and NOT registering), listen for global keys
      // If on Email/Register, only listen for Enter because the Input handles the rest
      if (activeTab === "phone" && !isRegistering) {
        if (e.key === "Enter") {
          e.preventDefault();
          handleSubmitPhone();
        } else if (e.key === "Backspace") {
          // If the readonly input is focused, prevent browser back
          if (document.activeElement === phoneInputRef.current) e.preventDefault();
          handlePhoneDelete();
        } else if (/^[0-9]$/.test(e.key)) {
          handlePhoneKeyPress(e.key);
        }
      } else {
        if (e.key === "Enter") {
            e.preventDefault();
            if (isRegistering) {
                if (activeTab === 'phone') handleSubmitPhone();
                else handleSubmitEmail();
            } else if (activeTab === 'email') {
                handleSubmitEmail();
            }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, activeTab, isRegistering, phoneNumber, email, newName]); 

  const formatPhone = (val: string) => {
    if (!val) return "";
    const cleaned = val.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) return !match[2] ? match[1] : `(${match[1]}) ${match[2]}${match[3] ? '-' + match[3] : ''}`;
    return val;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
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
          <DialogDescription className="text-center text-base">
             {isRegistering 
               ? "We didn't find an account. Enter your name below to create one!" 
               : "Earn points on every order. 10 points per $1."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {!isRegistering && (
            <TabsList className="grid w-full grid-cols-3 mb-6 h-12">
              <TabsTrigger value="phone" className="text-lg"><Phone className="w-5 h-5 mr-2"/> Phone</TabsTrigger>
              <TabsTrigger value="email" className="text-lg"><Mail className="w-5 h-5 mr-2"/> Email</TabsTrigger>
              <TabsTrigger value="google" className="text-lg">Google</TabsTrigger>
            </TabsList>
          )}

          {/* === PHONE TAB === */}
          <TabsContent value="phone" className="space-y-6">
             <div className="flex justify-center">
                <Input 
                    ref={phoneInputRef}
                    readOnly
                    placeholder="(555) 000-0000"
                    value={formatPhone(phoneNumber)}
                    // CHANGED: h-auto + py-6 to let font dictate height. !text-5xl to force size.
                    className="text-center !text-4xl h-auto py-6 tracking-widest font-mono font-bold max-w-lg border-slate-300 dark:border-slate-700 bg-background cursor-default focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    onKeyDown={(e) => e.preventDefault()}
                />
             </div>
             
             {isRegistering && (
               <div className="animate-in slide-in-from-right fade-in duration-300 space-y-2">
                  <Input 
                    ref={nameInputRef}
                    placeholder="Enter First Name" 
                    className="text-center text-2xl h-16 bg-muted/30 border-slate-300"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
               </div>
             )}

             <div className="flex justify-center">
                 {isRegistering ? (
                    <VirtualKeyboard onKeyPress={handleVirtualKeyPress} onDelete={handleVirtualDelete} />
                 ) : (
                    <NumericKeypad onKeyPress={handlePhoneKeyPress} onDelete={handlePhoneDelete} />
                 )}
             </div>

             <Button 
                size="lg"
                className="w-full h-14 text-xl font-bold mt-4" 
                onClick={handleSubmitPhone}
                disabled={phoneNumber.length < 10 || (isRegistering && newName.length < 2)}
             >
                {isRegistering ? "Create Account" : "Continue"}
             </Button>
          </TabsContent>

          {/* === EMAIL TAB === */}
          <TabsContent value="email" className="space-y-4">
             <div className="space-y-4">
                <div className="space-y-2">
                    {!isRegistering ? (
                        <Input 
                            ref={emailInputRef}
                            type="email"
                            placeholder="name@example.com" 
                            className="text-center text-2xl h-16 bg-muted/30 border-slate-300"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    ) : (
                        <div className="space-y-3 animate-in slide-in-from-right fade-in duration-300">
                            <div className="text-center text-lg font-medium text-primary/80 border-b pb-1 mx-auto max-w-sm">
                                {email}
                            </div>
                            <Input 
                                ref={nameInputRef}
                                placeholder="Enter First Name" 
                                className="text-center text-2xl h-16 bg-muted/30 border-slate-300"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                            />
                        </div>
                    )}
                </div>
                
                <VirtualKeyboard onKeyPress={handleVirtualKeyPress} onDelete={handleVirtualDelete} />

                <Button 
                    size="lg"
                    className="w-full h-14 text-xl font-bold mt-2" 
                    onClick={handleSubmitEmail}
                    disabled={(!isRegistering && !email.includes('@')) || (isRegistering && newName.length < 2)}
                >
                    {isRegistering ? "Create Account" : "Continue"}
                </Button>
             </div>
          </TabsContent>

          {/* === GOOGLE TAB === */}
          <TabsContent value="google" className="py-12">
            <div className="flex flex-col items-center justify-center gap-6">
               <GoogleLogin
                  onSuccess={(res) => {
                    if (res.credential) {
                      loginGoogleCustomer(res.credential).then(() => onOpenChange(false));
                    }
                  }}
                  onError={() => console.log('Login Failed')}
                  width="400"
                  size="large"
                />
                <p className="text-base text-muted-foreground">Secure login via Google</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}