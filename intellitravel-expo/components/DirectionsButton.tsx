import React from 'react';
import { StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface DirectionsButtonProps {
  isRoutingAvailable: boolean;
  showDirections: boolean;
  toggleDirections: () => void;
  isLoggedIn: boolean;
  selectedDestination: {latitude: number, longitude: number, name?: string} | null;
}

const DirectionsButton: React.FC<DirectionsButtonProps> = ({
  isRoutingAvailable,
  showDirections,
  toggleDirections,
  isLoggedIn,
  selectedDestination
}) => {
  const router = useRouter();

  const handleDirectionsPress = () => {
    if (!selectedDestination) {
      Alert.alert('No Destination', 'Please select a destination first by tapping on the map.');
      return;
    }
    
    if (!isLoggedIn) {
      Alert.alert(
        'Login Required',
        'Please login to view directions.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/login') }
        ]
      );
      return;
    }
    
    // Toggle the directions
    toggleDirections();
  };

  if (!isRoutingAvailable) return null;

  return (
    <TouchableOpacity 
      style={styles.directionsButton} 
      onPress={handleDirectionsPress}
    >
      <FontAwesome name="road" size={20} color="white" />
      <Text style={styles.directionsButtonText}>
        {showDirections ? 'Hide Directions' : 'Show Directions'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  directionsButton: {
    position: 'absolute',
    top: 100,
    right: 10,
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  directionsButtonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: 'bold',
  },
});

export default DirectionsButton;