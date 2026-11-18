// The text of a button that switches between labels ("Show details" / "Hide details").
// Every label is drawn, but only the active one is visible, so the button always keeps the width of
// its LONGEST label and the buttons next to it never jump around when you press it.
import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type Props = {
  labels: string[]; // every text this button can show
  active: number; // which one is showing now
  style?: StyleProp<TextStyle>;
};

export function SteadyLabel({ labels, active, style }: Props) {
  return (
    <View>
      {labels.map((label, index) => (
        <ThemedText
          key={index}
          type="smallBold"
          aria-hidden={index !== active}
          style={[styles.text, style, index !== active && styles.hidden]}>
          {label}
        </ThemedText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  text: { textAlign: 'center' },
  // Takes no height and cannot be seen, but still counts for the width.
  hidden: { height: 0, opacity: 0, overflow: 'hidden' },
});
