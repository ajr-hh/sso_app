import type { StyleProp, TextStyle } from "react-native";
import { StyleSheet, Text } from "react-native";

export type MaterialSymbolName =
  | "add"
  | "arrow_back"
  | "arrow_forward"
  | "bolt"
  | "call"
  | "chart_data"
  | "check_circle"
  | "chat"
  | "delete"
  | "e911_emergency"
  | "edit"
  | "edit_note"
  | "emergency"
  | "event_upcoming"
  | "favorite"
  | "fire_check"
  | "flag"
  | "groups"
  | "home"
  | "local_bar"
  | "nutrition"
  | "person"
  | "person_add"
  | "photo_camera"
  | "redeem"
  | "reminder"
  | "restaurant"
  | "settings"
  | "sentiment_dissatisfied"
  | "sentiment_neutral"
  | "sentiment_satisfied"
  | "emoji_events"
  | "timer"
  | "scale"
  | "block"
  | "star"
  | "swap_horiz";

const glyphs: Readonly<Record<MaterialSymbolName, string>> = {
  add: "\u{E145}",
  arrow_back: "\u{E5C4}",
  check_circle: "\u{E86C}",
  arrow_forward: "\u{E5C8}",
  bolt: "\u{EA0B}",
  call: "\u{F0D4}",
  chart_data: "\u{E473}",
  chat: "\u{E0C9}",
  delete: "\u{E872}",
  e911_emergency: "\u{F119}",
  edit: "\u{E3C9}",
  edit_note: "\u{E745}",
  emergency: "\u{E1EB}",
  event_upcoming: "\u{F238}",
  favorite: "\u{E87E}",
  fire_check: "\u{FFFA8}",
  flag: "\u{EA1A}",
  groups: "\u{F233}",
  home: "\u{E88A}",
  local_bar: "\u{E540}",
  nutrition: "\u{E110}",
  person: "\u{E7FD}",
  person_add: "\u{EA4D}",
  photo_camera: "\u{E412}",
  redeem: "\u{E8F6}",
  reminder: "\u{E6C6}",
  restaurant: "\u{E56C}",
  settings: "\u{E8B8}",
  sentiment_dissatisfied: "\u{E811}",
  sentiment_neutral: "\u{E812}",
  sentiment_satisfied: "\u{E813}",
  emoji_events: "\u{EA23}",
  timer: "\u{E425}",
  scale: "\u{E8B6}",
  block: "\u{E14B}",
  star: "\u{E838}",
  swap_horiz: "\u{E8D4}",
};

type MaterialSymbolProps = {
  color?: string;
  filled?: boolean;
  name: MaterialSymbolName;
  size?: number;
  style?: StyleProp<TextStyle>;
};

export function MaterialSymbol({
  color = "#000000",
  filled = false,
  name,
  size = 24,
  style,
}: MaterialSymbolProps) {
  return (
    <Text
      accessible={false}
      accessibilityElementsHidden
      allowFontScaling={false}
      aria-hidden
      importantForAccessibility="no"
      style={[
        filled && name === "favorite" ? styles.filledHeart : styles.symbol,
        { color, fontSize: size, lineHeight: size },
        style,
      ]}
    >
      {filled && name === "favorite" ? "\u2665" : glyphs[name]}
    </Text>
  );
}

const styles = StyleSheet.create({
  symbol: {
    fontFamily: "MaterialSymbolsOutlined",
    includeFontPadding: false,
    textAlign: "center",
  },
  filledHeart: {
    fontWeight: "800",
    includeFontPadding: false,
    textAlign: "center",
  },
});
