import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Modal,
  StyleSheet, Platform, Alert,
} from 'react-native';
import { useApp, Plan } from '../_layout';

const FONT = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const GREEN = '#00ff41';
const DIM = '#006620';
const DARK = '#003300';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function BulletinTab() {
  const { userName, plans, addPlan, deletePlan } = useApp();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(toISO(today.getFullYear(), today.getMonth(), today.getDate()));

  const [showPost, setShowPost] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postTime, setPostTime] = useState('');
  const [postNote, setPostNote] = useState('');

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const plansByDate = useMemo(() => {
    const map: Record<string, Plan[]> = {};
    for (const p of plans) {
      (map[p.date] ??= []).push(p);
    }
    return map;
  }, [plans]);

  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedPlans = (plansByDate[selectedDate] ?? []).sort((a, b) => a.time.localeCompare(b.time));

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }

  function submitPost() {
    if (!postTitle.trim()) return Alert.alert('', 'title required');
    addPlan({
      title: postTitle.trim(),
      date: selectedDate,
      time: postTime.trim(),
      note: postNote.trim(),
    });
    setPostTitle(''); setPostTime(''); setPostNote('');
    setShowPost(false);
  }

  function confirmDelete(id: string) {
    Alert.alert('', 'delete plan?', [
      { text: 'cancel' },
      { text: 'delete', style: 'destructive', onPress: () => deletePlan(id) },
    ]);
  }

  const weeks: number[][] = [];
  let week: number[] = Array(firstDayOfWeek).fill(0);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length) { while (week.length < 7) week.push(0); weeks.push(week); }

  return (
    <View style={s.page}>
      <View style={s.header}>
        <Text style={s.headerText}>{'> BULLETIN'}</Text>
      </View>

      <ScrollView>
        {/* Month navigator */}
        <View style={s.monthBar}>
          <TouchableOpacity onPress={prevMonth} style={s.navBtn}>
            <Text style={s.navText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={s.monthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
          <TouchableOpacity onPress={nextMonth} style={s.navBtn}>
            <Text style={s.navText}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        {/* Day headers */}
        <View style={s.weekRow}>
          {DAYS.map((d, i) => (
            <Text key={i} style={s.dayHeader}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        {weeks.map((w, wi) => (
          <View key={wi} style={s.weekRow}>
            {w.map((d, di) => {
              if (!d) return <View key={di} style={s.dayCell} />;
              const iso = toISO(viewYear, viewMonth, d);
              const isToday = iso === todayISO;
              const isSelected = iso === selectedDate;
              const hasPlans = !!plansByDate[iso]?.length;
              return (
                <TouchableOpacity
                  key={di}
                  style={[s.dayCell, isSelected && s.dayCellSelected]}
                  onPress={() => setSelectedDate(iso)}
                >
                  <Text style={[s.dayNum, isToday && s.dayNumToday, isSelected && s.dayNumSelected]}>
                    {d}
                  </Text>
                  {hasPlans && <View style={s.dot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Selected day plans */}
        <View style={s.selectedBar}>
          <Text style={s.selectedLabel}>{'> '}{selectedDate}</Text>
          <TouchableOpacity style={s.postBtn} onPress={() => setShowPost(true)}>
            <Text style={s.postBtnText}>{'+ POST'}</Text>
          </TouchableOpacity>
        </View>

        {selectedPlans.length === 0 ? (
          <Text style={s.empty}>{'> no plans'}</Text>
        ) : (
          selectedPlans.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={s.plan}
              onLongPress={() => p.creator === userName && confirmDelete(p.id)}
            >
              <View style={s.planTop}>
                <Text style={s.planTime}>{p.time || '—'}</Text>
                <Text style={s.planCreator}>{p.creator}</Text>
              </View>
              <Text style={s.planTitle}>{p.title}</Text>
              {!!p.note && <Text style={s.planNote}>{p.note}</Text>}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Post modal */}
      <Modal visible={showPost} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <Text style={s.modalTitle}>{'> POST TO BULLETIN'}</Text>
          <Text style={s.modalSub}>{'> '}{selectedDate}</Text>

          <Text style={s.label}>{'> PLAN'}</Text>
          <TextInput
            style={s.modalInput}
            placeholder="concert at MSG, extra ticket..."
            placeholderTextColor={DIM}
            value={postTitle}
            onChangeText={setPostTitle}
            autoFocus
            autoCapitalize="none"
          />

          <Text style={s.label}>{'> TIME'}</Text>
          <TextInput
            style={s.modalInput}
            placeholder="7pm, 19:00..."
            placeholderTextColor={DIM}
            value={postTime}
            onChangeText={setPostTime}
            autoCapitalize="none"
          />

          <Text style={s.label}>{'> DETAILS'}</Text>
          <TextInput
            style={[s.modalInput, s.modalInputMulti]}
            placeholder="who, where, notes..."
            placeholderTextColor={DIM}
            value={postNote}
            onChangeText={setPostNote}
            multiline
          />

          <TouchableOpacity style={s.modalBtn} onPress={submitPost}>
            <Text style={s.modalBtnText}>{'> POST'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.modalCancel} onPress={() => setShowPost(false)}>
            <Text style={s.modalCancelText}>{'> CANCEL'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: '#0a0a0a', borderBottomWidth: 1, borderBottomColor: DARK,
  },
  headerText: { fontFamily: FONT, color: GREEN, fontSize: 22, fontWeight: 'bold' },

  monthBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: DARK,
  },
  navBtn: { padding: 8, borderWidth: 1, borderColor: GREEN, minWidth: 36, alignItems: 'center' },
  navText: { fontFamily: FONT, color: GREEN, fontSize: 18, fontWeight: 'bold' },
  monthLabel: { fontFamily: FONT, color: GREEN, fontSize: 18, fontWeight: 'bold', letterSpacing: 2 },

  weekRow: { flexDirection: 'row' },
  dayHeader: {
    flex: 1, fontFamily: FONT, color: DIM, fontSize: 11,
    textAlign: 'center', paddingVertical: 8, letterSpacing: 1,
  },
  dayCell: {
    flex: 1, aspectRatio: 1, justifyContent: 'center', alignItems: 'center',
    borderWidth: 0.5, borderColor: DARK,
  },
  dayCellSelected: { backgroundColor: '#001a00', borderColor: GREEN },
  dayNum: { fontFamily: FONT, color: GREEN, fontSize: 14 },
  dayNumToday: { fontWeight: 'bold', color: GREEN, textDecorationLine: 'underline' },
  dayNumSelected: { fontWeight: 'bold' },
  dot: { width: 4, height: 4, backgroundColor: GREEN, marginTop: 2 },

  selectedBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12,
  },
  selectedLabel: { fontFamily: FONT, color: GREEN, fontSize: 14, fontWeight: 'bold' },
  postBtn: { borderWidth: 1, borderColor: GREEN, paddingHorizontal: 12, paddingVertical: 6 },
  postBtnText: { fontFamily: FONT, color: GREEN, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },

  empty: { fontFamily: FONT, color: DIM, fontSize: 13, textAlign: 'center', padding: 24 },

  plan: {
    marginHorizontal: 16, marginBottom: 10, padding: 14,
    borderWidth: 1, borderColor: DARK, backgroundColor: '#000',
  },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  planTime: { fontFamily: FONT, color: GREEN, fontSize: 13, fontWeight: 'bold' },
  planCreator: { fontFamily: FONT, color: DIM, fontSize: 11 },
  planTitle: { fontFamily: FONT, color: GREEN, fontSize: 15, marginBottom: 4 },
  planNote: { fontFamily: FONT, color: DIM, fontSize: 12, lineHeight: 18 },

  modal: { flex: 1, backgroundColor: '#0a0a0a', padding: 24, paddingTop: 40 },
  modalTitle: { fontFamily: FONT, color: GREEN, fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  modalSub: { fontFamily: FONT, color: DIM, fontSize: 13, marginBottom: 20 },
  label: { fontFamily: FONT, color: DIM, fontSize: 11, marginBottom: 6, letterSpacing: 1 },
  modalInput: {
    fontFamily: FONT, color: GREEN, fontSize: 15,
    borderWidth: 1, borderColor: DARK, backgroundColor: '#000',
    padding: 12, marginBottom: 16,
  },
  modalInputMulti: { minHeight: 72, textAlignVertical: 'top' },
  modalBtn: { borderWidth: 1, borderColor: GREEN, padding: 16, alignItems: 'center', marginTop: 8 },
  modalBtnText: { fontFamily: FONT, color: GREEN, fontSize: 16, fontWeight: 'bold' },
  modalCancel: { padding: 16, alignItems: 'center' },
  modalCancelText: { fontFamily: FONT, color: DIM, fontSize: 14 },
});
