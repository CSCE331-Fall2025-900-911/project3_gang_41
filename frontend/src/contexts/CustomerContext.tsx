import { createContext, useContext, useState, ReactNode } from 'react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';

export interface Customer {
  customers_id: number;
  customer_name: string;
  points: number;
}

interface CustomerContextType {
  customer: Customer | null;
  loginPhone: (phone: string) => Promise<boolean>;
  registerCustomer: (phone: string, name: string) => Promise<void>;
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
      return false; // Not found, prompt registration
    } catch (error) {
      console.error(error);
      toast.error('Login failed');
      return false;
    }
  };

  const registerCustomer = async (phone: string, name: string) => {
    try {
      const newCustomer = await fetchApi<Customer>('/api/customers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name }),
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

  // Useful to update points immediately after an order
  const refreshCustomer = async () => {
      // Implementation depends on storing the phone/id, 
      // simplified here to just be a placeholder if needed later.
  };

  return (
    <CustomerContext.Provider value={{ customer, loginPhone, registerCustomer, loginGoogleCustomer, logoutCustomer, refreshCustomer }}>
      {children}
    </CustomerContext.Provider>
  );
}

export const useCustomer = () => {
  const context = useContext(CustomerContext);
  if (context === undefined) throw new Error('useCustomer must be used within CustomerProvider');
  return context;
};