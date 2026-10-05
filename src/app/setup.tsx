import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BackgroundOrbs } from '@/components/BackgroundOrbs';
import { GlassCard } from '@/components/GlassCard';
import { GlassButton } from '@/components/GlassButton';
import { GlassInput } from '@/components/GlassInput';
import {
  TimetableService,
  BranchOption,
  DivisionOption,
  SubdivisionOption,
} from '@/services/timetable-service';
import {
  registerUser,
  loginUser,
  getCurrentUser,
  UserAccount,
} from '@/storage/preferences-storage';
import { GlassColors } from '@/theme/glass-theme';
import { syncWidgets } from '@/widgets/widget-sync';

export default function SetupAndAuthScreen() {
  const router = useRouter();

  // Mode: 'signin' | 'register'
  const [mode, setMode] = useState<'signin' | 'register'>('register');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Setup options for Register
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [divisions, setDivisions] = useState<DivisionOption[]>([]);
  const [subdivisions, setSubdivisions] = useState<SubdivisionOption[]>([]);

  const [selectedBranch, setSelectedBranch] = useState<BranchOption | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<DivisionOption | null>(null);
  const [selectedSubdivision, setSelectedSubdivision] = useState<SubdivisionOption | null>(null);

  // Initialize options
  useEffect(() => {
    const list = TimetableService.getBranches();
    setBranches(list);

    (async () => {
      const active = await getCurrentUser();
      if (active) {
        setUsername(active.username || '');
        const matchedBranch = list.find((b) => b.id === active.branchId || b.code === active.branchCode);
        if (matchedBranch) {
          setSelectedBranch(matchedBranch);
        } else if (list.length > 0) {
          setSelectedBranch(list[0]);
        }
      } else if (list.length > 0) {
        const defaultBranch = list.find((b) => b.code === 'IT') || list[0];
        setSelectedBranch(defaultBranch);
      }
    })();
  }, []);

  // Update divisions when branch changes
  useEffect(() => {
    if (selectedBranch) {
      const divList = TimetableService.getDivisionsForBranch(selectedBranch.id);
      setDivisions(divList);
      if (divList.length > 0) {
        setSelectedDivision(divList[0]);
      } else {
        setSelectedDivision(null);
      }
    }
  }, [selectedBranch?.id]);

  // Update subdivisions when division changes
  useEffect(() => {
    if (selectedBranch && selectedDivision) {
      const subList = TimetableService.getSubdivisions(selectedBranch.id, selectedDivision.id);
      setSubdivisions(subList);
      if (subList.length > 0) {
        setSelectedSubdivision(subList[0]);
      } else {
        setSelectedSubdivision(null);
      }
    }
  }, [selectedBranch?.id, selectedDivision?.id]);

  const handleRegister = async () => {
    setErrorMessage('');
    if (!username.trim()) {
      setErrorMessage('Please enter your username');
      return;
    }
    if (!password || password.length < 3) {
      setErrorMessage('Password must be at least 3 characters');
      return;
    }
    if (!selectedBranch || !selectedDivision || !selectedSubdivision) {
      setErrorMessage('Please select your branch, division, and batch');
      return;
    }

    setLoading(true);
    const result = await registerUser({
      username: username.trim(),
      password,
      branchId: selectedBranch.id,
      branchCode: selectedBranch.code,
      branchLabel: selectedBranch.name,
      divisionId: selectedDivision.id,
      divisionLabel: selectedDivision.name,
      subdivisionId: selectedSubdivision.id,
      subdivisionLabel: selectedSubdivision.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setLoading(false);
    if (!result.success) {
      setErrorMessage(result.error || 'Registration failed');
      return;
    }

    // Sync widgets with new user info!
    syncWidgets();

    // Go directly to timetable!
    router.replace('/timetable');
  };

  const handleSignIn = async () => {
    setErrorMessage('');
    if (!username.trim()) {
      setErrorMessage('Please enter your username');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    setLoading(true);
    const result = await loginUser(username.trim(), password);
    setLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Login failed');
      return;
    }

    // Sync widgets with user info!
    syncWidgets();

    // Go directly to timetable!
    router.replace('/timetable');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <BackgroundOrbs />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.innerContainer}>


            {/* ── SEGMENTED TAB SWITCH: REGISTER vs SIGN IN ─────────── */}
            <View style={styles.tabContainer}>
              <Pressable
                onPress={() => {
                  setMode('register');
                  setErrorMessage('');
                }}
                style={[styles.tabButton, mode === 'register' && styles.tabButtonActive]}
              >
                <Ionicons
                  name="person-add-outline"
                  size={16}
                  color={mode === 'register' ? GlassColors.cyan : GlassColors.textMuted}
                />
                <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>
                  REGISTER
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setMode('signin');
                  setErrorMessage('');
                }}
                style={[styles.tabButton, mode === 'signin' && styles.tabButtonActive]}
              >
                <Ionicons
                  name="log-in-outline"
                  size={16}
                  color={mode === 'signin' ? GlassColors.cyan : GlassColors.textMuted}
                />
                <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>
                  SIGN IN
                </Text>
              </Pressable>
            </View>

            {/* ── ERROR MESSAGE BANNER ──────────────────────────────── */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#FF5252" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* ── MODE: SIGN IN ─────────────────────────────────────── */}
            {mode === 'signin' ? (
              <GlassCard glow style={styles.card}>


                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>USERNAME</Text>
                  <GlassInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Enter your username"
                    iconName="person-outline"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>PASSWORD</Text>
                  <GlassInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    secureTextEntry
                    iconName="lock-closed-outline"
                    autoCapitalize="none"
                    onSubmitEditing={handleSignIn}
                  />
                </View>

                <View style={{ marginTop: 24 }}>
                  {loading ? (
                    <ActivityIndicator color={GlassColors.cyan} size="large" />
                  ) : (
                    <GlassButton
                      title="SIGN IN & VIEW TIMETABLE"
                      onPress={handleSignIn}
                      iconName="arrow-forward"
                    />
                  )}
                </View>


              </GlassCard>
            ) : (
              /* ── MODE: REGISTER (ALL-IN-ONE SINGLE PAGE) ─────────── */
              <GlassCard glow style={styles.card}>


                {/* 1. Account Credentials */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>1. USERNAME</Text>
                  <GlassInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="xyz"
                    iconName="person-outline"
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>2. PASSWORD</Text>
                  <GlassInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Choose a password"
                    secureTextEntry
                    iconName="lock-closed-outline"
                    autoCapitalize="none"
                  />
                </View>

                {/* 2. Select Branch (Responsive Grid - Never overflows) */}
                <View style={styles.fieldGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.fieldLabel}>3. SELECT BRANCH</Text>
                    {selectedBranch && (
                      <Text style={styles.selectedInlineText}>{selectedBranch.name}</Text>
                    )}
                  </View>

                  <View style={styles.branchGrid}>
                    {branches.map((b) => {
                      const isSelected = selectedBranch?.id === b.id;
                      return (
                        <Pressable
                          key={b.id}
                          onPress={() => setSelectedBranch(b)}
                          style={[styles.branchCard, isSelected && styles.branchCardActive]}
                        >
                          <Text style={styles.branchEmoji}>{b.emoji}</Text>
                          <Text style={[styles.branchCode, isSelected && styles.branchCodeActive]}>
                            {b.code}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={[styles.branchName, isSelected && styles.branchNameActive]}
                          >
                            {b.name}
                          </Text>
                          {isSelected && (
                            <View style={styles.branchCheckDot}>
                              <Ionicons name="checkmark" size={10} color="#000" />
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* 3. Select Division */}
                <View style={styles.fieldGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.fieldLabel}>4. SELECT DIVISION</Text>
                    {selectedDivision && (
                      <Text style={styles.selectedInlineText}>{selectedDivision.name}</Text>
                    )}
                  </View>

                  <View style={styles.chipsRow}>
                    {divisions.map((d) => {
                      const isSelected = selectedDivision?.id === d.id;
                      return (
                        <Pressable
                          key={d.id}
                          onPress={() => setSelectedDivision(d)}
                          style={[styles.chipPill, isSelected && styles.chipPillActive]}
                        >
                          <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                            {d.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* 4. Select Subdivision (Batch) */}
                <View style={styles.fieldGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.fieldLabel}>5. SELECT PRACTICAL BATCH</Text>
                    {selectedSubdivision && (
                      <Text style={styles.selectedInlineText}>Batch {selectedSubdivision.name}</Text>
                    )}
                  </View>

                  <View style={styles.chipsRow}>
                    {subdivisions.map((s) => {
                      const isSelected = selectedSubdivision?.id === s.id;
                      return (
                        <Pressable
                          key={s.id}
                          onPress={() => setSelectedSubdivision(s)}
                          style={[styles.chipPill, isSelected && styles.chipPillActive]}
                        >
                          <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                            Batch {s.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>



                {/* Submit Button */}
                <View style={{ marginTop: 20 }}>
                  {loading ? (
                    <ActivityIndicator color={GlassColors.cyan} size="large" />
                  ) : (
                    <GlassButton
                      title="SAVE & VIEW TIMETABLE"
                      onPress={handleRegister}
                      iconName="sparkles-outline"
                    />
                  )}
                </View>


              </GlassCard>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    width: '100%',
    backgroundColor: GlassColors.bgDark,
  },
  keyboardAvoid: {
    flex: 1,
    width: '100%',
  },
  scroll: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 36 : 20,
    paddingBottom: 50,
    alignItems: 'center',
    width: '100%',
  },
  innerContainer: {
    width: '100%',
    maxWidth: 480,
  },
  brandingSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderWidth: 2,
    borderColor: GlassColors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 0 20px rgba(0, 229, 255, 0.4)',
      } as any,
    }),
  },
  logoEmoji: {
    fontSize: 28,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: GlassColors.textPrimary,
    letterSpacing: 2.5,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: GlassColors.cyan,
    letterSpacing: 3,
    marginTop: 3,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.4)',
    ...Platform.select({
      web: {
        boxShadow: '0 0 12px rgba(0, 229, 255, 0.3)',
      } as any,
    }),
  },
  tabText: {
    fontSize: 12,
    fontWeight: '800',
    color: GlassColors.textMuted,
    letterSpacing: 1,
  },
  tabTextActive: {
    color: GlassColors.cyan,
    fontWeight: '900',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.4)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#FF8A80',
    fontWeight: '600',
  },
  card: {
    width: '100%',
    padding: 20,
  },
  formHeader: {
    fontSize: 20,
    fontWeight: '900',
    color: GlassColors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  formSubHeader: {
    fontSize: 12,
    fontWeight: '500',
    color: GlassColors.textMuted,
    lineHeight: 18,
    marginBottom: 18,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: GlassColors.cyan,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  selectedInlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: GlassColors.textPrimary,
  },
  branchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  branchCard: {
    width: '31%',
    flexGrow: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    position: 'relative',
    ...Platform.select({
      web: { cursor: 'pointer' } as any,
    }),
  },
  branchCardActive: {
    borderColor: GlassColors.cyan,
    backgroundColor: 'rgba(0, 229, 255, 0.14)',
    ...Platform.select({
      web: {
        boxShadow: '0 0 16px rgba(0, 229, 255, 0.45)',
      } as any,
    }),
  },
  branchEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  branchCode: {
    fontSize: 14,
    fontWeight: '900',
    color: GlassColors.textMuted,
    letterSpacing: 1,
  },
  branchCodeActive: {
    color: GlassColors.cyan,
  },
  branchName: {
    fontSize: 9,
    fontWeight: '600',
    color: GlassColors.textDim,
    marginTop: 2,
    textAlign: 'center',
  },
  branchNameActive: {
    color: GlassColors.textPrimary,
  },
  branchCheckDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: GlassColors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    ...Platform.select({
      web: { cursor: 'pointer' } as any,
    }),
  },
  chipPillActive: {
    borderColor: GlassColors.cyan,
    backgroundColor: 'rgba(0, 229, 255, 0.16)',
    ...Platform.select({
      web: {
        boxShadow: '0 0 12px rgba(0, 229, 255, 0.4)',
      } as any,
    }),
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: GlassColors.textMuted,
  },
  chipTextActive: {
    color: GlassColors.cyan,
    fontWeight: '900',
  },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 229, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
    marginBottom: 4,
  },
  summaryBoxText: {
    fontSize: 12,
    fontWeight: '700',
    color: GlassColors.textSecondary,
    flex: 1,
  },
  switchModeLink: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  switchModeText: {
    fontSize: 13,
    color: GlassColors.textMuted,
  },
});
