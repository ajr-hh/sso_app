import { RestaurantView } from "@/components/restaurant-view";
import { getAppUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function RestaurantPage() {
  const user = await getAppUser();
  return (
    <RestaurantView
      restaurants={user.restaurants.map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        filter: restaurant.filter,
        dishes: restaurant.dishes.map((dish) => ({ id: dish.id, label: dish.label })),
      }))}
    />
  );
}
