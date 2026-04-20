import { useState, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Image,
  Modal, StyleSheet, Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { useApp, Profile } from '../_layout';

const FONT = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const GREEN = '#00ff41';
const DIM = '#006620';

function UserMarker({ p, self }: { p: Profile; self?: boolean }) {
  return (
    <View style={s.marker}>
      {p.avatar ? (
        <Image source={{ uri: p.avatar }} style={[s.markerDot, self && s.markerSelf]} />
      ) : (
        <View style={[s.markerDot, self && s.markerSelf]}>
          <Text style={s.markerLetter}>{(p.name[0] || '?').toUpperCase()}</Text>
        </View>
      )}
      {p.status ? (
        <View style={s.markerTag}>
          <Text style={s.markerTagText} numberOfLines={2}>{p.status}</Text>
        </View>
      ) : null}
      <Text style={s.markerName} numberOfLines={1}>{p.name}</Text>
    </View>
  );
}

export default function PopInsTab() {
  const { me, friends, updateMe } = useApp();
  const router = useRouter();
  const [showPopIn, setShowPopIn] = useState(false);
  const [statusInput, setStatusInput] = useState('');
  const mapRef = useRef<MapView>(null);

  const initialRegion = useMemo(() => ({
    latitude: me.lat ?? 39.5,
    longitude: me.lng ?? -98.35,
    latitudeDelta: me.lat ? 0.05 : 50,
    longitudeDelta: me.lng ? 0.05 : 50,
  }), []);

  useEffect(() => {
    if (me.lat != null && me.lng != null && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: me.lat,
        longitude: me.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 600);
    }
  }, [me.lat, me.lng]);

  function submitPopIn() {
    const v = statusInput.trim();
    if (!v) return;
    updateMe({ status: v });
    setStatusInput('');
    setShowPopIn(false);
  }

  const friendsOnMap = friends.filter((f) => f.lat != null && f.lng != null);

  return (
    <View style={s.page}>
      <TouchableOpacity style={s.header} onPress={() => router.push('/profile')}>
        <View style={s.headerLeft}>
          {me.avatar ? (
            <Image source={{ uri: me.avatar }} style={s.headerAvatar} />
          ) : (
            <View style={s.headerAvatarBox}>
              <Text style={s.headerAvatarLetter}>{(me.name[0] || '?').toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.headerText}>{'> '}{me.name.toUpperCase()}</Text>
            {me.status ? (
              <Text style={s.headerStatus} numberOfLines={1}>{'> '}{me.status}</Text>
            ) : (
              <Text style={s.headerOffline}>{'> NO STATUS SET'}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>

      <View style={s.map}>
        <MapView
          ref={mapRef}
          style={s.map}
          mapType="mutedStandard"
          initialRegion={initialRegion}
          showsUserLocation={false}
        >
          {me.lat != null && me.lng != null && (
            <Marker coordinate={{ latitude: me.lat, longitude: me.lng }}>
              <UserMarker p={me} self />
            </Marker>
          )}
          {friendsOnMap.map((f) => (
            <Marker key={f.id} coordinate={{ latitude: f.lat!, longitude: f.lng! }}>
              <UserMarker p={f} />
            </Marker>
          ))}
        </MapView>
        {(me.lat == null || me.lng == null) && (
          <View style={s.mapOverlay} pointerEvents="none">
            <Text style={s.mapOverlayText}>{'> ACQUIRING SIGNAL...'}</Text>
          </View>
        )}
      </View>

      <View style={s.bottom}>
        {me.status ? (
          <View>
            <Text style={s.activeLabel}>{'> BROADCASTING:'}</Text>
            <Text style={s.activeText}>{me.status}</Text>
            <View style={s.bottomBtns}>
              <TouchableOpacity style={s.popBtn} onPress={() => { setStatusInput(me.status); setShowPopIn(true); }}>
                <Text style={s.popBtnText}>{'> UPDATE'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.endBtn} onPress={() => updateMe({ status: '' })}>
                <Text style={s.endBtnText}>{'> END'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={s.popBtnFull} onPress={() => setShowPopIn(true)}>
            <Text style={s.popBtnText}>{'> POP IN'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={showPopIn} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <Text style={s.modalTitle}>{'> WHAT ARE YOU UP TO?'}</Text>
          <TextInput
            style={s.modalInput}
            placeholder="Going for a run in Prospect Park..."
            placeholderTextColor={DIM}
            value={statusInput}
            onChangeText={setStatusInput}
            autoFocus
            multiline
          />
          <TouchableOpacity style={s.modalBtn} onPress={submitPopIn}>
            <Text style={s.modalBtnText}>{'> BROADCAST'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.modalCancel} onPress={() => setShowPopIn(false)}>
            <Text style={s.modalCancelText}>{'> CANCEL'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#000' },
  header: {
    paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#0a0a0a', borderBottomWidth: 1, borderBottomColor: '#003300',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: { width: 32, height: 32, borderWidth: 1, borderColor: GREEN },
  headerAvatarBox: {
    width: 32, height: 32, borderWidth: 1, borderColor: GREEN,
    backgroundColor: '#000', justifyContent: 'center', alignItems: 'center',
  },
  headerAvatarLetter: { fontFamily: FONT, color: GREEN, fontSize: 16, fontWeight: 'bold' },
  headerText: { fontFamily: FONT, color: GREEN, fontSize: 18, fontWeight: 'bold' },
  headerStatus: { fontFamily: FONT, color: GREEN, fontSize: 12, marginTop: 4, opacity: 0.7 },
  headerOffline: { fontFamily: FONT, color: DIM, fontSize: 12, marginTop: 4 },
  map: { flex: 1 },
  mapOverlay: {
    position: 'absolute', top: 12, alignSelf: 'center',
    backgroundColor: '#000', borderWidth: 1, borderColor: GREEN,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  mapOverlayText: { fontFamily: FONT, color: GREEN, fontSize: 11 },
  marker: { alignItems: 'center', maxWidth: 180 },
  markerDot: {
    width: 36, height: 36,
    backgroundColor: '#000', borderWidth: 1, borderColor: GREEN,
    justifyContent: 'center', alignItems: 'center',
  },
  markerSelf: { borderColor: '#fff', borderWidth: 2 },
  markerLetter: { fontFamily: FONT, color: GREEN, fontSize: 18, fontWeight: 'bold' },
  markerTag: {
    marginTop: 4, backgroundColor: '#000', borderWidth: 1, borderColor: GREEN,
    paddingHorizontal: 8, paddingVertical: 4, maxWidth: 160,
  },
  markerTagText: { fontFamily: FONT, color: GREEN, fontSize: 10 },
  markerName: {
    fontFamily: FONT, color: '#000', fontSize: 10, marginTop: 2, fontWeight: 'bold',
    backgroundColor: '#fff', paddingHorizontal: 4, paddingVertical: 1,
  },
  bottom: {
    padding: 16, paddingBottom: 34, backgroundColor: '#0a0a0a',
    borderTopWidth: 1, borderTopColor: '#003300',
  },
  activeLabel: { fontFamily: FONT, color: DIM, fontSize: 11, marginBottom: 4 },
  activeText: { fontFamily: FONT, color: GREEN, fontSize: 14, marginBottom: 12 },
  bottomBtns: { flexDirection: 'row', gap: 12 },
  popBtn: {
    flex: 1, borderWidth: 1, borderColor: GREEN,
    padding: 16, justifyContent: 'center', alignItems: 'center',
  },
  popBtnFull: {
    borderWidth: 1, borderColor: GREEN,
    padding: 18, justifyContent: 'center', alignItems: 'center',
  },
  popBtnText: { fontFamily: FONT, color: GREEN, fontSize: 18, fontWeight: 'bold' },
  endBtn: {
    flex: 1, borderWidth: 1, borderColor: '#ff3333',
    padding: 16, justifyContent: 'center', alignItems: 'center',
  },
  endBtnText: { fontFamily: FONT, color: '#ff3333', fontSize: 18, fontWeight: 'bold' },
  modal: { flex: 1, backgroundColor: '#0a0a0a', padding: 28, paddingTop: 60 },
  modalTitle: { fontFamily: FONT, color: GREEN, fontSize: 20, fontWeight: 'bold', marginBottom: 24 },
  modalInput: {
    fontFamily: FONT, color: GREEN, fontSize: 16,
    borderWidth: 1, borderColor: GREEN, backgroundColor: '#000',
    padding: 16, minHeight: 80, textAlignVertical: 'top', marginBottom: 20,
  },
  modalBtn: { borderWidth: 1, borderColor: GREEN, padding: 18, alignItems: 'center', marginBottom: 12 },
  modalBtnText: { fontFamily: FONT, color: GREEN, fontSize: 18, fontWeight: 'bold' },
  modalCancel: { padding: 18, alignItems: 'center' },
  modalCancelText: { fontFamily: FONT, color: DIM, fontSize: 16 },
});
