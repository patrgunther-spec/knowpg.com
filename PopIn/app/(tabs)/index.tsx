import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  Modal, StyleSheet, Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useApp } from '../_layout';

const FONT = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const GREEN = '#00ff41';

export default function PopInsTab() {
  const { userName, userStatus, setUserStatus, userLocation } = useApp();
  const [showPopIn, setShowPopIn] = useState(false);
  const [statusInput, setStatusInput] = useState('');
  const mapRef = useRef<MapView>(null);

  function submitPopIn() {
    if (!statusInput.trim()) return;
    setUserStatus(statusInput.trim());
    setStatusInput('');
    setShowPopIn(false);
  }

  return (
    <View style={s.page}>
      <View style={s.header}>
        <Text style={s.headerText}>{'> '}{userName.toUpperCase()}</Text>
        {userStatus ? (
          <Text style={s.headerStatus} numberOfLines={1}>{'> '}{userStatus}</Text>
        ) : (
          <Text style={s.headerOffline}>{'> NO STATUS SET'}</Text>
        )}
      </View>

      {userLocation ? (
        <MapView
          ref={mapRef}
          style={s.map}
          mapType="mutedStandard"
          initialRegion={{
            latitude: userLocation.lat,
            longitude: userLocation.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={false}
        >
          <Marker coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }}>
            <View style={s.marker}>
              <View style={s.markerDot}>
                <Text style={s.markerLetter}>{userName[0].toUpperCase()}</Text>
              </View>
              {userStatus ? (
                <View style={s.markerTag}>
                  <Text style={s.markerTagText} numberOfLines={2}>{userStatus}</Text>
                </View>
              ) : null}
            </View>
          </Marker>
        </MapView>
      ) : (
        <View style={s.mapLoading}>
          <Text style={s.mapLoadingText}>{'> ACQUIRING SIGNAL...'}</Text>
        </View>
      )}

      <View style={s.bottom}>
        {userStatus ? (
          <View>
            <Text style={s.activeLabel}>{'> BROADCASTING:'}</Text>
            <Text style={s.activeText}>{userStatus}</Text>
            <View style={s.bottomBtns}>
              <TouchableOpacity style={s.popBtn} onPress={() => { setStatusInput(userStatus); setShowPopIn(true); }}>
                <Text style={s.popBtnText}>{'> UPDATE'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.endBtn} onPress={() => setUserStatus('')}>
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
            placeholderTextColor="#006620"
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
  headerText: { fontFamily: FONT, color: GREEN, fontSize: 18, fontWeight: 'bold' },
  headerStatus: { fontFamily: FONT, color: GREEN, fontSize: 12, marginTop: 4, opacity: 0.7 },
  headerOffline: { fontFamily: FONT, color: '#006620', fontSize: 12, marginTop: 4 },
  map: { flex: 1 },
  mapLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  mapLoadingText: { fontFamily: FONT, color: GREEN, fontSize: 16 },
  marker: { alignItems: 'center' },
  markerDot: {
    width: 36, height: 36,
    backgroundColor: '#000', borderWidth: 1, borderColor: GREEN,
    justifyContent: 'center', alignItems: 'center',
  },
  markerLetter: { fontFamily: FONT, color: GREEN, fontSize: 18, fontWeight: 'bold' },
  markerTag: {
    marginTop: 4, backgroundColor: '#000', borderWidth: 1, borderColor: GREEN,
    paddingHorizontal: 8, paddingVertical: 4, maxWidth: 160,
  },
  markerTagText: { fontFamily: FONT, color: GREEN, fontSize: 10 },
  bottom: {
    padding: 16, paddingBottom: 34, backgroundColor: '#0a0a0a',
    borderTopWidth: 1, borderTopColor: '#003300',
  },
  activeLabel: { fontFamily: FONT, color: '#006620', fontSize: 11, marginBottom: 4 },
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
  modalCancelText: { fontFamily: FONT, color: '#006620', fontSize: 16 },
});
