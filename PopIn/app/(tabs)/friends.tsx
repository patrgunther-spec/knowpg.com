import { View, Text, TouchableOpacity, StyleSheet, Share, Platform } from 'react-native';
import { useApp } from '../_layout';

const FONT = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const GREEN = '#00ff41';

export default function FriendsTab() {
  const { friendCode } = useApp();

  function shareCode() {
    Share.share({ message: `pop in. my code: ${friendCode}` });
  }

  return (
    <View style={s.page}>
      <View style={s.header}>
        <Text style={s.headerText}>{'> FRIENDS'}</Text>
      </View>

      <View style={s.codeCard}>
        <Text style={s.codeLabel}>{'> YOUR FRIEND CODE'}</Text>
        <Text style={s.code}>{friendCode}</Text>
        <TouchableOpacity style={s.shareBtn} onPress={shareCode}>
          <Text style={s.shareBtnText}>{'> SHARE CODE'}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.info}>
        <Text style={s.infoText}>
          {'> share your code'}{'\n'}
          {'> they pop in too'}{'\n'}
          {'> see each other on the map'}
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
  codeCard: {
    margin: 16, backgroundColor: '#000', borderWidth: 1, borderColor: GREEN,
    padding: 28, alignItems: 'center',
  },
  codeLabel: { fontFamily: FONT, color: '#006620', fontSize: 11, letterSpacing: 2, marginBottom: 12 },
  code: { fontFamily: FONT, color: GREEN, fontSize: 42, fontWeight: 'bold', letterSpacing: 8, marginBottom: 20 },
  shareBtn: { borderWidth: 1, borderColor: GREEN, paddingHorizontal: 24, paddingVertical: 12 },
  shareBtnText: { fontFamily: FONT, color: GREEN, fontSize: 14, fontWeight: '600' },
  info: {
    margin: 16, backgroundColor: '#000', borderWidth: 1, borderColor: '#003300', padding: 24,
  },
  infoTitle: { fontFamily: FONT, color: GREEN, fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  infoText: { fontFamily: FONT, color: '#006620', fontSize: 13, lineHeight: 22 },
});
