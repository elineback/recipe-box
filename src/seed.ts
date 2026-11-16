export interface SeedRecipe {
  title: string;
  description: string;
  protein: string;
  servings: number;
  prep: number;
  cook: number;
  /** Meal types; defaults to dinner. */
  types?: string[];
  ingredients: string[];
  steps: string[];
}

/** Starter recipes so search and the week planner work on first launch. */
export const SEED_RECIPES: SeedRecipe[] = [
  {
    title: 'Sheet Pan Lemon Herb Chicken',
    description: 'Chicken thighs roasted with potatoes and broccoli on one pan.',
    protein: 'chicken', servings: 4, prep: 15, cook: 35,
    ingredients: ['2 lb boneless skinless chicken thighs', '1 lb baby potatoes, halved', '1 head broccoli, cut into florets', '3 tbsp olive oil', '2 lemons', '4 cloves garlic, minced', '2 tsp dried oregano', '1 tsp salt', '1/2 tsp black pepper'],
    steps: ['Heat oven to 425°F.', 'Toss potatoes with half the oil and salt; roast 15 minutes.', 'Toss chicken and broccoli with remaining oil, garlic, oregano, pepper and the juice of one lemon.', 'Add to the pan and roast 20 minutes until the chicken reaches 165°F.', 'Serve with lemon wedges.'],
  },
  {
    title: 'Chicken Stir-Fry with Vegetables',
    description: 'Quick weeknight stir-fry with a ginger soy sauce.',
    protein: 'chicken', servings: 4, prep: 15, cook: 12,
    ingredients: ['1.5 lb chicken breast, thinly sliced', '2 bell peppers, sliced', '2 carrots, sliced', '1 head broccoli, cut into florets', '3 cloves garlic, minced', '1 tbsp fresh ginger, grated', '1/4 cup soy sauce', '1 tbsp cornstarch', '2 tbsp vegetable oil', '2 cups white rice'],
    steps: ['Cook rice according to the package.', 'Whisk soy sauce, cornstarch and 1/4 cup water.', 'Stir-fry chicken in hot oil until browned, then set aside.', 'Stir-fry vegetables, garlic and ginger for 4 minutes.', 'Return chicken, add sauce and cook until thickened. Serve over rice.'],
  },
  {
    title: 'Creamy Tuscan Chicken',
    description: 'Pan-seared chicken in a garlic, spinach and sun-dried tomato cream sauce.',
    protein: 'chicken', servings: 4, prep: 10, cook: 25,
    ingredients: ['4 chicken breasts', '2 tbsp olive oil', '4 cloves garlic, minced', '1 cup heavy cream', '1/2 cup chicken broth', '1/2 cup sun-dried tomatoes', '3 cups baby spinach', '1/2 cup grated parmesan', '1 tsp Italian seasoning'],
    steps: ['Season chicken and sear in oil 6 minutes per side; set aside.', 'Cook garlic 30 seconds, then add cream, broth, seasoning and parmesan.', 'Simmer until slightly thickened, then stir in tomatoes and spinach.', 'Return chicken to the pan and simmer 5 minutes.'],
  },
  {
    title: 'Classic Beef Tacos',
    description: 'Seasoned ground beef in crisp shells with fresh toppings.',
    protein: 'beef', servings: 4, prep: 10, cook: 15,
    ingredients: ['1 lb ground beef', '1 yellow onion, diced', '2 cloves garlic, minced', '2 tbsp chili powder', '1 tsp ground cumin', '1/2 cup tomato sauce', '8 taco shells', '2 cups shredded lettuce', '1 cup shredded cheddar cheese', '2 tomatoes, diced', '1/2 cup sour cream'],
    steps: ['Brown beef with onion over medium-high heat; drain.', 'Add garlic, chili powder, cumin and tomato sauce; simmer 5 minutes.', 'Warm taco shells.', 'Fill shells with beef and top with lettuce, cheese, tomato and sour cream.'],
  },
  {
    title: 'Beef and Broccoli',
    description: 'Tender flank steak and broccoli in a savory garlic sauce.',
    protein: 'beef', servings: 4, prep: 15, cook: 10,
    ingredients: ['1 lb flank steak, thinly sliced', '2 heads broccoli, cut into florets', '3 cloves garlic, minced', '1/3 cup soy sauce', '2 tbsp brown sugar', '1 tbsp cornstarch', '1 tbsp sesame oil', '2 tbsp vegetable oil', '2 cups white rice'],
    steps: ['Cook rice according to the package.', 'Whisk soy sauce, sugar, cornstarch, sesame oil and 1/3 cup water.', 'Sear steak in hot oil 2 minutes; set aside.', 'Stir-fry broccoli and garlic 4 minutes with a splash of water.', 'Return steak, add sauce and cook until glossy.'],
  },
  {
    title: 'Slow Cooker Beef Chili',
    description: 'Hearty chili with beans that cooks while you work.',
    protein: 'beef', servings: 6, prep: 15, cook: 360,
    ingredients: ['2 lb ground beef', '1 yellow onion, diced', '3 cloves garlic, minced', '2 cans kidney beans, drained', '1 can crushed tomatoes', '2 tbsp tomato paste', '3 tbsp chili powder', '2 tsp ground cumin', '1 cup beef broth', '1 cup shredded cheddar cheese'],
    steps: ['Brown beef with onion and garlic; drain.', 'Add everything except cheese to the slow cooker.', 'Cook on low 6 hours.', 'Serve topped with cheese.'],
  },
  {
    title: 'Honey Garlic Pork Chops',
    description: 'Pan-seared pork chops with a sticky honey garlic glaze.',
    protein: 'pork', servings: 4, prep: 5, cook: 20,
    ingredients: ['4 pork chops', '2 tbsp olive oil', '4 cloves garlic, minced', '1/3 cup honey', '1/4 cup soy sauce', '1 tbsp apple cider vinegar', '1 lb green beans, trimmed', '1 tsp salt'],
    steps: ['Season chops with salt and sear in oil 5 minutes per side.', 'Add garlic, honey, soy sauce and vinegar; simmer until syrupy, turning the chops.', 'Steam green beans 5 minutes.', 'Serve chops over beans with extra glaze.'],
  },
  {
    title: 'Sausage and Pepper Pasta',
    description: 'Italian sausage, sweet peppers and penne in tomato sauce.',
    protein: 'pork', servings: 4, prep: 10, cook: 25,
    ingredients: ['1 lb Italian sausage', '1 lb penne pasta', '2 bell peppers, sliced', '1 yellow onion, sliced', '3 cloves garlic, minced', '1 jar marinara sauce', '1/2 cup grated parmesan', '1 tbsp olive oil'],
    steps: ['Boil penne until al dente.', 'Brown sausage in oil, breaking it up.', 'Add peppers, onion and garlic; cook 6 minutes.', 'Stir in marinara and simmer 10 minutes.', 'Toss with pasta and top with parmesan.'],
  },
  {
    title: 'Pulled Pork Sandwiches',
    description: 'Slow-cooked pork shoulder with barbecue sauce and slaw.',
    protein: 'pork', servings: 8, prep: 15, cook: 480,
    ingredients: ['4 lb pork shoulder', '2 tbsp brown sugar', '1 tbsp smoked paprika', '2 tsp salt', '1 cup chicken broth', '1.5 cups barbecue sauce', '8 hamburger buns', '3 cups coleslaw mix', '1/4 cup mayonnaise', '1 tbsp apple cider vinegar'],
    steps: ['Rub pork with sugar, paprika and salt.', 'Slow cook with broth on low 8 hours.', 'Shred and toss with barbecue sauce.', 'Mix coleslaw with mayonnaise and vinegar.', 'Pile pork and slaw onto buns.'],
  },
  {
    title: 'Garlic Butter Salmon',
    description: 'Roasted salmon with asparagus and lemon garlic butter.',
    protein: 'seafood', servings: 4, prep: 10, cook: 15,
    ingredients: ['4 salmon fillets', '1 lb asparagus, trimmed', '4 tbsp butter, melted', '4 cloves garlic, minced', '1 lemon', '1 tsp salt', '1/2 tsp black pepper', '2 tbsp fresh parsley, chopped'],
    steps: ['Heat oven to 400°F.', 'Arrange salmon and asparagus on a sheet pan.', 'Mix butter, garlic and lemon juice; spoon over everything and season.', 'Roast 12–15 minutes.', 'Sprinkle with parsley.'],
  },
  {
    title: 'Shrimp Scampi Linguine',
    description: 'Shrimp in a white wine, lemon and garlic butter sauce.',
    protein: 'seafood', servings: 4, prep: 10, cook: 15,
    ingredients: ['1 lb large shrimp, peeled and deveined', '12 oz linguine', '4 tbsp butter', '2 tbsp olive oil', '5 cloves garlic, minced', '1/2 cup dry white wine', '1 lemon', '1/4 tsp red pepper flakes', '1/4 cup fresh parsley, chopped'],
    steps: ['Boil linguine until al dente; reserve 1/2 cup pasta water.', 'Cook garlic and pepper flakes in butter and oil 1 minute.', 'Add shrimp and cook 2 minutes per side.', 'Add wine and lemon juice; simmer 2 minutes.', 'Toss with pasta, parsley and a splash of pasta water.'],
  },
  {
    title: 'Fish Tacos with Lime Slaw',
    description: 'Spiced white fish in warm tortillas with a crunchy slaw.',
    protein: 'seafood', servings: 4, prep: 15, cook: 10,
    ingredients: ['1.5 lb cod fillets', '1 tbsp chili powder', '1 tsp ground cumin', '2 tbsp olive oil', '8 corn tortillas', '3 cups shredded cabbage', '2 limes', '1/4 cup sour cream', '1 avocado, sliced', '1/4 cup fresh cilantro, chopped'],
    steps: ['Season fish with chili powder, cumin and salt.', 'Pan-fry in oil 3–4 minutes per side, then flake.', 'Toss cabbage with lime juice, sour cream and cilantro.', 'Warm tortillas and fill with fish, slaw and avocado.'],
  },
  {
    title: 'Vegetable Coconut Curry',
    description: 'Chickpeas and vegetables simmered in a fragrant coconut curry.',
    protein: 'vegetarian', servings: 4, prep: 15, cook: 25,
    ingredients: ['1 can chickpeas, drained', '1 can coconut milk', '2 tbsp red curry paste', '1 yellow onion, diced', '3 cloves garlic, minced', '1 tbsp fresh ginger, grated', '2 bell peppers, diced', '1 sweet potato, cubed', '3 cups baby spinach', '2 cups white rice', '1 lime'],
    steps: ['Cook rice according to the package.', 'Sauté onion, garlic and ginger 3 minutes; stir in curry paste.', 'Add coconut milk, sweet potato and peppers; simmer 15 minutes.', 'Add chickpeas and spinach; cook 3 minutes.', 'Finish with lime juice and serve over rice.'],
  },
  {
    title: 'Black Bean Burrito Bowls',
    description: 'Rice bowls with seasoned black beans, corn, salsa and avocado.',
    protein: 'vegetarian', servings: 4, prep: 15, cook: 20,
    ingredients: ['2 cans black beans, drained', '2 cups white rice', '1.5 cups frozen corn', '1 tsp ground cumin', '1 tbsp chili powder', '1 cup salsa', '2 avocados, diced', '1 cup shredded cheddar cheese', '2 limes', '1/4 cup fresh cilantro, chopped'],
    steps: ['Cook rice; stir in the juice of one lime and the cilantro.', 'Warm beans with cumin and chili powder.', 'Char corn in a dry skillet 4 minutes.', 'Build bowls with rice, beans, corn, salsa, avocado and cheese.'],
  },
  {
    title: 'Mushroom Spinach Lasagna',
    description: 'Layers of ricotta, mushrooms, spinach and marinara.',
    protein: 'vegetarian', servings: 6, prep: 25, cook: 45,
    ingredients: ['12 lasagna noodles', '1 lb mushrooms, sliced', '6 cups baby spinach', '3 cloves garlic, minced', '2 cups ricotta cheese', '1 egg', '2 jars marinara sauce', '3 cups shredded mozzarella cheese', '1/2 cup grated parmesan', '1 tbsp olive oil'],
    steps: ['Heat oven to 375°F and boil the noodles.', 'Sauté mushrooms and garlic in oil; wilt in spinach.', 'Mix ricotta with egg and half the parmesan.', 'Layer sauce, noodles, ricotta, vegetables and mozzarella three times.', 'Cover and bake 30 minutes, then uncover and bake 15 more.'],
  },
  {
    title: 'Turkey Meatballs with Zucchini',
    description: 'Baked turkey meatballs in marinara over sautéed zucchini.',
    protein: 'turkey', servings: 4, prep: 15, cook: 25,
    ingredients: ['1.5 lb ground turkey', '1/2 cup breadcrumbs', '1 egg', '3 cloves garlic, minced', '1/2 cup grated parmesan', '1 tsp Italian seasoning', '1 jar marinara sauce', '3 zucchini, sliced', '1 tbsp olive oil'],
    steps: ['Heat oven to 400°F.', 'Mix turkey, breadcrumbs, egg, garlic, half the parmesan and seasoning; roll into balls.', 'Bake 18 minutes.', 'Simmer meatballs in marinara 5 minutes.', 'Sauté zucchini in oil and serve under the meatballs with remaining parmesan.'],
  },
];

