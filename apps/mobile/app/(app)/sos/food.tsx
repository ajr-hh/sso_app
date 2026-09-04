import { Text } from "react-native";

import {
  SosCard,
  SosScreen,
  sosTextStyles,
} from "../../../components/SosUi";
import { FOOD_SWAPS } from "../../../src/content/food-swaps";

export default function FoodScreen() {
  return (
    <SosScreen
      eyebrow="BETTER CHOICES"
      subtitle="Name what you want, then choose an option that still feels satisfying."
      title="Make the next swap"
    >
      {Object.entries(FOOD_SWAPS).map(([craving, swaps]) => (
        <SosCard key={craving}>
          <Text style={sosTextStyles.sectionTitle}>{craving}</Text>
          {swaps.map((swap) => (
            <Text key={swap} style={sosTextStyles.body}>
              • {swap}
            </Text>
          ))}
        </SosCard>
      ))}
    </SosScreen>
  );
}
