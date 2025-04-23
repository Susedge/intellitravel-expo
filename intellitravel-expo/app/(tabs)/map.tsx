import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Dimensions, Platform, Alert, View, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { ThemedView } from '@/components/ThemedView';
import { FloatingAuthButton } from '@/components/FloatingAuthButton';
import { useAuth } from '@/context/AuthContext';
import * as Location from 'expo-location';
import { TopNavBar } from '@/components/TopNavBar';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { locationsAPI } from '@/services/api';

export default function MapScreen() {
  const { isLoggedIn, user } = useAuth();
  const webViewRef = useRef<WebView>(null);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<{latitude: number, longitude: number, name?: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDirections, setShowDirections] = useState(false);
  const [isRoutingAvailable, setIsRoutingAvailable] = useState(false);
  const [ratedLocations, setRatedLocations] = useState<any[]>([]);

  // Default location - Camiling, Tarlac, Philippines
  const defaultLocation = {
    latitude: 15.6942,
    longitude: 120.4132,
  };

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

        // Get current location with a timeout and fallback
        let location;
        try {
          location = await Promise.race([
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Location timeout')), 10000)
            )
          ]) as Location.LocationObject;
        } catch (error) {
          // Fallback to last known location
          const lastLocation = await Location.getLastKnownPositionAsync();
          location = lastLocation as Location.LocationObject | null;
        }
        
        if (location && isMounted) {
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          setLoading(false);
        } else if (isMounted) {
          // Use default location
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
    
    // Fetch rated locations
    const fetchRatedLocations = async () => {
      try {
        const locations = await locationsAPI.getLocations();
        // Filter locations that have ratings
        const rated = locations.filter(location => 
          location.average_rating !== undefined && 
          location.average_rating > 0
        );
        if (isMounted) {
          setRatedLocations(rated);
          console.log(`Loaded ${rated.length} rated locations`);
        }
      } catch (error) {
        console.error('Failed to fetch rated locations:', error);
      }
    };
    
    fetchRatedLocations();
    
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

  // Update rated locations on the map when they change
  useEffect(() => {
    if (webViewRef.current && ratedLocations.length > 0 && !loading) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'updateRatedLocations',
        locations: ratedLocations
      }));
    }
  }, [ratedLocations, loading]);

  // Handle destination selection
  const onDestinationSelected = async (destination: {latitude: number, longitude: number, name?: string}) => {
    setSelectedDestination(destination);
    setIsRoutingAvailable(true);
    
    console.log("Destination selected:", {
      latitude: destination.latitude,
      longitude: destination.longitude,
      name: destination.name || 'Unnamed location'
    });
    
    if (!isLoggedIn) {
      Alert.alert(
        'Login Required',
        'Please login to save this destination and view directions.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/login') }
        ]
      );
    } else {
      // Log this destination selection if user is logged in
      try {
        console.log("Logging visit for destination:", {
          latitude: destination.latitude,
          longitude: destination.longitude,
          name: destination.name || 'Unnamed location',
          type: 'selected',
          isLoggedIn: isLoggedIn,
          userId: user?.id
        });
        
        const visitData = {
          latitude: destination.latitude,
          longitude: destination.longitude,
          name: destination.name || 'Unnamed location',
          type: 'selected'
        };
        
        console.log("Sending visit data to API:", visitData);
        
        const response = await locationsAPI.logVisit(visitData);
        console.log("Visit logged successfully:", response);
      } catch (error: any) {
        console.error('Failed to log destination visit:', error);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
          console.error('Response headers:', error.response.headers);
        } else if (error.request) {
          console.error('No response received:', error.request);
        } else {
          console.error('Error message:', error.message);
        }
        console.error('Error config:', error.config);
      }
    }
  };

  // Toggle directions display
  const toggleDirections = () => {
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
    
    // Toggle the state
    const newShowDirections = !showDirections;
    setShowDirections(newShowDirections);
    
    console.log('Toggling directions:', {
      show: newShowDirections,
      userLocation: userLocation,
      destination: selectedDestination
    });
    
    // Only send message if we have both locations
    if (webViewRef.current && userLocation) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'toggleDirections',
        show: newShowDirections,
        userLocation: userLocation,
        destination: selectedDestination
      }));
    } else {
      console.error('Cannot show directions: Missing WebView reference or user location');
    }
  };

  // Handle messages from WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'destinationSelected') {
        onDestinationSelected({
          latitude: data.latitude,
          longitude: data.longitude,
          name: data.name || 'Selected Location'
        });
      } else if (data.type === 'ratedLocationClicked') {
        // Handle click on a rated location
        if (isLoggedIn) {
          router.push({
            pathname: '/location-detail',
            params: {
              lat: data.latitude.toString(),
              lng: data.longitude.toString(),
              name: data.name || 'Rated Location'
            }
          });
        } else {
          Alert.alert(
            'Login Required',
            'Please login to view location details.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Login', onPress: () => router.push('/login') }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  // HTML content for the Leaflet map
  const generateMapHTML = () => {
    // Always center on Camiling, Tarlac initially
    const centerLatitude = 15.6942;
    const centerLongitude = 120.4132;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" />
          <script src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"></script>
          <script src="https://unpkg.com/lrm-osrm@1.2.0/dist/lrm-osrm.js"></script>
          <style>
            body {
              margin: 0;
              padding: 0;
            }
            #map {
              width: 100%;
              height: 100vh;
            }
            .attribution {
              font-size: 11px;
            }
            .destination-popup .leaflet-popup-content-wrapper {
              background-color: #f8f9fa;
              color: #333;
              border-radius: 5px;
            }
            .destination-popup .leaflet-popup-content {
              margin: 10px 15px;
              line-height: 1.4;
            }
            .destination-popup .leaflet-popup-tip {
              background-color: #f8f9fa;
            }
            /* Style for the route line */
            .leaflet-routing-line {
              opacity: 0.8;
            }
            .leaflet-routing-container {
              display: none; /* Hide the instructions panel but keep the lines */
            }
            .leaflet-routing-alt {
              display: none;
            }
            .leaflet-routing-container-hide {
              display: none;
            }
            /* Style for rated location circles */
            .rated-location-marker {
              border: 2px solid #fff;
              box-shadow: 0 0 10px rgba(0,0,0,0.3);
              border-radius: 50%;
              text-align: center;
              line-height: 32px;
              font-weight: bold;
              color: white;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            // Initialize the map centered on Camiling, Tarlac
            const map = L.map('map').setView([${centerLatitude}, ${centerLongitude}], 13);
            
            // Add OpenStreetMap tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            // Add a marker for Camiling, Tarlac
            const camilingMarker = L.marker([${centerLatitude}, ${centerLongitude}]).addTo(map);
            camilingMarker.bindPopup("<b>Camiling</b><br>Camiling, Tarlac, Philippines").openPopup();
            
            // Add user location marker if available
            ${userLocation ? `
              const userMarker = L.marker([${userLocation.latitude}, ${userLocation.longitude}], {
                icon: L.icon({
                  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                  popupAnchor: [1, -34]
                })
              }).addTo(map);
              userMarker.bindPopup("<b>You are here</b><br>Your current location").openPopup();
            ` : 'let userMarker = null;'}

            // Variables for destination and routing
            let destinationMarker = null;
            let routingControl = null;
            let ratedLocationMarkers = [];
            
            // Function to get color based on rating
            function getRatingColor(rating) {
              if (rating >= 4.5) return '#2ecc71';  // Excellent - Green
              if (rating >= 4.0) return '#27ae60';  // Very Good - Dark Green
              if (rating >= 3.5) return '#f39c12';  // Good - Orange
              if (rating >= 3.0) return '#f1c40f';  // Above Average - Yellow
              if (rating >= 2.5) return '#e67e22';  // Average - Light Orange
              if (rating >= 2.0) return '#d35400';  // Below Average - Dark Orange
              return '#c0392b';                      // Poor - Red
            }
            
            // Function to add rated location markers
            function addRatedLocationMarkers(locations) {
              // Remove existing markers
              ratedLocationMarkers.forEach(marker => map.removeLayer(marker));
              ratedLocationMarkers = [];
              
              // Add new markers
              locations.forEach(location => {
                const rating = location.average_rating || 0;
                if (rating > 0) {
                  const color = getRatingColor(rating);
                  
                  // Create a custom circle marker
                  const marker = L.circleMarker([location.latitude, location.longitude], {
                    radius: 8 + (rating * 1.5), // Size based on rating
                    fillColor: color,
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                  }).addTo(map);
                  
                  // Add a popup with location details
                  marker.bindPopup(\`
                    <div>
                                            <b>\${location.name}</b><br>
                      <span>Rating: \${rating.toFixed(1)}/5.0</span><br>
                      <span>Visits: \${location.visit_count || 0}</span><br>
                      <span>Tap to view details</span>
                    </div>
                  \`);
                  
                  // Handle click on rated location
                  marker.on('click', function() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'ratedLocationClicked',
                      latitude: location.latitude,
                      longitude: location.longitude,
                      name: location.name,
                      id: location.id
                    }));
                  });
                  
                  ratedLocationMarkers.push(marker);
                }
              });
              
              console.log(\`Added \${ratedLocationMarkers.length} rated location markers\`);
            }
            
            // Handle map clicks to select destinations
            map.on('click', function(e) {
              // If there's already a destination marker, remove it
              if (destinationMarker) {
                map.removeLayer(destinationMarker);
              }
              
              // Remove routing if it exists
              if (routingControl) {
                map.removeControl(routingControl);
                routingControl = null;
              }
              
              // Create a new destination marker
              destinationMarker = L.marker(e.latlng, {
                icon: L.icon({
                  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                  popupAnchor: [1, -34]
                }),
                draggable: true
              }).addTo(map);
              
              // Calculate distance if user location is available
              let distanceText = '';
              if (userMarker) {
                const userLatLng = userMarker.getLatLng();
                const distanceMeters = userLatLng.distanceTo(e.latlng);
                const distanceKm = (distanceMeters / 1000).toFixed(2);
                distanceText = '<br><span>Distance: ' + distanceKm + ' km</span>';
              }
              
              // Make popup for the destination
              const popupContent = \`
                <div>
                  <b>Selected Destination</b><br>
                  <span>Latitude: \${e.latlng.lat.toFixed(6)}</span><br>
                  <span>Longitude: \${e.latlng.lng.toFixed(6)}</span>\${distanceText}
                </div>
              \`;
              
              destinationMarker.bindPopup(popupContent, { className: 'destination-popup' }).openPopup();
              
              // Send message to React Native about the selected destination
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'destinationSelected',
                latitude: e.latlng.lat,
                longitude: e.latlng.lng
              }));
              
              // Update marker position when dragged
              destinationMarker.on('dragend', function(event) {
                const position = destinationMarker.getLatLng();
                
                // Recalculate distance after dragging
                let distanceText = '';
                if (userMarker) {
                  const userLatLng = userMarker.getLatLng();
                  const distanceMeters = userLatLng.distanceTo(position);
                  const distanceKm = (distanceMeters / 1000).toFixed(2);
                  distanceText = '<br><span>Distance: ' + distanceKm + ' km</span>';
                }
                
                destinationMarker.setPopupContent(\`
                  <div>
                    <b>Selected Destination</b><br>
                    <span>Latitude: \${position.lat.toFixed(6)}</span><br>
                    <span>Longitude: \${position.lng.toFixed(6)}</span>\${distanceText}
                  </div>
                \`);
                
                // Send updated position to React Native
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'destinationSelected',
                  latitude: position.lat,
                  longitude: position.lng
                }));
                
                // Update routing if it's active
                if (routingControl) {
                  map.removeControl(routingControl);
                  const waypoints = [
                    L.latLng(${userLocation ? `${userLocation.latitude}, ${userLocation.longitude}` : centerLatitude + ', ' + centerLongitude}),
                    L.latLng(position.lat, position.lng)
                  ];
                  
                  routingControl = L.Routing.control({
                    waypoints: waypoints,
                    router: new L.Routing.OSRMv1({
                      serviceUrl: 'https://router.project-osrm.org/route/v1',
                      profile: 'driving'
                    }),
                    routeWhileDragging: true,
                    showAlternatives: true,
                    lineOptions: {
                      styles: [{color: '#0066FF', opacity: 0.7, weight: 5}],
                      extendToWaypoints: true,
                      missingRouteTolerance: 0
                    },
                    show: false,
                    collapsible: true
                  }).addTo(map);
                }
              });
            });
            
            // Handle location changes from the app
            window.updateUserLocation = function(lat, lng) {
              if (!userMarker) {
                userMarker = L.marker([lat, lng], {
                  icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34]
                  })
                }).addTo(map);
                userMarker.bindPopup("<b>You are here</b><br>Your current location");
              } else {
                userMarker.setLatLng([lat, lng]);
              }
              
              // Update routing if it exists
              if (routingControl && destinationMarker) {
                map.removeControl(routingControl);
                const waypoints = [
                  L.latLng(lat, lng),
                  destinationMarker.getLatLng()
                ];
                
                routingControl = L.Routing.control({
                  waypoints: waypoints,
                  router: new L.Routing.OSRMv1({
                    serviceUrl: 'https://router.project-osrm.org/route/v1',
                    profile: 'driving'
                  }),
                  routeWhileDragging: true,
                  showAlternatives: true,
                  lineOptions: {
                    styles: [{color: '#0066FF', opacity: 0.7, weight: 5}],
                    extendToWaypoints: true,
                    missingRouteTolerance: 0
                  },
                  show: false,
                  collapsible: true
                }).addTo(map);
              }
              
              // Update distance in popup if destination marker exists
              if (destinationMarker) {
                const destLatLng = destinationMarker.getLatLng();
                const userLatLng = L.latLng(lat, lng);
                const distanceMeters = userLatLng.distanceTo(destLatLng);
                const distanceKm = (distanceMeters / 1000).toFixed(2);
                
                destinationMarker.setPopupContent(\`
                  <div>
                    <b>Selected Destination</b><br>
                    <span>Latitude: \${destLatLng.lat.toFixed(6)}</span><br>
                    <span>Longitude: \${destLatLng.lng.toFixed(6)}</span><br>
                    <span>Distance: \${distanceKm} km</span>
                  </div>
                \`);
              }
            };
            
            // Function to go to user's location
            window.goToUserLocation = function() {
              ${userLocation ? `map.setView([${userLocation.latitude}, ${userLocation.longitude}], 15);` : ''}
            };
            
            // Function to toggle directions
            window.toggleDirections = function(show, userLat, userLng, destLat, destLng) {
              console.log('toggleDirections called:', show, userLat, userLng, destLat, destLng);
              
              if (routingControl) {
                map.removeControl(routingControl);
                routingControl = null;
              }
              
              if (show) {
                console.log('Setting up directions from:', userLat, userLng, 'to:', destLat, destLng);
                const userLocation = L.latLng(userLat, userLng);
                const destLocation = L.latLng(destLat, destLng);
                
                try {
                  // Calculate straight-line distance
                  const distanceMeters = userLocation.distanceTo(destLocation);
                  const distanceKm = (distanceMeters / 1000).toFixed(2);
                  
                  // Create the routing control with explicit OSRM router
                  routingControl = L.Routing.control({
                    waypoints: [userLocation, destLocation],
                    // Use the OSRM demo server
                    router: new L.Routing.OSRMv1({
                      serviceUrl: 'https://router.project-osrm.org/route/v1',
                      profile: 'driving'
                    }),
                    routeWhileDragging: false,
                    showAlternatives: true,
                    altLineOptions: {
                      styles: [
                        {color: '#4882ca', opacity: 0.8, weight: 5},
                        {color: '#7ea4d6', opacity: 0.8, weight: 5}
                      ]
                    },
                    lineOptions: {
                      styles: [{color: '#0066FF', opacity: 0.8, weight: 6}],
                      addWaypoints: false,
                      extendToWaypoints: true,
                      missingRouteTolerance: 0
                    },
                    show: false,
                    collapsible: true,
                    fitSelectedRoutes: true
                  }).addTo(map);
                  
                  // Add route summary to destination popup when routes are found
                  routingControl.on('routesfound', function(e) {
                    console.log('Routes found:', e.routes);
                    const routes = e.routes;
                    if (routes && routes.length > 0) {
                      const summary = routes[0].summary;
                      const routeDistance = (summary.totalDistance / 1000).toFixed(2); // km
                      const time = Math.round(summary.totalTime / 60); // minutes
                      
                      if (destinationMarker) {
                        destinationMarker.bindPopup(
                          '<div><b>Selected Destination</b><br>' +
                          'Route distance: ' + routeDistance + ' km<br>' +
                          'Est. Time: ' + time + ' minutes</div>'
                        ).openPopup();
                      }
                    }
                  });
                  
                  // Listen for routing errors
                  routingControl.on('routingerror', function(e) {
                    console.error('Routing error:', e);
                    // Show straight-line distance as fallback
                    if (destinationMarker) {
                      destinationMarker.bindPopup(
                        '<div><b>Selected Destination</b><br>' +
                        'Straight-line distance: ' + distanceKm + ' km<br>' +
                        '<span style="color: red">Road routing unavailable</span></div>'
                      ).openPopup();
                    }
                  });
                  
                  // Fit the map to show the entire route area
                  setTimeout(() => {
                    map.fitBounds(L.latLngBounds([userLocation, destLocation]).pad(0.5));
                  }, 1000);
                } catch (error) {
                  console.error('Routing initialization error:', error);
                  
                  // Show an error message if routing initialization fails
                  if (destinationMarker) {
                    const distanceMeters = userLocation.distanceTo(destLocation);
                    const distanceKm = (distanceMeters / 1000).toFixed(2);
                    
                    destinationMarker.bindPopup(
                      '<div><b>Selected Destination</b><br>' +
                      'Straight-line distance: ' + distanceKm + ' km<br>' +
                      '<span style="color: red">Routing unavailable</span></div>'
                    ).openPopup();
                  }
                }
              }
            };
            
            // Function to update rated locations on the map
            window.updateRatedLocations = function(locations) {
              console.log('Updating rated locations:', locations.length);
              addRatedLocationMarkers(locations);
            };
            
            // Function to handle messages from React Native
            window.addEventListener('message', function(event) {
              try {
                const data = JSON.parse(event.data);
                console.log('Message received from React Native:', data.type);
                
                if (data.type === 'updateLocation') {
                  window.updateUserLocation(data.latitude, data.longitude);
                } else if (data.type === 'goToUserLocation') {
                  window.goToUserLocation();
                } else if (data.type === 'toggleDirections') {
                  if (data.show && data.userLocation && data.destination) {
                    window.toggleDirections(
                      true,
                      data.userLocation.latitude,
                      data.userLocation.longitude,
                      data.destination.latitude,
                      data.destination.longitude
                    );
                  } else {
                    window.toggleDirections(false);
                  }
                } else if (data.type === 'updateRatedLocations') {
                  window.updateRatedLocations(data.locations);
                }
              } catch (e) {
                console.error('Error processing message:', e);
              }
            });
          </script>
        </body>
      </html>
    `;
  };

  // Function to center map on user's location
  const goToUserLocation = () => {
    if (userLocation && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'goToUserLocation'
      }));
    }
  };

  // Function to update user location in the map
  useEffect(() => {
    if (userLocation && webViewRef.current && !loading) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'updateLocation',
        latitude: userLocation.latitude,
        longitude: userLocation.longitude
      }));
    }
  }, [userLocation, loading]);

  // Refresh rated locations periodically
  useEffect(() => {
    const fetchRatedLocations = async () => {
      try {
        const locations = await locationsAPI.getLocations();
        // Filter locations that have ratings
        const rated = locations.filter(location => 
          location.average_rating !== undefined && 
          location.average_rating > 0
        );
        setRatedLocations(rated);
        console.log(`Refreshed ${rated.length} rated locations`);
      } catch (error) {
        console.error('Failed to refresh rated locations:', error);
      }
    };

    // Initial fetch
    if (!loading) {
      fetchRatedLocations();
    }

    // Set up interval for refreshing (every 5 minutes)
    const intervalId = setInterval(fetchRatedLocations, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [loading]);

  return (
    <ThemedView style={styles.container}>
      <TopNavBar />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : (
        <>
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: generateMapHTML() }}
            style={styles.map}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            onMessage={handleWebViewMessage}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
              </View>
            )}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView error:', nativeEvent);
              Alert.alert(
                'Map Error',
                'Failed to load the map. Please check your internet connection.',
                [{ text: 'OK' }]
              );
            }}
          />
          
          {isRoutingAvailable && (
            <TouchableOpacity 
              style={styles.directionsButton} 
              onPress={toggleDirections}
            >
              <FontAwesome name="road" size={20} color="white" />
              <Text style={styles.directionsButtonText}>
                {showDirections ? 'Hide Directions' : 'Show Directions'}
              </Text>
            </TouchableOpacity>
          )}
          
          {selectedDestination && isLoggedIn && (
            <TouchableOpacity 
              style={styles.rateButton} 
              onPress={() => {
                router.push({
                  pathname: '/location-detail',
                  params: {
                    lat: selectedDestination.latitude.toString(),
                    lng: selectedDestination.longitude.toString(),
                    name: selectedDestination.name || 'Selected Location'
                  }
                });
              }}
            >
              <FontAwesome name="star" size={20} color="white" />
              <Text style={styles.buttonText}>Rate & Details</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.myLocationButton} 
            onPress={goToUserLocation}
          >
            <FontAwesome name="location-arrow" size={20} color="white" />
          </TouchableOpacity>
          
          <View style={styles.legendContainer}>
            <Text style={styles.legendTitle}>Map Legend</Text>
            <View style={styles.legendItem}>
              <View style={[styles.legendCircle, {backgroundColor: '#2ecc71'}]} />
              <Text style={styles.legendText}>Excellent (4.5+)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendCircle, {backgroundColor: '#f39c12'}]} />
              <Text style={styles.legendText}>Good (3.5-4.4)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendCircle, {backgroundColor: '#e67e22'}]} />
              <Text style={styles.legendText}>Average (2.5-3.4)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendCircle, {backgroundColor: '#c0392b'}]} />
              <Text style={styles.legendText}>Poor (Below 2.5)</Text>
            </View>
          </View>
        </>
      )}
      
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: Dimensions.get('window').height - 80,
  },
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
  rateButton: {
    position: 'absolute',
    top: 150,
    right: 10,
    backgroundColor: '#FFC107',
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
  buttonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: 'bold',
  },
  myLocationButton: {
    position: 'absolute',
    bottom: 20,
    right: 10,
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  legendContainer: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  legendTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
    fontSize: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  legendCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
    borderWidth: 1,
    borderColor: '#fff',
  },
  legendText: {
    fontSize: 10,
  }
});

