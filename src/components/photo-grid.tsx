import { Image } from 'expo-image';
import { Image as ImageIcon, X } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, type } from '@/theme/tokens';

export type PhotoSlot = { key: string; uri: string };

/** Three square slots: filled photos with a remove button, then "Add". */
export function PhotoGrid({ photos, max = 3, onAdd, onRemove }: {
  photos: PhotoSlot[];
  max?: number;
  onAdd: () => void;
  onRemove: (key: string) => void;
}) {
  return (
    <View style={styles.grid}>
      {photos.map((p) => (
        <View key={p.key} style={styles.slot}>
          <Image source={{ uri: p.uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={160} />
          <Pressable accessibilityRole="button" accessibilityLabel="Remove photo" hitSlop={8} onPress={() => onRemove(p.key)} style={styles.remove}>
            <X size={14} color={colors.paleCream} strokeWidth={2} />
          </Pressable>
        </View>
      ))}
      {photos.length < max ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Add photo" onPress={onAdd} style={[styles.slot, styles.add]}>
          <ImageIcon size={20} color={colors.textSecondary} strokeWidth={1.5} />
          <Text style={[type.labelSm, { color: colors.textSecondary }]}>Add</Text>
        </Pressable>
      ) : null}
      {Array.from({ length: Math.max(0, max - photos.length - 1) }, (_, i) => (
        <View key={`empty-${i}`} style={[styles.slot, styles.empty]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 10 },
  slot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
  },
  add: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderStyle: 'dashed',
    borderColor: colors.outlineBorder,
  },
  empty: { opacity: 0.5 },
  remove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(40,14,26,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
