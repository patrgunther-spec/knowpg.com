import { View, Text, StyleSheet, Platform } from 'react-native';
import { useApp } from '../_layout';

const FONT = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const GREEN = '#00ff41';

export default function InboxTab() {
  const { friendCode } = useApp();

  return (
    <View style={s.page}>
      <View style={s.header}>
        <Text style={s.headerText}>{'> INBOX'}</Text>
      </View>

      <View style={s.empty}>
        <Text style={s.emptyBox}>{'[  ]'}</Text>
        <Text style={s.emptyTitle}>{'> NO TRANSMISSIONS'}</Text>
        <Text style={s.emptyText}>
          {'> Add friends to start chatting'}{'\n'}
          {'> Share your code: '}{friendCode}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: '#0a0a0a', borderBottomWidth: 1, borderBottomColor: '#003300',
  },
  headerText: { fontFamily: FONT, color: GREEN, fontSize: 22, fontWeight: 'bold' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyBox: { fontFamily: FONT, color: '#003300', fontSize: 48, marginBottom: 20 },
  emptyTitle: { fontFamily: FONT, color: GREEN, fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  emptyText: { fontFamily: FONT, color: '#006620', fontSize: 13, textAlign: 'center', lineHeight: 22 },
});
