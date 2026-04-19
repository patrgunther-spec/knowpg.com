import { View, Text, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { useApp } from '../_layout';

export default function FriendsTab() {
  const { friendCode } = useApp();

  function shareCode() {
    Share.share({ message: `Add me on Pop In! My code is ${friendCode}` });
  }

  return (
    <View style={s.page}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Friends</Text>
      </View>

      {/* Your code */}
      <View style={s.codeCard}>
        <Text style={s.codeLabel}>YOUR FRIEND CODE</Text>
        <Text style={s.code}>{friendCode}</Text>
        <TouchableOpacity style={s.shareBtn} onPress={shareCode}>
          <Text style={s.shareBtnText}>📤  Share Code</Text>
        </TouchableOpacity>
      </View>

      {/* Coming soon */}
      <View style={s.info}>
        <Text style={s.infoTitle}>Coming Soon</Text>
        <Text style={s.infoText}>
          Right now Pop In works on your phone as a demo.{'\n\n'}
          When we add the online backend, you'll be able to:{'\n\n'}
          • Add friends with their 6-letter code{'\n'}
          • See their pops in your feed{'\n'}
          • Get notified when they pop in{'\n'}
          • Chat with them in real time{'\n\n'}
          Share your code with friends so they're ready when we go live! 🚀
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  page:        { flex: 1, backgroundColor: '#f5f5f5' },
  header:      { padding: 16, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  codeCard:    { margin: 16, backgroundColor: '#007AFF', borderRadius: 20, padding: 28, alignItems: 'center' },
  codeLabel:   { color: 'rgba(255,255,255,0.7)', fontSize: 12, letterSpacing: 2, marginBottom: 10 },
  code:        { color: '#fff', fontSize: 44, fontWeight: 'bold', letterSpacing: 8, marginBottom: 20 },
  shareBtn:    { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  shareBtnText:{ color: '#fff', fontSize: 16, fontWeight: '600' },
  info:        { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 24 },
  infoTitle:   { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  infoText:    { fontSize: 15, color: '#555', lineHeight: 24 },
});
