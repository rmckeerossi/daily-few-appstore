import { Text, type TextProps, type TextStyle } from 'react-native';

import { colors, type } from '@/theme/tokens';

type Props = TextProps & { color?: string };

function make(base: TextStyle, defaultColor: string) {
  return function StyledText({ style, color, ...rest }: Props) {
    return <Text {...rest} style={[base, { color: color ?? defaultColor }, style]} />;
  };
}

/** Mono uppercase section label ("eyebrow"). Sits 12–14 above its content. */
export const Eyebrow = make(type.label, colors.textLabel);
export const LabelSm = make(type.labelSm, colors.textLabel);

export const DisplayL = make(type.displayL, colors.textPrimary);
export const ScreenTitle = make(type.screenTitle, colors.textPrimary);
export const Greeting = make(type.greeting, colors.textPrimary);
export const DeckName = make(type.deckName, colors.textPrimary);
export const SheetTitle = make(type.sheetTitle, colors.textPrimary);

export const BodyLg = make(type.bodyLg, colors.textPrimary);
export const Body = make(type.body, colors.textPrimary);
export const BodyLight = make(type.bodyLight, colors.textSecondary);
export const BodySm = make(type.bodySm, colors.textSecondary);
export const Caption = make(type.caption, colors.textTertiary);
export const Data = make(type.data, colors.lilac);
