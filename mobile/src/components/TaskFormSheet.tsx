import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C, shadow } from '@/lib/theme';

export interface TaskFormData {
  title:       string;
  description: string;
  deadline:    string | null;
  assignedTo:  string[];
}

interface User { _id: string; name: string; email: string; }

interface Props {
  visible:          boolean;
  onClose:          () => void;
  onSubmit:         (data: TaskFormData) => Promise<void>;
  users:            User[];
  usersLoading:     boolean;
  submitting:       boolean;
  mode:             'create' | 'edit';
  initialTitle?:    string;
  initialDesc?:     string;
  initialDeadline?: string | null;
  initialUsers?:    string[];
}

function isoToDate(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function makeChipDates() {
  const today    = new Date(); today.setHours(12, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
  return [
    { label: 'Today',     d: today    },
    { label: 'Tomorrow',  d: tomorrow },
    { label: 'Next Week', d: nextWeek },
  ];
}

export const TaskFormSheet = React.memo(function TaskFormSheet({
  visible, onClose, onSubmit, users, usersLoading, submitting,
  mode,
  initialTitle = '', initialDesc = '', initialDeadline = null, initialUsers = [],
}: Props) {
  const [step,     setStep]     = useState<'form' | 'members'>('form');
  const [title,    setTitle]    = useState('');
  const [desc,     setDesc]     = useState('');
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    if (!visible) return;
    setStep('form');
    setTitle(initialTitle);
    setDesc(initialDesc);
    setDeadline(isoToDate(initialDeadline));
    setSelected(initialUsers);
    setSearch('');
  }, [visible]);

  const chips = makeChipDates();

  const isChipActive = (d: Date) =>
    !!deadline && deadline.toDateString() === d.toDateString();

  const toggleChip = (d: Date) =>
    setDeadline((prev) => prev?.toDateString() === d.toDateString() ? null : new Date(d));

  const filteredUsers = search.trim()
    ? users.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const toggleUser = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const selectedNames = users
    .filter((u) => selected.includes(u._id))
    .map((u) => u.name)
    .join(', ');

  const canSubmit = title.trim().length > 0 && selected.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    await onSubmit({
      title:       title.trim(),
      description: desc,
      deadline:    deadline ? deadline.toISOString() : null,
      assignedTo:  selected,
    });
  };

  const goBackToForm = () => { setSearch(''); setStep('form'); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {step === 'form' ? (
            <>
              {/* ── Header ─────────────────────────────────────────── */}
              <View style={styles.header}>
                <View>
                  <Text style={styles.sheetTitle}>
                    {mode === 'create' ? 'New Task.' : 'Edit Task.'}
                  </Text>
                  <Text style={styles.sheetSub}>
                    {mode === 'create' ? 'ASSIGN A DELIVERABLE' : 'UPDATE DELIVERABLE'}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Feather name="x" size={18} color={C.TEXT2} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.formContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* Title */}
                <View style={styles.field}>
                  <Text style={styles.label}>TASK TITLE *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Update landing page copy"
                    placeholderTextColor={C.TEXT3}
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>

                {/* Description */}
                <View style={styles.field}>
                  <Text style={styles.label}>DESCRIPTION</Text>
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    placeholder="Add any context or notes..."
                    placeholderTextColor={C.TEXT3}
                    value={desc}
                    onChangeText={setDesc}
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                {/* Deadline */}
                <View style={styles.field}>
                  <Text style={styles.label}>DEADLINE</Text>
                  <View style={styles.chips}>
                    {chips.map(({ label, d }) => (
                      <TouchableOpacity
                        key={label}
                        style={[styles.chip, isChipActive(d) && styles.chipActive]}
                        onPress={() => toggleChip(d)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.chipText, isChipActive(d) && styles.chipTextActive]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {deadline && (
                    <View style={styles.dateRow}>
                      <Feather name="calendar" size={13} color={C.PRIMARY} />
                      <Text style={styles.dateValue}>{fmtDate(deadline)}</Text>
                      <TouchableOpacity
                        onPress={() => setDeadline(null)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather name="x" size={13} color={C.TEXT3} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Assign to */}
                <View style={styles.field}>
                  <Text style={styles.label}>ASSIGN TO *</Text>
                  <TouchableOpacity
                    style={styles.assignBtn}
                    onPress={() => setStep('members')}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name="users"
                      size={15}
                      color={selected.length > 0 ? C.PRIMARY : C.TEXT3}
                    />
                    <Text
                      style={[
                        styles.assignBtnText,
                        { color: selected.length > 0 ? C.TEXT : C.TEXT3 },
                      ]}
                      numberOfLines={1}
                    >
                      {selected.length > 0 ? selectedNames : 'Select team members'}
                    </Text>
                    {selected.length > 0 && (
                      <View style={styles.selBadge}>
                        <Text style={styles.selBadgeText}>{selected.length}</Text>
                      </View>
                    )}
                    <Feather name="chevron-right" size={15} color={C.TEXT3} />
                  </TouchableOpacity>
                </View>
              </ScrollView>

              {/* ── Actions ────────────────────────────────────────── */}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, (!canSubmit || submitting) && { opacity: 0.5 }]}
                  onPress={handleSubmit}
                  disabled={!canSubmit || submitting}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.submitText}>
                        {mode === 'create' ? 'Create Task' : 'Save Changes'}
                      </Text>
                  }
                </TouchableOpacity>
              </View>
            </>
          ) : (
            /* ── Member picker step ───────────────────────────────── */
            <>
              <View style={styles.memberHeader}>
                <TouchableOpacity style={styles.memberBack} onPress={goBackToForm}>
                  <Feather name="arrow-left" size={20} color={C.PRIMARY} />
                  <Text style={styles.memberBackText}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.memberTitle}>Select Members</Text>
                <View style={{ width: 72 }} />
              </View>

              {/* Search */}
              <View style={styles.searchWrap}>
                <Feather name="search" size={15} color={C.TEXT3} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name or email..."
                  placeholderTextColor={C.TEXT3}
                  value={search}
                  onChangeText={setSearch}
                  autoFocus
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Feather name="x" size={14} color={C.TEXT3} />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                {usersLoading ? (
                  <ActivityIndicator color={C.PRIMARY} style={{ marginVertical: 32 }} />
                ) : filteredUsers.length === 0 ? (
                  <Text style={styles.noResults}>No members found.</Text>
                ) : (
                  filteredUsers.map((u) => {
                    const isSel = selected.includes(u._id);
                    return (
                      <TouchableOpacity
                        key={u._id}
                        style={[styles.memberRow, isSel && styles.memberRowSel]}
                        onPress={() => toggleUser(u._id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.memberInfo}>
                          <Text style={styles.memberName}>{u.name}</Text>
                          <Text style={styles.memberEmail}>{u.email}</Text>
                        </View>
                        <View style={[styles.checkbox, isSel && styles.checkboxSel]}>
                          {isSel && <Feather name="check" size={12} color="#fff" />}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>

              {/* Sticky done CTA */}
              <TouchableOpacity style={styles.doneBtn} onPress={goBackToForm}>
                <Text style={styles.doneText}>
                  Done — {selected.length} selected
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.SURFACE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: C.BORDER,
    alignSelf: 'center',
    marginBottom: 20,
  },

  /* Form */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: C.TEXT, letterSpacing: -0.5 },
  sheetSub:   { fontSize: 11, fontWeight: '700', color: C.TEXT3, letterSpacing: 1, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.SURFACE2,
    alignItems: 'center', justifyContent: 'center',
  },

  formContent: { gap: 16, paddingBottom: 8 },
  field:       { gap: 8 },

  label: {
    fontSize: 11, fontWeight: '700', color: C.TEXT3,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  input: {
    backgroundColor: C.BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.BORDER,
    color: C.TEXT,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  textarea: { height: 88, textAlignVertical: 'top' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.SURFACE2,
    borderWidth: 1, borderColor: C.BORDER,
  },
  chipActive:     { backgroundColor: C.PRIMARY, borderColor: C.PRIMARY },
  chipText:       { fontSize: 13, fontWeight: '600', color: C.TEXT2 },
  chipTextActive: { color: '#fff' },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dateValue: { flex: 1, fontSize: 13, color: C.PRIMARY, fontWeight: '600' },

  assignBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.BG,
    borderRadius: 14, borderWidth: 1, borderColor: C.BORDER,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  assignBtnText: { flex: 1, fontSize: 15 },
  selBadge: {
    backgroundColor: C.PRIMARY, borderRadius: 10,
    width: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  selBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  actions:    { flexDirection: 'row', gap: 10, paddingVertical: 16 },
  cancelBtn:  { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: C.SURFACE2, alignItems: 'center' },
  cancelText: { color: C.TEXT2, fontSize: 14, fontWeight: '600' },
  submitBtn:  { flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: C.PRIMARY, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  /* Members */
  memberHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 16,
  },
  memberBack:     { flexDirection: 'row', alignItems: 'center', gap: 4, width: 72 },
  memberBackText: { color: C.PRIMARY, fontSize: 15, fontWeight: '600' },
  memberTitle:    { flex: 1, fontSize: 17, fontWeight: '700', color: C.TEXT, textAlign: 'center' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.BG,
    borderRadius: 12, borderWidth: 1, borderColor: C.BORDER,
    paddingHorizontal: 12, marginBottom: 8,
  },
  searchInput: {
    flex: 1, paddingVertical: 11, paddingLeft: 8,
    fontSize: 14, color: C.TEXT,
  },

  noResults: {
    textAlign: 'center', color: C.TEXT3,
    fontSize: 14, marginVertical: 32,
  },

  memberRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: C.BORDER2,
  },
  memberRowSel: {
    backgroundColor: C.PRIMARY_L,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderBottomWidth: 0,
    marginVertical: 2,
  },
  memberInfo:  { flex: 1 },
  memberName:  { fontSize: 15, fontWeight: '600', color: C.TEXT },
  memberEmail: { fontSize: 12, color: C.TEXT3, marginTop: 2 },
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: C.BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxSel: { backgroundColor: C.PRIMARY, borderColor: C.PRIMARY },

  doneBtn: {
    backgroundColor: C.PRIMARY, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
    marginBottom: 24, marginTop: 8,
  },
  doneText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
