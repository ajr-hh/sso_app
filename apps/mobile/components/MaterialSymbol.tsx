import type { StyleProp, TextStyle } from "react-native";
import { StyleSheet, Text } from "react-native";

export type MaterialSymbolName =
  | "arrow_back"
  | "arrow_forward"
  | "bolt"
  | "call"
  | "chart_data"
  | "chat"
  | "delete"
  | "edit"
  | "edit_note"
  | "emergency"
  | "favorite"
  | "flag"
  | "groups"
  | "home"
  | "nutrition"
  | "person"
  | "redeem"
  | "sentiment_dissatisfied"
  | "sentiment_neutral"
  | "sentiment_satisfied";

const glyphs: Readonly<Record<MaterialSymbolName, string>> = {
  arrow_back: "\u{E5C4}",
  arrow_forward: "\u{E5C8}",
  bolt: "\u{EA0B}",
  call: "\u{F0D4}",
  chart_data: "\u{E473}",
  chat: "\u{E0C9}",
  delete: "\u{E872}",
  edit: "\u{E3C9}",
  edit_note: "\u{E745}",
  emergency: "\u{E1EB}",
  favorite: "\u{E87E}",
  flag: "\u{EA1A}",
  groups: "\u{F233}",
  home: "\u{E88A}",
  nutrition: "\u{E110}",
  person: "\u{E7FD}",
  redeem: "\u{E8F6}",
  sentiment_dissatisfied: "\u{E811}",
  sentiment_neutral: "\u{E812}",
  sentiment_satisfied: "\u{E813}",
};

type MaterialSymbolProps = {
  color?: string;
  name: MaterialSymbolName;
  size?: number;
  style?: StyleProp<TextStyle>;
};

export function MaterialSymbol({
  color = "#000000",
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
      style={[styles.symbol, { color, fontSize: size, lineHeight: size }, style]}
    >
      {glyphs[name]}
    </Text>
  );
}

const styles = StyleSheet.create({
  symbol: {
    fontFamily: "MaterialSymbolsOutlined",
    includeFontPadding: false,
    textAlign: "center",
  },
});
