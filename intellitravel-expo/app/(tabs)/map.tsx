import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Dimensions, Platform, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, UrlTile, Region } from 'react-native-maps';
import { ThemedView } from '@/components/ThemedView';
import { FloatingAuthButton } from '@/components/FloatingAuthButton';
import { useAuth } from '@/context/AuthContext';
import * as Location from 'expo-location';
import { TopNavBar } from '@/components/TopNavBar';

export default function MapScreen() {
  const { isLoggedIn } = useAuth();
  const mapRef = useRef<MapView>(null);
  
  // Default region - Camiling, Tarlac, Philippines
  const [region, setRegion] = useState<Region>({
    latitude: 15.6942,
    longitude: 120.4132,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const getLocation = async () => {
      try {
        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted) {
            setErrorMsg('Permission to access location was denied');
            setLoading(false);
          }
          return;
        }

        // Get current location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        
        if (isMounted) {
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          setLoading(false);
        }
      } catch (error) {
        console.error('Error getting location:', error);
        if (isMounted) {
          setErrorMsg('Could not get your current location');
          setLoading(false);
        }
      }
    };

    getLocation();
    
    // Cleanup function to prevent state updates if component unmounts
    return () => {
      isMounted = false;
    };
  }, []);

  // Show error if location permission was denied
  useEffect(() => {
    if (errorMsg) {
      Alert.alert(
        'Location Error',
        errorMsg,
        [{ text: 'OK' }]
      );
    }
  }, [errorMsg]);

  // Function to center map on user's location
  const goToUserLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <TopNavBar />
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_DEFAULT : undefined}
        initialRegion={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onUserLocationChange={(e) => {
          if (e.nativeEvent.coordinate) {
            setUserLocation({
              latitude: e.nativeEvent.coordinate.latitude,
              longitude: e.nativeEvent.coordinate.longitude,
            });
          }
        }}
      >
        {/* Use UrlTile to explicitly use OpenStreetMap tiles */}
        <UrlTile 
          urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
        
        {/* Marker for Camiling, Tarlac */}
        <Marker
          coordinate={{
            latitude: 15.6942,
            longitude: 120.4132,
          }}
          title="Camiling"
          description="Camiling, Tarlac, Philippines"
          pinColor="blue"
        />
        
        {/* User's location marker (if available) */}
        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            title="You are here"
            description="Your current location"
            pinColor="red"
          />
        )}
      </MapView>
      
      {!isLoggedIn && <FloatingAuthButton />}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height - 80, // Adjust for the top nav bar
  }
});
