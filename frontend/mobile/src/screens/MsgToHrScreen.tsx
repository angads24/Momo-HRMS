import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ActivityIndicator, Card, Divider, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  submitSpecialWorkingHoursRequest,
  getEmployeeExceptions,
} from '../api/attendanceApi';
import type { AttendanceExceptionItem } from '../api/attendanceApi';
import { getHrStaff, HrStaffMember } from '../api/employeeApi';
import { ScreenHeader } from '../components/ScreenHeader';
import { palette } from '../theme/theme';

function getTodayDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function MsgToHrScreen() {
  const navigation = useNavigation();
  const { user, employeeProfile } = useAuth();

  // Form state
  const [hrStaffList, setHrStaffList] = useState<HrStaffMember[]>([]);
  const [selectedHrEmail, setSelectedHrEmail] = useState('priya.patil@company.com');
  const [customHrEmail, setCustomHrEmail] = useState('');
  const [useCustomHrEmail, setUseCustomHrEmail] = useState(false);
  const [requestDate, setRequestDate] = useState(() => getTodayDateStr());
  const [additionalHours, setAdditionalHours] = useState('2');
  const [reason, setReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  // History state
  const [exceptionHistory, setExceptionHistory] = useState<AttendanceExceptionItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshingHistory, setRefreshingHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<AttendanceExceptionItem | null>(null);

  const employeeId = employeeProfile?.employeeCode || employeeProfile?.id || user?.id || '';
  const employeeName = employeeProfile
    ? `${employeeProfile.firstName} ${employeeProfile.lastName}`.trim()
    : user?.fullName || 'Employee';
  const employeeEmail = employeeProfile?.email || user?.email || '';

  // 1. Load HR staff list
  const loadHrStaff = useCallback(async () => {
    try {
      const staff = await getHrStaff();
      setHrStaffList(staff);
      if (staff.length > 0 && !selectedHrEmail) {
        setSelectedHrEmail(staff[0].email);
      }
    } catch {
      // Keep defaults
    }
  }, [selectedHrEmail]);

  // 2. Load Employee Exception History
  const loadExceptionHistory = useCallback(async () => {
    if (!employeeId) return;
    setLoadingHistory(true);
    try {
      const history = await getEmployeeExceptions(employeeId);
      const sorted = [...history].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setExceptionHistory(sorted);
    } catch {
      // Non-fatal
    } finally {
      setLoadingHistory(false);
      setRefreshingHistory(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadHrStaff();
    loadExceptionHistory();
  }, [loadHrStaff, loadExceptionHistory]);

  const handleRefreshHistory = () => {
    setRefreshingHistory(true);
    loadExceptionHistory();
  };

  const handleSubmitSpecialRequest = async () => {
    setRequestError(null);
    setRequestSuccess(null);

    const targetHrEmail = useCustomHrEmail
      ? customHrEmail.trim().toLowerCase()
      : selectedHrEmail.trim().toLowerCase();
    if (!targetHrEmail || !targetHrEmail.includes('@')) {
      setRequestError('Please select or provide a valid HR email address.');
      return;
    }

    if (!requestDate || !/^\d{4}-\d{2}-\d{2}$/.test(requestDate.trim())) {
      setRequestError('Please enter a valid date in YYYY-MM-DD format.');
      return;
    }

    const hours = parseFloat(additionalHours);
    if (isNaN(hours) || hours <= 0) {
      setRequestError('Additional hours must be a positive number greater than 0.');
      return;
    }

    if (hours > 12) {
      setRequestError('Additional hours cannot exceed 12 hours in a single request.');
      return;
    }

    if (!reason.trim() || reason.trim().length < 5) {
      setRequestError('Please explain your genuine situation/reason (at least 5 characters).');
      return;
    }

    setSubmittingRequest(true);
    try {
      await submitSpecialWorkingHoursRequest({
        employeeId,
        attendanceDate: requestDate.trim(),
        additionalHours: hours,
        reason: reason.trim(),
        hrEmail: targetHrEmail,
        metadata: {
          employeeName,
          employeeEmail,
          employeeId,
          dateStr: requestDate.trim(),
        },
      });

      setRequestSuccess(
        `Your request for +${hours}h on ${requestDate.trim()} has been sent to HR (${targetHrEmail}). You will receive a notification once HR reviews it.`,
      );
      setReason('');
      await loadExceptionHistory();
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        (err?.response?.status === 409
          ? 'A pending special working-hours request already exists for this date. Please check your Request History below or wait for HR to review it.'
          : err?.message || 'Failed to submit special working-hours request. Please try again.');
      setRequestError(msg);
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Msg to HR"
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshingHistory}
              onRefresh={handleRefreshHistory}
              colors={[palette.primary]}
            />
          }
        >
          {/* Header Banner */}
          <Card style={styles.formCard} mode="elevated">
            <Card.Content style={{ padding: 16 }}>
              <View style={styles.formHeaderRow}>
                <View style={styles.formHeaderIconWrap}>
                  <MaterialCommunityIcons name="clock-plus-outline" size={24} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formHeaderTitle}>Special Condition Working Hours</Text>
                  <Text style={styles.formHeaderSubtitle}>
                    Have a genuine situation requiring additional hours? Send a request to HR for approval.
                  </Text>
                </View>
              </View>

              <Divider style={{ marginVertical: 14 }} />

              {/* Success Banner */}
              {requestSuccess ? (
                <View style={styles.successBanner}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#16A34A" />
                  <Text style={styles.successBannerText}>{requestSuccess}</Text>
                </View>
              ) : null}

              {/* Error Banner */}
              {requestError ? (
                <View style={styles.errorBanner}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color="#DC2626" />
                  <Text style={styles.errorBannerText}>{requestError}</Text>
                </View>
              ) : null}

              {/* Form Input 1: HR Recipient */}
              <Text style={styles.fieldLabel}>Send Request to HR Email *</Text>
              {!useCustomHrEmail ? (
                <View style={styles.hrChipsRow}>
                  {hrStaffList.map((hr) => {
                    const isSelected = selectedHrEmail.toLowerCase() === hr.email.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={hr.email}
                        style={[styles.hrChip, isSelected && styles.hrChipSelected]}
                        onPress={() => setSelectedHrEmail(hr.email)}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons
                          name={isSelected ? 'account-check' : 'account-outline'}
                          size={16}
                          color={isSelected ? '#7C3AED' : '#64748B'}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.hrChipName, isSelected && styles.hrChipNameSelected]}>
                            {hr.name}
                          </Text>
                          <Text style={[styles.hrChipEmail, isSelected && styles.hrChipEmailSelected]}>
                            {hr.email}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={styles.customEmailToggle}
                    onPress={() => setUseCustomHrEmail(true)}
                  >
                    <Text style={styles.customEmailToggleText}>+ Enter different HR email</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={styles.inputWrap}>
                    <MaterialCommunityIcons name="email-outline" size={20} color="#64748B" style={styles.inputIcon} />
                    <RNTextInput
                      style={styles.textInput}
                      placeholder="e.g. hr@company.com"
                      placeholderTextColor="#94A3B8"
                      value={customHrEmail}
                      onChangeText={setCustomHrEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.customEmailToggle}
                    onPress={() => setUseCustomHrEmail(false)}
                  >
                    <Text style={styles.customEmailToggleText}>← Select from known HR staff</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Form Input 2: Attendance Date */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Applicable Date (YYYY-MM-DD) *</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <RNTextInput
                  style={styles.textInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                  value={requestDate}
                  onChangeText={setRequestDate}
                  maxLength={10}
                />
              </View>
              <View style={styles.quickDateRow}>
                <TouchableOpacity
                  style={[styles.quickDateChip, requestDate === getTodayDateStr() && styles.quickDateChipActive]}
                  onPress={() => setRequestDate(getTodayDateStr())}
                >
                  <Text style={[styles.quickDateText, requestDate === getTodayDateStr() && styles.quickDateTextActive]}>
                    Today ({getTodayDateStr()})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickDateChip, requestDate === getYesterdayDateStr() && styles.quickDateChipActive]}
                  onPress={() => setRequestDate(getYesterdayDateStr())}
                >
                  <Text style={[styles.quickDateText, requestDate === getYesterdayDateStr() && styles.quickDateTextActive]}>
                    Yesterday ({getYesterdayDateStr()})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Form Input 3: Additional Working Hours */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Additional Hours Requested *</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="timer-plus-outline" size={20} color="#7C3AED" style={styles.inputIcon} />
                <RNTextInput
                  style={styles.textInput}
                  placeholder="e.g. 2 or 1.5"
                  placeholderTextColor="#94A3B8"
                  value={additionalHours}
                  onChangeText={setAdditionalHours}
                  keyboardType="numeric"
                />
                <Text style={styles.inputSuffix}>Hours</Text>
              </View>
              <View style={styles.quickHoursRow}>
                {['1', '1.5', '2', '2.5', '3', '4'].map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.quickHourChip, additionalHours === h && styles.quickHourChipActive]}
                    onPress={() => setAdditionalHours(h)}
                  >
                    <Text style={[styles.quickHourText, additionalHours === h && styles.quickHourTextActive]}>
                      +{h}h
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Form Input 4: Message / Genuine Situation Reason */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Message / Genuine Situation Reason *</Text>
              <View style={[styles.inputWrap, { height: 90, alignItems: 'flex-start', paddingTop: 8 }]}>
                <RNTextInput
                  style={[styles.textInput, { height: 75, textAlignVertical: 'top' }]}
                  placeholder="Describe your genuine situation (e.g. Server migration issue delayed until midnight, critical client escalation onsite, etc.)..."
                  placeholderTextColor="#94A3B8"
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, submittingRequest && styles.submitBtnDisabled]}
                onPress={handleSubmitSpecialRequest}
                disabled={submittingRequest}
                activeOpacity={0.8}
              >
                {submittingRequest ? (
                  <ActivityIndicator color="#FFFFFF" size={20} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="send" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitBtnText}>Send Request to HR</Text>
                  </>
                )}
              </TouchableOpacity>
            </Card.Content>
          </Card>

          {/* REQUEST HISTORY SECTION */}
          <View style={styles.historySectionHeader}>
            <Text style={styles.historyHeading}>Employee Request History</Text>
            <TouchableOpacity onPress={handleRefreshHistory}>
              <MaterialCommunityIcons name="refresh" size={20} color={palette.primary} />
            </TouchableOpacity>
          </View>

          {loadingHistory && !refreshingHistory ? (
            <ActivityIndicator style={{ marginVertical: 20 }} color={palette.primary} />
          ) : exceptionHistory.length === 0 ? (
            <Card style={styles.emptyHistoryCard} mode="outlined">
              <Card.Content style={{ alignItems: 'center', padding: 24 }}>
                <MaterialCommunityIcons name="file-document-outline" size={36} color="#94A3B8" />
                <Text style={styles.emptyHistoryTitle}>No Requests Yet</Text>
                <Text style={styles.emptyHistorySubtitle}>
                  Your submitted special condition working hours requests will appear here with their approval status.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            exceptionHistory.map((item) => {
              const meta = item.metadata || {};
              const reqHours = meta.additionalHours ?? (meta.additionalMinutes ? meta.additionalMinutes / 60 : 0);
              const targetHr = meta.hrEmail || 'HR';
              const dateOnly = item.attendanceDate ? String(item.attendanceDate).slice(0, 10) : '';

              const isApproved = item.status === 'APPROVED';
              const isRejected = item.status === 'REJECTED';
              const isPending = item.status === 'PENDING';

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.88}
                  onPress={() => setSelectedHistoryItem(item)}
                >
                  <Card style={styles.historyCard} mode="outlined">
                    <Card.Content style={{ padding: 14 }}>
                      <View style={styles.historyCardHeader}>
                        <View>
                          <Text style={styles.historyCardDate}>{dateOnly}</Text>
                          <Text style={styles.historyCardHours}>
                            Requested: +{reqHours} hours
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            isApproved && styles.statusBadgeApproved,
                            isRejected && styles.statusBadgeRejected,
                            isPending && styles.statusBadgePending,
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={
                              isApproved
                                ? 'check-circle'
                                : isRejected
                                ? 'close-circle'
                                : 'clock-outline'
                            }
                            size={14}
                            color={
                              isApproved
                                ? '#16A34A'
                                : isRejected
                                ? '#DC2626'
                                : '#D97706'
                            }
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={[
                              styles.statusBadgeText,
                              isApproved && styles.statusBadgeTextApproved,
                              isRejected && styles.statusBadgeTextRejected,
                              isPending && styles.statusBadgeTextPending,
                            ]}
                          >
                            {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending Review'}
                          </Text>
                        </View>
                      </View>

                      <Divider style={{ marginVertical: 10 }} />

                      <Text style={styles.historyCardReason}>
                        "{item.reason}"
                      </Text>

                      {/* Who approved, when and time directly on card */}
                      {isApproved && (
                        <View style={styles.decisionBannerApproved}>
                          <MaterialCommunityIcons name="check-decagram" size={16} color="#15803D" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.decisionTextApproved}>
                              Approved by {meta.approvedByName || meta.hrEmail || targetHr || 'HR Admin'}
                            </Text>
                            <Text style={styles.decisionTimeApproved}>
                              {new Date(item.approvedAt || meta.approvedAt || item.updatedAt).toLocaleString([], {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </Text>
                          </View>
                        </View>
                      )}

                      {isRejected && (
                        <View style={styles.decisionBannerRejected}>
                          <MaterialCommunityIcons name="close-circle-outline" size={16} color="#DC2626" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.decisionTextRejected}>
                              Rejected by {meta.approvedByName || meta.hrEmail || targetHr || 'HR Admin'}
                            </Text>
                            <Text style={styles.decisionTimeRejected}>
                              {new Date(item.approvedAt || meta.approvedAt || item.updatedAt).toLocaleString([], {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </Text>
                          </View>
                        </View>
                      )}

                      <View style={styles.historyCardFooter}>
                        <Text style={styles.historyCardHr}>
                          Target HR: {targetHr}
                        </Text>
                        <Text style={styles.historyCardTime}>
                          Tap to view details ›
                        </Text>
                      </View>
                    </Card.Content>
                  </Card>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Tap on Request: Full Approval Audit Modal */}
      <Modal
        visible={Boolean(selectedHistoryItem)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedHistoryItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Request Details</Text>
                <Text style={styles.modalSubtitle}>Special Condition Working Hours</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedHistoryItem(null)}
                style={styles.modalCloseButton}
              >
                <MaterialCommunityIcons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedHistoryItem ? (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                {/* Status Chip */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                  <View
                    style={[
                      styles.statusBadge,
                      selectedHistoryItem.status === 'APPROVED' && styles.statusBadgeApproved,
                      selectedHistoryItem.status === 'REJECTED' && styles.statusBadgeRejected,
                      selectedHistoryItem.status === 'PENDING' && styles.statusBadgePending,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={
                        selectedHistoryItem.status === 'APPROVED'
                          ? 'check-circle'
                          : selectedHistoryItem.status === 'REJECTED'
                          ? 'close-circle'
                          : 'clock-outline'
                      }
                      size={14}
                      color={
                        selectedHistoryItem.status === 'APPROVED'
                          ? '#16A34A'
                          : selectedHistoryItem.status === 'REJECTED'
                          ? '#DC2626'
                          : '#D97706'
                      }
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.statusBadgeText,
                        selectedHistoryItem.status === 'APPROVED' && styles.statusBadgeTextApproved,
                        selectedHistoryItem.status === 'REJECTED' && styles.statusBadgeTextRejected,
                        selectedHistoryItem.status === 'PENDING' && styles.statusBadgeTextPending,
                      ]}
                    >
                      {selectedHistoryItem.status === 'APPROVED'
                        ? 'Approved'
                        : selectedHistoryItem.status === 'REJECTED'
                        ? 'Rejected'
                        : 'Pending Review'}
                    </Text>
                  </View>
                </View>

                {/* Date & Hours Info */}
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalLabel}>Applicable Date:</Text>
                  <Text style={styles.modalValue}>
                    {selectedHistoryItem.attendanceDate ? String(selectedHistoryItem.attendanceDate).slice(0, 10) : ''}
                  </Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalLabel}>Requested Hours:</Text>
                  <Text style={[styles.modalValue, { color: '#7C3AED', fontWeight: '800' }]}>
                    +{selectedHistoryItem.metadata?.additionalHours ?? (selectedHistoryItem.metadata?.additionalMinutes ? selectedHistoryItem.metadata?.additionalMinutes / 60 : 0)} hours
                  </Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalLabel}>Target HR:</Text>
                  <Text style={styles.modalValue}>
                    {selectedHistoryItem.metadata?.hrEmail || 'HR'}
                  </Text>
                </View>

                <Divider style={{ marginVertical: 12 }} />

                <Text style={styles.modalSectionTitle}>Your Reason:</Text>
                <Text style={styles.modalReasonText}>
                  "{selectedHistoryItem.reason}"
                </Text>

                <Divider style={{ marginVertical: 12 }} />

                {/* Who approved / rejected, when and time */}
                <Text style={styles.modalSectionTitle}>Decision Audit:</Text>
                {selectedHistoryItem.status === 'APPROVED' ? (
                  <View style={styles.modalDecisionBoxApproved}>
                    <Text style={styles.modalDecisionWhoApproved}>
                      Approved by:{' '}
                      {selectedHistoryItem.metadata?.approvedByName &&
                      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                        selectedHistoryItem.metadata.approvedByName,
                      )
                        ? selectedHistoryItem.metadata.approvedByName
                        : selectedHistoryItem.metadata?.hrEmail || 'HR Administrator'}
                    </Text>
                    <Text style={styles.modalDecisionWhenApproved}>
                      Date & Time: {new Date(selectedHistoryItem.approvedAt || selectedHistoryItem.metadata?.approvedAt || selectedHistoryItem.updatedAt).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </Text>
                    {selectedHistoryItem.metadata?.comment ? (
                      <Text style={styles.modalDecisionComment}>
                        Note: {selectedHistoryItem.metadata.comment}
                      </Text>
                    ) : null}
                  </View>
                ) : selectedHistoryItem.status === 'REJECTED' ? (
                  <View style={styles.modalDecisionBoxRejected}>
                    <Text style={styles.modalDecisionWhoRejected}>
                      Rejected by:{' '}
                      {selectedHistoryItem.metadata?.approvedByName &&
                      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                        selectedHistoryItem.metadata.approvedByName,
                      )
                        ? selectedHistoryItem.metadata.approvedByName
                        : selectedHistoryItem.metadata?.hrEmail || 'HR Administrator'}
                    </Text>
                    <Text style={styles.modalDecisionWhenRejected}>
                      Date & Time: {new Date(selectedHistoryItem.approvedAt || selectedHistoryItem.metadata?.approvedAt || selectedHistoryItem.updatedAt).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.modalDecisionBoxPending}>
                    <Text style={styles.modalDecisionPendingText}>
                      Awaiting review. Your request is currently pending HR approval.
                    </Text>
                  </View>
                )}
              </ScrollView>
            ) : null}

            <TouchableOpacity
              style={styles.modalCloseBtnFull}
              onPress={() => setSelectedHistoryItem(null)}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    elevation: 2,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  formHeaderIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.ink,
  },
  formHeaderSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  successBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
    fontWeight: '600',
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '600',
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.ink,
    marginBottom: 6,
  },
  hrChipsRow: {
    gap: 8,
  },
  hrChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  hrChipSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  hrChipName: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.ink,
  },
  hrChipNameSelected: {
    color: '#7C3AED',
  },
  hrChipEmail: {
    fontSize: 11,
    color: '#64748B',
  },
  hrChipEmailSelected: {
    color: '#6D28D9',
  },
  customEmailToggle: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    marginTop: 2,
  },
  customEmailToggleText: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '600',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    height: 44,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: palette.ink,
    paddingVertical: 0,
  },
  inputSuffix: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 6,
  },
  quickDateRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  quickDateChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  quickDateChipActive: {
    backgroundColor: '#EDE9FE',
    borderColor: '#7C3AED',
  },
  quickDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  quickDateTextActive: {
    color: '#7C3AED',
  },
  quickHoursRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  quickHourChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  quickHourChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  quickHourText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  quickHourTextActive: {
    color: '#FFFFFF',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 18,
    elevation: 2,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  historySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.ink,
  },
  emptyHistoryCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    borderStyle: 'dashed',
  },
  emptyHistoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.ink,
    marginTop: 8,
  },
  emptyHistorySubtitle: {
    fontSize: 12,
    color: palette.muted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  historyCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: 10,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historyCardDate: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.ink,
  },
  historyCardHours: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeApproved: {
    backgroundColor: palette.successSurface,
  },
  statusBadgeRejected: {
    backgroundColor: palette.errorSurface,
  },
  statusBadgePending: {
    backgroundColor: palette.warningSurface,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadgeTextApproved: {
    color: palette.success,
  },
  statusBadgeTextRejected: {
    color: palette.error,
  },
  statusBadgeTextPending: {
    color: palette.warning,
  },
  historyCardReason: {
    fontSize: 13,
    color: palette.body,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  historyCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  historyCardHr: {
    fontSize: 11,
    color: palette.muted,
  },
  historyCardTime: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
  },
  decisionBannerApproved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  decisionTextApproved: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  decisionTimeApproved: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
  },
  decisionBannerRejected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  decisionTextRejected: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  decisionTimeRejected: {
    fontSize: 11,
    color: '#991B1B',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  modalLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  modalValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modalReasonText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#334155',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalDecisionBoxApproved: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  modalDecisionWhoApproved: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  modalDecisionWhenApproved: {
    fontSize: 12,
    color: '#166534',
    marginTop: 3,
  },
  modalDecisionComment: {
    fontSize: 12,
    color: '#4B5563',
    fontStyle: 'italic',
    marginTop: 4,
  },
  modalDecisionBoxRejected: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  modalDecisionWhoRejected: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  modalDecisionWhenRejected: {
    fontSize: 12,
    color: '#991B1B',
    marginTop: 3,
  },
  modalDecisionBoxPending: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  modalDecisionPendingText: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '600',
  },
  modalCloseBtnFull: {
    marginTop: 16,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
