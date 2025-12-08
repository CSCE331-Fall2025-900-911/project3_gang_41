import { createContext, useContext, useState, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import type { Customer } from '@project3/shared';

// Re-export for components to use
export type { Customer };

interface CustomerContextType {
  customer: Customer | null;
  loginPhone: (phone: string) => Promise<boolean>;
  loginEmail: (email: string) => Promise<boolean>;
  registerCustomer: (data: { phone?: string; email?: string; name: string }) => Promise<void>;
  loginGoogleCustomer: (credential: string) => Promise<void>;
  logoutCustomer: () => void;
  refreshCustomer: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const { t: translate } = useTranslation();
  const [customer, setCustomer] = useState<Customer | null>(null);

  const loginPhone = async (phone: string) => {
    try {
      const res = await fetchApi<{ found: boolean; customer?: Customer }>('/api/customers/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      if (res.found && res.customer) {
        setCustomer(res.customer);
        toast.success(translate("member.welcomeBack", { name: res.customer.customer_name }));
        return true;
      }
      return false; 
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const loginEmail = async (email: string) => {
    try {
      const res = await fetchApi<{ found: boolean; customer?: Customer }>('/api/customers/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.found && res.customer) {
        setCustomer(res.customer);
        toast.success(translate("member.welcomeBack", { name: res.customer.customer_name }));
        return true;
      }
      return false; 
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const registerCustomer = async ({ phone, email, name }: { phone?: string; email?: string; name: string }) => {
    try {
      const newCustomer = await fetchApi<Customer>('/api/customers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email, name }),
      });
      setCustomer(newCustomer);
      toast.success(translate("member.regSuccess"));
    } catch (error) {
      console.error(error);
      toast.error(translate("toasts.regFailed"));
    }
  };

  const loginGoogleCustomer = async (credential: string) => {
    try {
      const user = await fetchApi<Customer>('/api/customers/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      setCustomer(user);
      toast.success(translate("member.welcomeBack", { name: user.customer_name }));
    } catch (error) {
      console.error(error);
      toast.error(translate("toasts.googleFailed"));
    }
  };

  const logoutCustomer = () => {
    setCustomer(null);
    toast.info(translate("toasts.loggedOut"));
  };

  const refreshCustomer = async () => {
      // Placeholder for re-fetching customer data
  };

  return (
    <CustomerContext.Provider value={{ 
        customer, 
        loginPhone, 
        loginEmail, 
        registerCustomer, 
        loginGoogleCustomer, 
        logoutCustomer, 
        refreshCustomer 
    }}>
      {children}
    </CustomerContext.Provider>
  );
}

export const useCustomer = () => {
  const context = useContext(CustomerContext);
  if (context === undefined) throw new Error('useCustomer must be used within CustomerProvider');
  return context;
};