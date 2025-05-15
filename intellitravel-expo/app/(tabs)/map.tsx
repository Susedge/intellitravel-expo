import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Alert, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

export default function MapScreen() {
  const webViewRef = useRef<WebView>(null);
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [locationErrorMsg, setLocationErrorMsg] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Load HTML file
  useEffect(() => {
    async function loadHtmlFile() {
      try {
        setIsLoading(true);
        
        // This approach uses the asset system to load the HTML file
        const htmlAsset = Asset.fromModule(require('../../assets/map.html'));
        await htmlAsset.downloadAsync();
        
        if (htmlAsset.localUri) {
          const fileContents = await FileSystem.readAsStringAsync(htmlAsset.localUri);
          setHtmlContent(fileContents);
        } else {
          throw new Error('Could not resolve local URI for HTML asset');
        }
      } catch (error) {
        console.error('Failed to load HTML file:', error);
        Alert.alert('Error', 'Failed to load map. Please restart the app.');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadHtmlFile();
  }, []);

  // Request and get location
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationErrorMsg('Permission to access location was denied');
          return;
        }

        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        
        setLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        
        // Send location to WebView (only if WebView is ready)
        if (webViewRef.current && !isLoading) {
          const locationData = {
            type: 'currentLocation',
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          };
          webViewRef.current.injectJavaScript(
            `(function() {
              window.userLocation = ${JSON.stringify(locationData)};
              if (typeof handleNativeLocation === 'function') {
                handleNativeLocation(${JSON.stringify(locationData)});
              }
              true;
            })();`
          );
        }
      } catch (error) {
        console.error('Error getting location:', error);
        setLocationErrorMsg('Error getting location');
      }
    })();
  }, [isLoading]);

  // Handle messages
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'openLocationDetail') {
        // Navigate to location detail screen with parameters
        router.push({
          pathname: '/location-detail',
          params: {
            lat: data.latitude,
            lng: data.longitude,
            name: data.name || 'Location Details'
          }
        });
      } else if (data.type === 'requestLocation') {
        // Handle location request from WebView
        getLocationForWebView(data.purpose || 'general');
      } else if (data.type === 'mapReady') {
        // Map is ready, we can now send location if we have it
        if (location) {
          getLocationForWebView('initial');
        }
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  // Get location and pass to WebView
  const getLocationForWebView = async (purpose: string) => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        sendLocationErrorToWebView('Permission to access location was denied', purpose);
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      
      // Send location to WebView
      if (webViewRef.current) {
        const locationData = {
          type: 'locationResult',
          purpose: purpose,
          success: true,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        };
        
        const jsCode = `
          window.receiveLocationFromApp(${JSON.stringify(locationData)});
          true;
        `;
        
        webViewRef.current.injectJavaScript(jsCode);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      sendLocationErrorToWebView('Failed to get location', purpose);
    }
  };

  // Send error to WebView
  const sendLocationErrorToWebView = (errorMsg: string, purpose: string) => {
    if (webViewRef.current) {
      const errorData = {
        type: 'locationResult',
        purpose: purpose,
        success: false,
        error: errorMsg
      };
      
      const jsCode = `
        window.receiveLocationFromApp(${JSON.stringify(errorData)});
        true;
      `;
      
      webViewRef.current.injectJavaScript(jsCode);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        onMessage={handleWebViewMessage}
        geolocationEnabled={true}
        mixedContentMode="always"
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  webview: { 
    flex: 1 
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center'
  }
});
