import { FoodView } from "@/components/food-view";
import { getAppUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function FoodPage() {
  const user = await getAppUser();
  return (
    <FoodView
      foods={user.kryptonite.map((food) => ({
        id: food.id,
        label: food.label,
        swaps: food.swaps.map((swap) => ({ id: swap.id, label: swap.label })),
      }))}
    />
  );
}
