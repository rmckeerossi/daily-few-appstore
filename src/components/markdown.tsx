import { Text, View } from 'react-native';

import { colors, fonts, type } from '@/theme/tokens';

/** Inline **bold** only; everything else is plain text. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <Text key={i} style={{ fontFamily: fonts.sansMedium, color: colors.textPrimary }}>
            {p.slice(2, -2)}
          </Text>
        ) : (
          p
        ),
      )}
    </>
  );
}

type Section = { heading: string | null; blocks: string[] };

/** Splits into sections at each "## " heading. */
function sections(source: string): Section[] {
  const out: Section[] = [{ heading: null, blocks: [] }];
  for (const block of source.replace(/\r\n/g, '\n').split(/\n{2,}/)) {
    const lines = block.split('\n');
    if (lines[0].startsWith('## ')) {
      out.push({ heading: lines[0].slice(3).trim(), blocks: [] });
      const rest = lines.slice(1).join('\n').trim();
      if (rest) out[out.length - 1].blocks.push(rest);
    } else {
      out[out.length - 1].blocks.push(block);
    }
  }
  return out.filter((s) => s.heading || s.blocks.length);
}

function Block({ block, small }: { block: string; small: boolean }) {
  const lines = block.split('\n');
  const textStyle = small ? [type.bodySm, { color: colors.textTertiary }] : [type.bodyLg, { color: colors.textSecondary }];
  if (lines.every((l) => l.startsWith('- '))) {
    return (
      <View style={{ gap: 8 }}>
        {lines.map((l, j) => (
          <View key={j} style={{ flexDirection: 'row', gap: 10 }}>
            <Text style={textStyle}>•</Text>
            <Text style={[textStyle, { flex: 1 }]}>
              <Inline text={l.slice(2)} />
            </Text>
          </View>
        ))}
      </View>
    );
  }
  return (
    <Text style={textStyle}>
      <Inline text={lines.join(' ')} />
    </Text>
  );
}

/**
 * The small markdown the short reads use: "## " headings, "- " lists and
 * paragraphs. The "## Sources" section is shown smaller.
 */
export function Markdown({ source }: { source: string }) {
  return (
    <View style={{ gap: 16 }}>
      {sections(source).map((s, i) => {
        const small = !!s.heading && /^sources$/i.test(s.heading);
        return (
          <View key={i} style={{ gap: 12, marginTop: s.heading ? 8 : 0 }}>
            {s.heading ? (
              <Text
                accessibilityRole="header"
                style={
                  small
                    ? [type.label, { color: colors.textLabel }]
                    : { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: colors.textPrimary }
                }>
                {s.heading}
              </Text>
            ) : null}
            {s.blocks.map((b, j) => (
              <Block key={j} block={b} small={small} />
            ))}
          </View>
        );
      })}
    </View>
  );
}
