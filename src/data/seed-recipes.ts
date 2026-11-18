// 20 starter dinner recipes, published by the "Ambrosio" account.
// Recipe names are in Portuguese. Each ingredient uses the exact English product name from products.ts, so the app
// can match it (allergy warnings, vegan warnings and the shopping list all work).
// Amounts are for about 4 people. Units are g, ml or unit.

export type SeedIngredient = { product: string; amount: number; unit: 'g' | 'ml' | 'unit' };
// course: what kind of meal it is (the ready-made week for new guests only uses dinners).
// servings: how many people the amounts are for (dinners: 4).
export type Course = 'dinner' | 'dessert' | 'cake' | 'breakfast';
export type SeedRecipe = { name: string; ingredients: SeedIngredient[]; course?: Course; servings?: number };

const g = (product: string, amount: number): SeedIngredient => ({ product, amount, unit: 'g' });
const ml = (product: string, amount: number): SeedIngredient => ({ product, amount, unit: 'ml' });
const n = (product: string, amount: number): SeedIngredient => ({ product, amount, unit: 'unit' });

export const SEED_RECIPES: SeedRecipe[] = [
  // Portuguese classics
  {
    name: 'Bacalhau à Brás',
    ingredients: [g('Salted cod', 500), g('Potato', 600), g('Onion', 200), n('Garlic', 3), n('Egg', 6), ml('Olive oil', 80), g('Black olives', 50), g('Parsley', 15), g('Black pepper', 2)],
  },
  {
    name: 'Arroz de Pato',
    ingredients: [g('Carolino rice', 300), g('Duck leg', 800), g('Chouriço', 150), g('Onion', 200), n('Garlic', 3), n('Fresh bay leaf', 2), ml('Olive oil', 50), ml('White wine', 100), g('Salt', 8)],
  },
  {
    name: 'Caldo Verde',
    ingredients: [g('Potato', 500), g('Galician kale', 250), g('Onion', 150), n('Garlic', 2), g('Chouriço', 150), ml('Olive oil', 60), ml('Water', 1500), g('Salt', 8)],
  },
  {
    name: 'Bifanas de Porco',
    ingredients: [g('Pork loin', 600), n('Garlic', 4), ml('White wine', 150), g('Paprika', 5), n('Fresh bay leaf', 2), ml('Olive oil', 40), g('Bread', 300), g('Salt', 6), g('Black pepper', 2)],
  },
  {
    name: 'Frango Piri-Piri',
    ingredients: [g('Whole chicken', 1600), ml('Piri-piri sauce', 60), n('Garlic', 4), n('Lemon', 1), ml('Olive oil', 60), g('Paprika', 8), g('Salt', 8)],
  },
  {
    name: 'Sardinhas Assadas com Salada de Pimentos',
    ingredients: [g('Sardines', 1000), g('Coarse sea salt', 15), g('Red pepper', 300), g('Tomato', 300), g('Onion', 100), ml('Olive oil', 40), ml('White wine vinegar', 20)],
  },
  {
    name: 'Feijoada à Portuguesa',
    ingredients: [g('Kidney beans (canned)', 800), g('Pork belly', 300), g('Chouriço', 150), g('Morcela', 150), g('Carrot', 200), g('Onion', 150), n('Garlic', 3), g('Cabbage', 300), n('Fresh bay leaf', 2), g('Tomato paste', 30), ml('Olive oil', 40), g('Salt', 6)],
  },
  {
    name: 'Arroz de Marisco',
    ingredients: [g('Carolino rice', 300), g('Prawns', 400), g('Clams', 400), g('Mussels', 400), g('Tomato', 300), g('Onion', 150), n('Garlic', 3), g('Coriander', 20), ml('Olive oil', 50), ml('White wine', 100), g('Salt', 6)],
  },
  {
    name: 'Bacalhau com Natas',
    ingredients: [g('Salted cod', 600), g('Potato', 700), g('Onion', 250), ml('Whipping cream', 400), g('Butter', 30), ml('Whole milk', 300), g('Plain flour', 30), g('Nutmeg', 1), g('Grated cheese', 80), g('Black pepper', 2), ml('Olive oil', 40)],
  },
  {
    name: 'Bife à Casa com Ovo e Batatas',
    ingredients: [g('Beef steak', 600), n('Garlic', 4), g('Butter', 40), ml('White wine', 100), n('Egg', 4), g('Potato', 600), ml('Olive oil', 60), g('Salt', 6)],
  },
  {
    name: 'Carne de Porco à Alentejana',
    ingredients: [g('Pork shoulder', 700), g('Clams', 500), g('Potato', 600), n('Garlic', 4), g('Paprika', 10), ml('White wine', 150), g('Coriander', 20), n('Fresh bay leaf', 2), ml('Olive oil', 60), g('Salt', 6)],
  },
  {
    name: 'Bacalhau à Gomes de Sá',
    ingredients: [g('Salted cod', 600), g('Potato', 700), g('Onion', 300), n('Egg', 4), g('Black olives', 60), n('Garlic', 2), g('Parsley', 15), ml('Olive oil', 100)],
  },
  {
    name: 'Dourada Grelhada com Batatas e Feijão-verde',
    ingredients: [g('Sea bream', 1200), g('Potato', 700), n('Garlic', 3), ml('Olive oil', 80), n('Lemon', 1), g('Coarse sea salt', 10), g('Parsley', 10), g('Green beans', 300)],
  },

  // Classic quick dinners
  {
    name: 'Esparguete à Bolonhesa',
    ingredients: [g('Spaghetti', 400), g('Minced beef', 500), g('Onion', 150), g('Carrot', 100), n('Garlic', 2), g('Chopped tomatoes', 400), g('Tomato paste', 30), ml('Olive oil', 30), ml('Red wine', 100), g('Salt', 5), g('Black pepper', 2), g('Dried oregano', 2)],
  },
  {
    name: 'Esparguete à Carbonara',
    ingredients: [g('Spaghetti', 400), g('Pancetta', 200), n('Egg', 4), g('Parmesan', 80), g('Black pepper', 3), g('Salt', 6)],
  },
  {
    name: 'Caril de Frango com Arroz',
    ingredients: [g('Chicken thigh', 700), g('Onion', 200), n('Garlic', 3), g('Ginger', 15), g('Curry powder', 15), ml('Coconut milk', 400), g('Chopped tomatoes', 200), g('Basmati rice', 300), ml('Vegetable oil', 30), g('Salt', 5)],
  },
  {
    name: 'Omelete de Fiambre e Queijo com Salada',
    ingredients: [n('Egg', 8), g('Cooked ham', 150), g('Cheddar', 100), g('Butter', 20), g('Lettuce', 150), g('Tomato', 250), ml('Olive oil', 20), g('Salt', 4)],
  },
  {
    name: 'Massa de Atum',
    ingredients: [g('Fusilli', 400), g('Canned tuna in oil', 240), g('Chopped tomatoes', 400), n('Garlic', 2), ml('Olive oil', 30), g('Black olives', 50), g('Capers', 20), g('Parsley', 10), g('Salt', 4)],
  },
  {
    name: 'Frango Grelhado com Arroz e Salada',
    ingredients: [g('Chicken breast', 600), g('White rice', 300), g('Lettuce', 150), g('Tomato', 250), g('Carrot', 100), ml('Olive oil', 40), n('Lemon', 1), n('Garlic', 2), g('Salt', 6), g('Paprika', 4)],
  },
  {
    name: 'Salmão no Forno com Batatas e Brócolos',
    ingredients: [g('Salmon', 600), g('Potato', 600), g('Broccoli', 400), ml('Olive oil', 40), n('Lemon', 1), n('Garlic', 2), g('Salt', 5), g('Black pepper', 2)],
  },

  // Portuguese desserts (for 6)
  {
    name: 'Arroz Doce',
    course: 'dessert',
    servings: 6,
    ingredients: [g('Carolino rice', 200), ml('Whole milk', 1000), g('Sugar', 200), n('Lemon', 1), n('Cinnamon stick', 1), n('Egg', 4), g('Ground cinnamon', 5), g('Salt', 2)],
  },
  {
    name: 'Leite-Creme',
    course: 'dessert',
    servings: 6,
    ingredients: [ml('Whole milk', 750), n('Egg', 6), g('Sugar', 200), g('Cornflour', 30), n('Lemon', 1), n('Cinnamon stick', 1)],
  },
  {
    name: 'Mousse de Chocolate',
    course: 'dessert',
    servings: 6,
    ingredients: [g('Dark chocolate', 200), n('Egg', 6), g('Butter', 50), g('Sugar', 50), g('Salt', 1)],
  },
  {
    name: 'Baba de Camelo',
    course: 'dessert',
    servings: 6,
    ingredients: [g('Condensed milk', 794), n('Egg', 6), g('Almonds', 40)],
  },

  // Portuguese cakes (for 10)
  {
    name: 'Bolo de Bolacha',
    course: 'cake',
    servings: 10,
    ingredients: [g('Maria biscuits', 400), g('Butter', 250), g('Sugar', 200), n('Egg', 2), ml('Coffee', 300)],
  },
  {
    name: 'Bolo de Laranja',
    course: 'cake',
    servings: 10,
    ingredients: [n('Orange', 2), n('Egg', 4), g('Sugar', 250), g('Plain flour', 250), g('Baking powder', 10), ml('Vegetable oil', 100), g('Butter', 10)],
  },

  // Breakfast (for 2)
  {
    name: 'Ovos com Bacon',
    course: 'breakfast',
    servings: 2,
    ingredients: [n('Egg', 4), g('Bacon', 150), g('Butter', 10), g('Bread', 120), g('Salt', 1), g('Black pepper', 1)],
  },
];
