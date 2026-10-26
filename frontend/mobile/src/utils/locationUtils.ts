import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

/**
 * Checks if location services (GPS) are enabled on the device.
 * If disabled, prompts the user to turn on location via:
 *   1. Google Play Services native system dialog (Android Location.enableNetworkProviderAsync)
 *   2. If that fails or user dismisses, shows an explicit Alert modal with direct link to settings.
 *
 * Returns true if location services are currently enabled, false otherwise.
 */
export async function promptEnableLocationServices(): Promise<boolean> {
  try {
    const isServicesEnabled = await Location.hasServicesEnabledAsync();
    if (isServicesEnabled) {
      return true;
    }

    // On Android, attempt the native Google Play Services location resolution dialog
    if (Platform.OS === 'android') {
      try {
        await Location.enableNetworkProviderAsync();
        const recheck = await Location.hasServicesEnabledAsync();
        if (recheck) {
          return true;
        }
      } catch {
        // Native resolution dismissed or unavailable, fall through to explicit Alert
      }
    }

    // Show explicit popup modal prompting the user to turn on location
    return new Promise((resolve) => {
      Alert.alert(
        'Turn On Location',
        'Device location (GPS) is turned off. Please turn on Location services to verify your office geofence and record attendance.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Turn On',
            onPress: async () => {
              try {
                if (Platform.OS === 'android') {
                  try {
                    await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
                  } catch {
                    await Linking.openSettings();
                  }
                } else {
                  await Linking.openSettings();
                }
              } catch {
                await Linking.openSettings();
              }
              resolve(false);
            },
          },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
  } catch (error) {
    console.warn('[Location] Error checking/prompting location services:', error);
    return false;
  }
}

/**
 * Ensures foreground location permissions are granted.
 * If not granted, asks the OS permission dialog or prompts user to open settings.
 */
export async function promptLocationPermission(): Promise<boolean> {
  try {
    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') {
      return true;
    }

    if (canAskAgain) {
      const requested = await Location.requestForegroundPermissionsAsync();
      if (requested.status === 'granted') {
        return true;
      }
    }

    Alert.alert(
      'Location Permission Required',
      'Momo HRMS requires location access to verify that you are within your assigned office geofence. Please enable location permissions in settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => void Linking.openSettings() },
      ],
      { cancelable: true },
    );
    return false;
  } catch (error) {
    console.warn('[Location] Error checking location permission:', error);
    return false;
  }
}
