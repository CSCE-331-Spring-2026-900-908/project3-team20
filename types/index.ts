export interface Drink {
  drinkid: number;
  name: string;
  cost: number;
  category: string | null;
}

export interface Topping {
  toppingid: number;
  name: string;
  price: number;
  totalquantity: number;
}

export interface CartItemTopping {
  toppingid: number;
  name: string;
  price: number;
  amount: number;
}

export interface CartItem {
  drink: Drink;
  quantity: number;
  toppings: CartItemTopping[];
}

export function lineTotal(item: CartItem): number {
  const toppingCost = item.toppings.reduce(
    (sum, t) => sum + t.price * t.amount,
    0
  );
  return (item.drink.cost + toppingCost) * item.quantity;
}
