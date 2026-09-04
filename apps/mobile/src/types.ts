export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  age: number | null;
  phone: string | null;
  why_matters: string | null;
  motivators: string;
  coach_style: "marcus" | "elena";
};
