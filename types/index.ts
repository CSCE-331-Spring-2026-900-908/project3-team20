export interface Drink {
  drinkid: number;
  name: string;
  cost: number;
  category: string | null;
  image_url: string | null;
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

export interface DrinkCustomization {
  hot: 'Yes' | 'No';
  sweetness: '0%' | '25%' | '50%' | '75%' | '100%';
  ice: 'None' | 'Less' | 'Normal' | 'More';
}

export interface Ingredient {
  ingredientid: number;
  name: string;
  totalquantity: number;
  cost: number;
}

export interface MiscItem {
  anythingid: number;
  name: string;
  price: number;
  totalquantity: number;
}

export interface Employee {
  employeeid: number;
  name: string;
  role: boolean;
}

export interface CartItem {
  drink: Drink;
  quantity: number;
  toppings: CartItemTopping[];
  customization: DrinkCustomization;
}

export function lineTotal(item: CartItem): number {
  const toppingCost = item.toppings.reduce(
    (sum, t) => sum + t.price * t.amount,
    0
  );
  return (item.drink.cost + toppingCost) * item.quantity;
}

// Happy hour: discount applies to the drink price only, not toppings
export function lineTotalDiscounted(item: CartItem, discountMultiplier: number): number {
  const toppingCost = item.toppings.reduce(
    (sum, t) => sum + t.price * t.amount,
    0
  );
  return (item.drink.cost * discountMultiplier + toppingCost) * item.quantity;
}
