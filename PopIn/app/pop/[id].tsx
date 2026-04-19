import { View, Text, Platform } from 'react-native';

const FONT = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export default function PopDetail() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontFamily: FONT, color: '#00ff41' }}>{'> ROUTE MOVED'}</Text>
    </View>
  );
}
