"use client";

import { useState } from "react";
import { addRestaurant, addRestaurantDish } from "@/app/actions";
import { useDemo } from "@/components/providers";
import {
  BackBar,
  Button,
  Card,
  Eyebrow,
  Field,
  Footnote,
  ListItem,
  Screen,
  ScreenSub,
  ScreenTitle,
} from "@/components/ui";

type Restaurant = {
  id: string;
  name: string;
  filter: string;
  dishes: { id: string; label: string }[];
};

export function RestaurantView({ restaurants }: { restaurants: Restaurant[] }) {
  const { showToast } = useDemo();
  const [items, setItems] = useState(restaurants);
  const [name, setName] = useState("");
  const [filter, setFilter] = useState("40g+ protein, under 700 cal");
  const [dishDrafts, setDishDrafts] = useState<Record<string, string>>({});

  return (
    <Screen>
      <BackBar label="Restaurant finder" href="/profile" />
      <Eyebrow>Other tools</Eyebrow>
      <ScreenTitle>Best choices, your favorite spots</ScreenTitle>
      <ScreenSub>Save the menu picks that already fit your goals.</ScreenSub>

      {items.map((restaurant) => (
        <Card key={restaurant.id}>
          <p className="mb-0.5 text-[14.5px] font-bold">{restaurant.name}</p>
          <p className="mb-2.5 text-xs text-ink-70">Filtered for: {restaurant.filter}</p>
          {restaurant.dishes.map((dish) => (
            <ListItem key={dish.id} icon="star">
              {dish.label}
            </ListItem>
          ))}
          <div className="mt-3 flex gap-2">
            <Field
              value={dishDrafts[restaurant.id] ?? ""}
              onChange={(value) => setDishDrafts((prev) => ({ ...prev, [restaurant.id]: value }))}
              placeholder="Add a dish"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                const result = await addRestaurantDish(restaurant.id, dishDrafts[restaurant.id] ?? "");
                if (result.error || !result.dish) {
                  showToast(result.error ?? "Could not add that.");
                  return;
                }
                setItems((prev) =>
                  prev.map((item) =>
                    item.id === restaurant.id ? { ...item, dishes: [...item.dishes, result.dish] } : item,
                  ),
                );
                setDishDrafts((prev) => ({ ...prev, [restaurant.id]: "" }));
              }}
            >
              Add
            </Button>
          </div>
        </Card>
      ))}

      <Card>
        <h2 className="mb-2 text-sm">Add a restaurant</h2>
        <div className="space-y-2">
          <Field value={name} onChange={setName} placeholder="Restaurant name" />
          <Field value={filter} onChange={setFilter} placeholder="Filter, e.g. 40g+ protein" />
          <Button
            onClick={async () => {
              const result = await addRestaurant(name, filter);
              if (result.error || !result.restaurant) {
                showToast(result.error ?? "Could not add that.");
                return;
              }
              setItems((prev) => [...prev, result.restaurant]);
              setName("");
              showToast("Saved to your list.");
            }}
          >
            Save spot
          </Button>
        </div>
      </Card>
      <Footnote>Add your top spots and the dishes that already work. SOS keeps the list ready.</Footnote>
    </Screen>
  );
}
