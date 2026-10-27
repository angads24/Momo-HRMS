import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Avatar,
  Card,
  Divider,
  IconButton,
  Snackbar,
  Text,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { updateEmployeeMe, uploadProfilePhoto } from '../api/employeeApi';
import type { UpdateEmployeeProfileInput } from '../api/employeeApi';
import { AppButton } from '../components/AppButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppTextInput } from '../components/AppTextInput';
import { ErrorMessage } from '../components/ErrorMessage';
import { palette } from '../theme/theme';
import { getErrorMessage } from '../utils/errors';
import { downsampleFaceImage } from '../utils/imageUtils';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, employeeProfile, refreshProfile, logout } = useAuth();

  // Edit Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);

  const handlePickPhoto = () => {
    Alert.alert(
      'Profile Photo',
      'Choose an option to update your profile photo',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera access is required to take a profile photo.');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                cameraType: ImagePicker.CameraType.front,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.6,
                base64: true,
              });
              if (!result.canceled && result.assets && result.assets[0]) {
                await savePhoto(result.assets[0]);
              }
            } catch (err: unknown) {
              setSnackbarMessage(getErrorMessage(err, 'Failed to capture photo'));
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Gallery access is required to select a photo.');
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.6,
                base64: true,
              });
              if (!result.canceled && result.assets && result.assets[0]) {
                await savePhoto(result.assets[0]);
              }
            } catch (err: unknown) {
              setSnackbarMessage(getErrorMessage(err, 'Failed to select photo'));
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const savePhoto = async (asset: ImagePicker.ImagePickerAsset) => {
    setUpdatingPhoto(true);
    try {
      const source = asset.uri || (asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : '');
      const b64 = await downsampleFaceImage(source, 480, 0.7);
      const dataUri = b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`;
      await uploadProfilePhoto(dataUri);
      await refreshProfile();
      setSnackbarMessage('Profile photo updated successfully!');
    } catch (err: unknown) {
      setSnackbarMessage(getErrorMessage(err, 'Failed to upload photo. Please try again.'));
    } finally {
      setUpdatingPhoto(false);
    }
  };

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');

  // Date Picker state
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Snackbar feedback
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  // Open Edit Modal with current values
  const handleOpenEdit = () => {
    setFirstName(employeeProfile?.firstName || '');
    setLastName(employeeProfile?.lastName || '');
    setPersonalEmail(employeeProfile?.personalEmail || '');
    setPhone(employeeProfile?.phone || '');
    setAlternatePhone(employeeProfile?.alternatePhone || '');
    setBloodGroup(employeeProfile?.bloodGroup || null);
    setDateOfBirth(
      employeeProfile?.dateOfBirth ? String(employeeProfile.dateOfBirth).slice(0, 10) : '',
    );
    setAddress(employeeProfile?.address || '');
    setEditError(null);
    setIsEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    // Basic validation
    if (!firstName.trim()) {
      setEditError('First name is required.');
      return;
    }

    if (personalEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(personalEmail.trim())) {
        setEditError('Please enter a valid personal email address.');
        return;
      }
    }

    setSaving(true);
    setEditError(null);

    try {
      const payload: UpdateEmployeeProfileInput = {
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        personalEmail: personalEmail.trim() || null,
        phone: phone.trim() || undefined,
        alternatePhone: alternatePhone.trim() || null,
        bloodGroup: bloodGroup || null,
        dateOfBirth: dateOfBirth.trim() || null,
        address: address.trim() || null,
      };

      await updateEmployeeMe(payload);
      await refreshProfile();

      setIsEditModalVisible(false);
      setSnackbarMessage('Profile updated successfully');
    } catch (err: unknown) {
      setEditError(getErrorMessage(err, 'Failed to update profile. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (): string => {
    if (employeeProfile?.firstName) {
      const first = employeeProfile.firstName[0] || '';
      const last = employeeProfile.lastName?.[0] || '';
      return (first + last).toUpperCase() || 'E';
    }
    if (user?.fullName) {
      const parts = user.fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return user.fullName.slice(0, 2).toUpperCase();
    }
    return 'EM';
  };

  const formatDate = (isoString?: string | null): string => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return String(isoString);
    }
  };

  const fullName = employeeProfile?.firstName
    ? `${employeeProfile.firstName} ${employeeProfile.lastName || ''}`.trim()
    : user?.fullName || 'Employee';

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Employee Profile"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Profile Card */}
        <Card style={styles.headerCard} mode="elevated">
          <Card.Content style={styles.headerCardContent}>
            <View style={styles.avatarContainer}>
              {employeeProfile?.profilePhotoUrl ? (
                <Avatar.Image
                  size={84}
                  source={{ uri: employeeProfile.profilePhotoUrl }}
                  style={styles.avatar}
                />
              ) : (
                <Avatar.Text
                  size={84}
                  label={getInitials()}
                  style={styles.avatar}
                  labelStyle={styles.avatarLabel}
                />
              )}
              <TouchableOpacity
                style={styles.cameraBadge}
                onPress={handlePickPhoto}
                activeOpacity={0.8}
                disabled={updatingPhoto}
                accessibilityLabel="Change profile photo"
              >
                <MaterialCommunityIcons
                  name="camera"
                  size={16}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.nameText}>{fullName}</Text>
            <Text style={styles.jobText}>{employeeProfile?.jobTitle || 'Team Member'}</Text>
            <Text style={styles.deptText}>
              {employeeProfile?.department?.name || 'Operations'}
            </Text>

            {employeeProfile?.employeeCode ? (
              <View style={styles.badgeRow}>
                <View style={styles.idBadge}>
                  <Text style={styles.idBadgeLabel}>EMPLOYEE ID</Text>
                  <Text style={styles.idBadgeValue}>{employeeProfile.employeeCode}</Text>
                </View>
              </View>
            ) : null}
          </Card.Content>
        </Card>

        {/* 1. PERSONAL INFORMATION SECTION */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWrap}>
            <MaterialCommunityIcons name="account-circle-outline" size={20} color={palette.primary} />
            <Text style={styles.sectionTitle}>PERSONAL INFORMATION</Text>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={handleOpenEdit}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="pencil-outline" size={15} color={palette.primary} />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.infoCard} mode="outlined">
          <Card.Content style={styles.infoCardContent}>
            <InfoRow label="Full Name" value={fullName} icon="account" />
            <Divider style={styles.rowDivider} />
            <InfoRow
              label="Personal Email"
              value={employeeProfile?.personalEmail || '—'}
              icon="email-outline"
            />
            <Divider style={styles.rowDivider} />
            <InfoRow
              label="Phone Number"
              value={employeeProfile?.phone || '—'}
              icon="phone-outline"
            />
            <Divider style={styles.rowDivider} />
            <InfoRow
              label="Alternate Phone"
              value={employeeProfile?.alternatePhone || '—'}
              icon="phone-plus-outline"
            />
            <Divider style={styles.rowDivider} />
            <InfoRow
              label="Blood Group"
              value={employeeProfile?.bloodGroup ? `🩸 ${employeeProfile.bloodGroup}` : '—'}
              icon="water-outline"
            />
            <Divider style={styles.rowDivider} />
            <InfoRow
              label="Date of Birth"
              value={formatDate(employeeProfile?.dateOfBirth)}
              icon="calendar-account"
            />
            <Divider style={styles.rowDivider} />
            <InfoRow
              label="Gender"
              value={
                employeeProfile?.gender
                  ? employeeProfile.gender.replace(/_/g, ' ')
                  : '—'
              }
              icon="gender-male-female"
            />
            <Divider style={styles.rowDivider} />
            <InfoRow
              label="Address"
              value={employeeProfile?.address || '—'}
              icon="map-marker-outline"
            />
          </Card.Content>
        </Card>

        {/* 2. EMPLOYMENT INFORMATION SECTION */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWrap}>
            <MaterialCommunityIcons name="briefcase-outline" size={20} color={palette.primary} />
            <Text style={styles.sectionTitle}>EMPLOYMENT INFORMATION</Text>
          </View>
          <View style={styles.readOnlyTag}>
            <MaterialCommunityIcons name="lock-outline" size={13} color={palette.muted} />
            <Text style={styles.readOnlyText}>Official Record</Text>
          </View>
        </View>

        <Card style={styles.infoCard} mode="outlined">
          <Card.Content style={styles.infoCardContent}>
            <InfoRow
              label="Employee ID"
              value={employeeProfile?.employeeCode || '—'}
              icon="badge-account-outline"
            />
            <Divider style={styles.rowDivider} />
            <InfoRow
              label="Company Email"
              value={employeeProfile?.email || user?.email || '—'}
              icon="email-check-outline"
            />
            <Divider style={styles.rowDivider} />
            <InfoRow
              label="Department"
              value={employeeProfile?.department?.name || '—'}
              icon="domain"
            />
            <Divider style={styles.rowDivider} />
            <InfoRow
              label="Designation"
              value={employeeProfile?.jobTitle || '—'}
              icon="card-account-details-outline"
            />
            <Divider style={styles.rowDivider} />
            <InfoRow
              label="Target Office"
              value={employeeProfile?.officeLocationName || 'Wakad (PN-001)'}
              icon="office-building"
            />
            <Divider style={styles.rowDivider} />
            <InfoRow
              label="Joining Date"
              value={formatDate(employeeProfile?.dateOfJoining)}
              icon="calendar-check"
            />
            <Divider style={styles.rowDivider} />
            <InfoRow
              label="Employment Status"
              value={employeeProfile?.status || 'ACTIVE'}
              icon="shield-check-outline"
              valueColor={palette.success}
            />
          </Card.Content>
        </Card>

        {/* 3. QUICK ACTIONS — MSG TO HR */}
        <TouchableOpacity
          style={styles.msgToHrCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('MsgToHr')}
        >
          <View style={styles.msgToHrIconWrap}>
            <MaterialCommunityIcons name="clock-plus-outline" size={24} color="#7C3AED" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.msgToHrTitle}>Msg to HR (Special Hours)</Text>
            <Text style={styles.msgToHrSubtitle}>
              Request additional working hours for genuine situations
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={palette.muted} />
        </TouchableOpacity>

        {/* 4. QUICK ACTIONS — MY ATTENDANCE CALENDAR */}
        <TouchableOpacity
          style={[styles.msgToHrCard, { marginTop: 0, borderColor: '#BFDBFE', backgroundColor: '#F8FAFC' }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('MyAttendance')}
        >
          <View style={[styles.msgToHrIconWrap, { backgroundColor: '#EFF6FF' }]}>
            <MaterialCommunityIcons name="calendar-month-outline" size={24} color={palette.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.msgToHrTitle}>My Attendance & Calendar</Text>
            <Text style={styles.msgToHrSubtitle}>
              Monthly calendar view, attendance logs, and hours summary
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={palette.muted} />
        </TouchableOpacity>

        {/* 5. SIGN OUT ACTION */}
        <TouchableOpacity
          style={[styles.msgToHrCard, { marginTop: 0, borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}
          activeOpacity={0.8}
          onPress={() => {
            Alert.alert(
              'Sign Out',
              'Are you sure you want to sign out of Momo HRMS on this device?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign Out',
                  style: 'destructive',
                  onPress: () => void logout(),
                },
              ],
            );
          }}
        >
          <View style={[styles.msgToHrIconWrap, { backgroundColor: '#FEE2E2' }]}>
            <MaterialCommunityIcons name="logout" size={22} color={palette.error} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.msgToHrTitle, { color: palette.error }]}>Sign Out</Text>
            <Text style={styles.msgToHrSubtitle}>
              Explicitly sign out of your account on this device
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={palette.error} />
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!saving) setIsEditModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
          keyboardVerticalOffset={Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <IconButton
                icon="close"
                size={22}
                disabled={saving}
                onPress={() => setIsEditModalVisible(false)}
              />
            </View>

            <ScrollView
              contentContainerStyle={[styles.modalScroll, { paddingBottom: 40 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {editError && <ErrorMessage message={editError} />}

              <AppTextInput
                label="First Name *"
                value={firstName}
                onChangeText={setFirstName}
                editable={!saving}
                returnKeyType="next"
              />

              <AppTextInput
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                editable={!saving}
                returnKeyType="next"
              />

              <AppTextInput
                label="Personal Email"
                value={personalEmail}
                onChangeText={setPersonalEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!saving}
                returnKeyType="next"
              />

              <AppTextInput
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!saving}
                returnKeyType="next"
              />

              <AppTextInput
                label="Alternate Phone Number"
                value={alternatePhone}
                onChangeText={setAlternatePhone}
                keyboardType="phone-pad"
                editable={!saving}
                returnKeyType="done"
              />

              {/* Blood Group Selector in Modal */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: palette.muted, marginBottom: 6 }}>
                  Blood Group
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                    <TouchableOpacity
                      key={bg}
                      onPress={() => setBloodGroup(bloodGroup === bg ? null : bg)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: bloodGroup === bg ? palette.primary : palette.border,
                        backgroundColor: bloodGroup === bg ? palette.primary : '#FFFFFF',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: bloodGroup === bg ? '#FFFFFF' : palette.ink,
                        }}
                      >
                        {bg}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Native Date Picker for DOB */}
              <View style={styles.dateFieldWrap}>
                <Text style={styles.dateFieldLabel}>Date of Birth</Text>
                <TouchableOpacity
                  style={[styles.dateFieldBtn, !saving && { opacity: 1 }]}
                  onPress={() => !saving && setShowDatePicker(true)}
                  disabled={saving}
                  accessibilityLabel="Select date of birth"
                >
                  <MaterialCommunityIcons name="calendar" size={18} color={palette.muted} />
                  <Text style={[styles.dateFieldText, !dateOfBirth && styles.dateFieldPlaceholder]}>
                    {dateOfBirth ? formatDate(dateOfBirth) : 'Select Date of Birth'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={16} color={palette.muted} />
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={dateOfBirth ? new Date(dateOfBirth) : new Date(2000, 0, 1)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  minimumDate={new Date(1940, 0, 1)}
                  onValueChange={(_: any, selected?: Date) => {
                    if (Platform.OS === 'android') setShowDatePicker(false);
                    if (selected) setDateOfBirth(selected.toISOString().slice(0, 10));
                  }}
                  onDismiss={() => setShowDatePicker(false)}
                />
              )}

              <AppTextInput
                label="Address"
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
                editable={!saving}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsEditModalVisible(false)}
                  disabled={saving}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <AppButton
                  onPress={handleSaveProfile}
                  loading={saving}
                  disabled={saving}
                  style={styles.saveBtn}
                >
                  Save Changes
                </AppButton>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Non-intrusive Snackbar Feedback */}
      <Snackbar
        visible={Boolean(snackbarMessage)}
        onDismiss={() => setSnackbarMessage(null)}
        duration={3500}
        style={styles.snackbar}
      >
        <Text style={styles.snackbarText}>{snackbarMessage}</Text>
      </Snackbar>
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  icon,
  valueColor,
}: {
  label: string;
  value: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <MaterialCommunityIcons name={icon} size={18} color={palette.muted} />
      </View>
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text
          style={[styles.infoValue, valueColor ? { color: valueColor } : null]}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 3,
  },
  headerCardContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    backgroundColor: palette.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  avatar: {
    backgroundColor: palette.primary,
  },
  avatarLabel: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  nameText: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.ink,
    textAlign: 'center',
    marginBottom: 4,
  },
  jobText: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.primary,
    textAlign: 'center',
  },
  deptText: {
    fontSize: 13,
    color: palette.muted,
    textAlign: 'center',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  idBadge: {
    backgroundColor: '#EEF2F6',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  idBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: palette.muted,
    letterSpacing: 0.5,
  },
  idBadgeValue: {
    fontSize: 13,
    fontWeight: '800',
    color: palette.ink,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.muted,
    letterSpacing: 0.8,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.primary,
  },
  readOnlyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readOnlyText: {
    fontSize: 11,
    color: palette.muted,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoCardContent: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoIconWrap: {
    width: 32,
    alignItems: 'flex-start',
  },
  infoTextWrap: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: palette.muted,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.ink,
  },
  rowDivider: {
    backgroundColor: palette.borderSubtle,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    paddingBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.ink,
  },
  modalScroll: {
    padding: 20,
  },
  dateFieldWrap: {
    marginBottom: 2,
  },
  dateFieldLabel: {
    fontSize: 12,
    color: palette.muted,
    marginBottom: 4,
    marginLeft: 4,
    fontWeight: '600',
  },
  dateFieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 6,
  },
  dateFieldText: {
    flex: 1,
    fontSize: 14,
    color: palette.ink,
    fontWeight: '500',
  },
  dateFieldPlaceholder: {
    color: palette.muted,
    fontWeight: '400',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.muted,
  },
  saveBtn: {
    minWidth: 140,
  },
  snackbar: {
    backgroundColor: palette.ink,
    borderRadius: 8,
  },
  snackbarText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  msgToHrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    marginTop: 14,
    marginBottom: 20,
    gap: 12,
    elevation: 2,
  },
  msgToHrIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgToHrTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.ink,
  },
  msgToHrSubtitle: {
    fontSize: 12,
    color: palette.muted,
    marginTop: 2,
  },
});
