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

export type DrinkSize = 'Small' | 'Medium' | 'Large';

export interface DrinkCustomization {
  size: DrinkSize;
  hot: 'Yes' | 'No';
  sweetness: '0%' | '50%' | '100%' | '150%';
  ice: 'None' | 'Less' | 'Normal' | 'More';
}

// Medium is the baseline price; Small is 20% cheaper, Large is 20% more.
export const SIZE_MULTIPLIERS: Record<DrinkSize, number> = {
  Small: 0.8,
  Medium: 1.0,
  Large: 1.2,
};

export function sizedDrinkCost(baseCost: number, size: DrinkSize): number {
  return baseCost * SIZE_MULTIPLIERS[size];
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
  email?: string;
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
  const drinkCost = sizedDrinkCost(Number(item.drink.cost), item.customization.size);
  return (drinkCost + toppingCost) * item.quantity;
}

// Happy hour: discount applies to the drink price only, not toppings
export function lineTotalDiscounted(item: CartItem, discountMultiplier: number): number {
  const toppingCost = item.toppings.reduce(
    (sum, t) => sum + t.price * t.amount,
    0
  );
  const drinkCost = sizedDrinkCost(Number(item.drink.cost), item.customization.size);
  return (drinkCost * discountMultiplier + toppingCost) * item.quantity;
}
