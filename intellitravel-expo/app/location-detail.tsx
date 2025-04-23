import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { ThemedView } from '@/components/ThemedView';
import { TopNavBar } from '@/components/TopNavBar';
import { FontAwesome } from '@expo/vector-icons';
import { locationsAPI } from '@/services/api';

export default function LocationDetails() {
  const { isLoggedIn } = useAuth();
  const params = useLocalSearchParams();
  const { lat, lng, name } = params;

  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [userRating, setUserRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    const fetchLocationDetails = async () => {
      try {
        setLoading(true);
        
        // Try to find nearby locations first
        const nearbyLocations = await locationsAPI.searchNearby(
          parseFloat(lat as string), 
          parseFloat(lng as string),
          0.05 // 50 meters radius
        );
        
        if (nearbyLocations && nearbyLocations.length > 0) {
          const nearbyLocation = nearbyLocations[0];
          // Ensure we have an ID before proceeding
          if (nearbyLocation.id) {
            const analytics = await locationsAPI.getLocationAnalytics(nearbyLocation.id);
            setLocation(nearbyLocation);
            setAnalytics(analytics);
          } else {
            // Handle case when ID is missing
            console.warn('Found location without ID');
            setLocation({
              id: 0, // Use a placeholder ID
              name: name || nearbyLocation.name || 'Selected Location',
              latitude: parseFloat(lat as string),
              longitude: parseFloat(lng as string),
              average_rating: 0,
              visit_count: 0
            });
            setAnalytics({
              visits_total: 0,
              average_rating: 0,
              recent_comments: []
            });
          }
        } else {
          // If no existing location, create a placeholder with ID
          console.log('No nearby locations found, creating placeholder');
          setLocation({
            id: 0, // Use a placeholder ID to avoid null
            name: name || 'Selected Location',
            latitude: parseFloat(lat as string),
            longitude: parseFloat(lng as string),
            average_rating: 0,
            visit_count: 0
          });
          setAnalytics({
            visits_total: 0,
            average_rating: 0,
            recent_comments: []
          });
        }
      } catch (error) {
        console.error('Error fetching location details:', error);
        // Set default values even on error
        setLocation({
          id: 0, // Use a placeholder ID
          name: name || 'Selected Location',
          latitude: parseFloat(lat as string),
          longitude: parseFloat(lng as string),
          average_rating: 0,
          visit_count: 0
        });
        setAnalytics({
          visits_total: 0,
          average_rating: 0,
          recent_comments: []
        });
        Alert.alert('Error', 'Could not load location details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLocationDetails();
  }, [lat, lng, name]);

  const handleRatingSubmit = async () => {
    if (!isLoggedIn) {
      Alert.alert('Login Required', 'Please login to rate this location');
      return;
    }
    
    if (userRating === 0) {
      Alert.alert('Rating Required', 'Please select a rating from 1-5 stars');
      return;
    }
    
    try {
      setLoading(true);
      
      // Check if location exists and has an ID
      if (!location) {
        throw new Error('Location data is missing');
      }
      
      let locationToRate = location;
      
      // If location doesn't have an ID or ID is placeholder, create a new one
      if (!location.id || location.id === 0) {
        console.log('Creating new location for rating');
        const newLocation = await locationsAPI.createLocation({
          name: location.name,
          latitude: location.latitude,
          longitude: location.longitude,
          type: 'user_added'
        });
        
        if (!newLocation || !newLocation.id) {
          throw new Error('Failed to create new location');
        }
        
        locationToRate = newLocation;
        setLocation(newLocation);
      }
      
      // Now we can safely use the location ID
      await locationsAPI.rateLocation({
        location_id: locationToRate.id,
        rating: userRating,
        comment: comment
      });
      
      // Refresh analytics
      const refreshedAnalytics = await locationsAPI.getLocationAnalytics(locationToRate.id);
      setAnalytics(refreshedAnalytics);
      
      Alert.alert('Success', 'Your rating has been submitted!');
      setComment('');
      setUserRating(0); // Reset rating after submission
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit your rating. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number, interactive = false) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(i => (
          <TouchableOpacity 
            key={i} 
            onPress={() => interactive && setUserRating(i)}
            disabled={!interactive}
          >
            <FontAwesome 
              name={i <= rating ? 'star' : 'star-o'} 
              size={interactive ? 30 : 20} 
              color={i <= rating ? '#FFD700' : '#ccc'} 
              style={styles.star}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <TopNavBar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <TopNavBar />
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.locationName}>{location?.name}</Text>
          <Text style={styles.coordinates}>
            {location?.latitude.toFixed(6)}, {location?.longitude.toFixed(6)}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Average Rating</Text>
            <View style={styles.ratingContainer}>
              {renderStars(analytics?.average_rating || 0)}
              <Text style={styles.ratingText}>
                {(analytics?.average_rating || 0).toFixed(1)} ({analytics?.visits_total || 0} visits)
              </Text>
            </View>
          </View>
        </View>

        {isLoggedIn ? (
          <View style={styles.rateContainer}>
            <Text style={styles.sectionTitle}>Rate This Location</Text>
            {renderStars(userRating, true)}
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment (optional)"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
            />
            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleRatingSubmit}
            >
              <Text style={styles.submitButtonText}>Submit Rating</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.loginPrompt}>
            <Text style={styles.loginPromptText}>
              Please login to rate this location
            </Text>
          </View>
        )}

        {analytics?.recent_comments && analytics.recent_comments.length > 0 && (
          <View style={styles.commentsContainer}>
            <Text style={styles.sectionTitle}>Recent Reviews</Text>
            {analytics.recent_comments.map((comment: any, index: number) => (
              <View key={index} style={styles.commentItem}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentUser}>{comment.user?.name || 'Anonymous'}</Text>
                  {renderStars(comment.rating)}
                </View>
                <Text style={styles.commentText}>{comment.comment}</Text>
                <Text style={styles.commentDate}>
                  {new Date(comment.created_at).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {analytics?.visits_by_type && analytics.visits_by_type.length > 0 && (
          <View style={styles.statsDetail}>
            <Text style={styles.sectionTitle}>Visit Statistics</Text>
            {analytics.visits_by_type.map((item: any, index: number) => (
              <View key={index} style={styles.visitTypeRow}>
                <Text style={styles.visitTypeLabel}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Text>
                <Text style={styles.visitTypeCount}>{item.count}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 20,
  },
  locationName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  coordinates: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  statsContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  statItem: {
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  star: {
    marginRight: 5,
  },
  ratingText: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
  },
  rateContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  commentInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    marginBottom: 16,
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#2196F3',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginPrompt: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  loginPromptText: {
    fontSize: 16,
    color: '#666',
  },
  commentsContainer: {
    marginBottom: 24,
  },
  commentItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUser: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  commentText: {
    fontSize: 14,
    marginBottom: 8,
  },
  commentDate: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  statsDetail: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  visitTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  visitTypeLabel: {
    fontSize: 14,
  },
  visitTypeCount: {
    fontSize: 14,
    fontWeight: 'bold',
  }
});
