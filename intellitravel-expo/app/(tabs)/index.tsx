import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { View } from 'react-native';
import { router } from 'expo-router';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  const [markers, setMarkers] = useState<Array<{id: string, coordinate: {latitude: number, longitude: number}, title: string}>>([]);
  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [locationPermission, setLocationPermission] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        const location = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    })();
  }, []);

  const handleMapLongPress = (e: any) => {
    const { coordinate } = e.nativeEvent;
    
    // Prompt user for marker title
    Alert.prompt(
      "New Location Pin",
      "Enter a name for this location:",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Add",
          onPress: (title: string = "New Location") => {
            const newMarker = {
              id: Date.now().toString(),
              coordinate,
              title
            };
            setMarkers([...markers, newMarker]);
          }
        }
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_DEFAULT} // This will use OSM on Android
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          onLongPress={handleMapLongPress}
        >
          {markers.map(marker => (
            <Marker
              key={marker.id}
              coordinate={marker.coordinate}
              title={marker.title}
            />
          ))}
        </MapView>
      </View>

      <ThemedView style={styles.overlay}>
        <ThemedText type="title" style={styles.headerText}>IntelliTravel</ThemedText>
        <ThemedText style={styles.infoText}>
          Long press on the map to add a pin
        </ThemedText>
        
        <ThemedView style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => router.push('/(auth)/login')}
          >
            <ThemedText type="defaultSemiBold" style={styles.buttonText}>Login</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.button} 
            onPress={() => router.push('/(auth)/signup')}
          >
            <ThemedText type="defaultSemiBold" style={styles.buttonText}>Sign Up</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  headerText: {
    marginBottom: 10,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    height: 40,
    backgroundColor: '#3498db',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  buttonText: {
    color: '#fff',
  },
  infoText: {
    textAlign: 'center',
    opacity:
    0.7,
  }
});
