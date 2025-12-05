import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';
import type { CartItem } from '@project3/shared';

export function useCart() {
  const { t: translate } = useTranslation();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const processingRef = useRef(false);

  const addToCart = (item: CartItem) => {
    setCart((prev) => [...prev, item]);
  };

  const removeFromCart = (uniqueId: string) => {
    setCart((prev) => prev.filter((c) => c.uniqueId !== uniqueId));
  };

  const updateQuantity = (uniqueId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(uniqueId);
    } else {
      setCart((prev) => 
        prev.map((c) => (c.uniqueId === uniqueId ? { ...c, quantity } : c))
      );
    }
  };

  const updateCartItem = (uniqueId: string, updates: Partial<CartItem>) => {
    setCart((prev) =>
      prev.map((c) => (c.uniqueId === uniqueId ? { ...c, ...updates } : c))
    );
  };

  const clearCart = () => setCart([]);

  const checkout = async (
    paymentMethod: 'cash' | 'card' = 'card', 
    // UPDATED: onSuccess now accepts an orderId (number)
    onSuccess?: (orderId: number) => void,
    customerId?: number,
    pointsRedeemed?: number,
    discountAmount?: number
  ) => {
    if (processingRef.current) return;
    if (cart.length === 0) return;

    processingRef.current = true;
    setIsSubmitting(true);

    try {
      // Define async action
      const checkoutPromise = (async () => {
        const orderData = {
          items: cart.map(item => ({
            item_id: item.item_id,
            item_name: item.item_name,
            quantity: item.quantity,
            cost: item.cost
          })),
          paymentmethod: paymentMethod,
          customerId,
          pointsRedeemed,
          discountAmount
        };

        // UPDATED: fetchApi automatically unwraps 'data', so we expect { orderid: number }
        const response = await fetchApi<{ orderid: number }>('/api/order-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
        });

        clearCart();
        // UPDATED: Pass the ID back
        if (onSuccess) onSuccess(response.orderid);
        
        return { success: true };
      })();

      toast.promise(checkoutPromise, {
        loading: translate("checkout.processing"),
        success: translate("checkout.success"),
        error: translate("checkout.error"),
      });

      await checkoutPromise;
    } catch (error) {
      console.error(error);
    } finally {
      processingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateCartItem,
    clearCart,
    checkout,
    isSubmitting
  };
}