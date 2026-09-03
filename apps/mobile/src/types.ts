export type Profile = {
  id: string;
  display_name: string | null;
  age: number | null;
  contact_info: string | null;
  why_matters: string | null;
  motivators: string;
  coach_style: "marcus" | "elena";
};
