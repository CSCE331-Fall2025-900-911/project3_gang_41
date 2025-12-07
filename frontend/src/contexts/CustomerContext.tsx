import { createContext, useContext, useState, ReactNode } from 'react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';

export interface Customer {
  customers_id: number;
  customer_name: string;
  points: number;
  email?: string;
  phone_number?: string;
}

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
        toast.success(`Welcome back, ${res.customer.customer_name}!`);
        return true;
      }
      return false; 
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  // NEW: Login via Email
  const loginEmail = async (email: string) => {
    try {
      const res = await fetchApi<{ found: boolean; customer?: Customer }>('/api/customers/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.found && res.customer) {
        setCustomer(res.customer);
        toast.success(`Welcome back, ${res.customer.customer_name}!`);
        return true;
      }
      return false; 
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  // UPDATED: Register accepts object
  const registerCustomer = async ({ phone, email, name }: { phone?: string; email?: string; name: string }) => {
    try {
      const newCustomer = await fetchApi<Customer>('/api/customers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email, name }),
      });
      setCustomer(newCustomer);
      toast.success('Membership created! 50 points added.');
    } catch (error) {
      console.error(error);
      toast.error('Registration failed');
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
      toast.success(`Welcome, ${user.customer_name}!`);
    } catch (error) {
      console.error(error);
      toast.error('Google login failed');
    }
  };

  const logoutCustomer = () => {
    setCustomer(null);
    toast.info('Logged out');
  };

  const refreshCustomer = async () => {
      // Placeholder
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