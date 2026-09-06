import type { RailId } from "./lib/domain";
import type { DietFlag } from "./presentation/foodRules";

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  age: number | null;
  phone: string | null;
  why_matters: string | null;
  motivators: string;
  coach_style: "marcus" | "elena";
  rail_order: RailId[];
  food_rules_set: boolean;
  diet_flags: DietFlag[];
  allergens: string[];
};