/** Starter sides and desserts, so dinners can be rounded out into full meals. */
export const SEED_EXTRAS: SeedRecipe[] = [
  {
    title: 'Garlic Bread',
    description: 'Crisp, buttery baguette with garlic and parsley.',
    protein: 'vegetarian', servings: 6, prep: 5, cook: 12, types: ['side'],
    ingredients: ['1 baguette', '6 tbsp butter, softened', '4 cloves garlic, minced', '2 tbsp fresh parsley, chopped', '1/4 tsp salt'],
    steps: ['Heat oven to 400°F.', 'Mix butter, garlic, parsley and salt.', 'Halve the baguette lengthwise and spread with the butter.', 'Bake 10–12 minutes until golden, then slice.'],
  },
  {
    title: 'Simple Green Salad',
    description: 'Mixed greens with a quick lemon vinaigrette.',
    protein: 'vegetarian', servings: 4, prep: 10, cook: 0, types: ['side', 'lunch'],
    ingredients: ['6 cups mixed greens', '1 cucumber, sliced', '1 cup cherry tomatoes, halved', '3 tbsp olive oil', '1 lemon', '1 tsp Dijon mustard', '1/4 tsp salt'],
    steps: ['Whisk oil, the juice of the lemon, mustard and salt.', 'Toss greens, cucumber and tomatoes with the dressing just before serving.'],
  },
  {
    title: 'Roasted Garlic Potatoes',
    description: 'Crispy oven-roasted potatoes with garlic and rosemary.',
    protein: 'vegetarian', servings: 4, prep: 10, cook: 35, types: ['side'],
    ingredients: ['2 lb baby potatoes, halved', '3 tbsp olive oil', '4 cloves garlic, minced', '1 tbsp fresh rosemary, chopped', '1 tsp salt'],
    steps: ['Heat oven to 425°F.', 'Toss potatoes with oil, rosemary and salt.', 'Roast 25 minutes, stir in garlic, and roast 10 more until crisp.'],
  },
  {
    title: 'Fudgy Brownies',
    description: 'One-bowl chocolate brownies with a crackly top.',
    protein: 'vegetarian', servings: 12, prep: 10, cook: 25, types: ['dessert'],
    ingredients: ['1/2 cup butter, melted', '1 cup sugar', '2 eggs', '1 tsp vanilla extract', '1/3 cup cocoa powder', '1/2 cup flour', '1/4 tsp salt', '1/2 cup chocolate chips'],
    steps: ['Heat oven to 350°F and line an 8-inch pan.', 'Whisk butter, sugar, eggs and vanilla.', 'Fold in cocoa, flour, salt and chocolate chips.', 'Bake 22–25 minutes; cool before cutting.'],
  },
  {
    title: 'Berry Crisp',
    description: 'Warm mixed berries under a buttery oat topping.',
    protein: 'vegetarian', servings: 6, prep: 10, cook: 35, types: ['dessert'],
    ingredients: ['5 cups frozen mixed berries', '1/4 cup sugar', '1 tbsp cornstarch', '3/4 cup rolled oats', '1/2 cup flour', '1/3 cup brown sugar', '6 tbsp butter, cold', '1/2 tsp ground cinnamon'],
    steps: ['Heat oven to 375°F.', 'Toss berries with sugar and cornstarch in a baking dish.', 'Rub oats, flour, brown sugar, cinnamon and butter into crumbs; scatter on top.', 'Bake 35 minutes until bubbling.'],
  },
];
