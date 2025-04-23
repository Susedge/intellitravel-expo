import React, { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, ActivityIndicator, Platform, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/context/AuthContext';
import { FloatingAuthButton } from '@/components/FloatingAuthButton';
import { TopNavBar } from '@/components/TopNavBar';
import { FontAwesome } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { locationsAPI } from '@/services/api';

// Type definitions
interface BasePlace {
  id: number;
  name: string;
  location: string;
  rating: number;
}

interface RecommendedPlace extends BasePlace {
  description: string;
}

interface VisitedPlace extends BasePlace {
  visits: number;
}

type Place = BasePlace | RecommendedPlace | VisitedPlace;

// Hardcoded data for places
const recommendedPlaces = [
  {
    id: 1,
    name: 'Camiling Church',
    location: 'Camiling, Tarlac',
    description: 'Historic church built in the Spanish colonial era, featuring beautiful architecture.',
    rating: 4.7,
  },
  {
    id: 2,
    name: 'Camiling Public Market',
    location: 'Camiling, Tarlac',
    description: 'Experience local culture and fresh produce at this vibrant market.',
    rating: 4.3,
  },
  {
    id: 3,
    name: 'Camiling River',
    location: 'Camiling, Tarlac',
    description: 'Scenic river perfect for relaxation and picnics with family and friends.',
    rating: 4.5,
  },
];

const mostVisitedPlaces = [
  {
    id: 4,
    name: 'Isdaan Floating Restaurant',
    location: 'Gerona, Tarlac',
    visits: 15420,
    rating: 4.6,
  },
  {
    id: 5,
    name: 'Monasterio de Tarlac',
    location: 'San Jose, Tarlac',
    visits: 12300,
    rating: 4.8,
  },
  {
    id: 6,
    name: 'Tarlac Recreational Park',
    location: 'Tarlac City',
    visits: 10800,
    rating: 4.4,
  },
];

const highRatedPlaces = [
  {
    id: 7,
    name: 'Kart City Tarlac',
    location: 'Tarlac City',
    rating: 4.9,
  },
  {
    id: 8,
    name: 'Aqua Planet',
    location: 'Clark, Pampanga',
    rating: 4.8,
  },
  {
    id: 9,
    name: 'Luisita Golf & Country Club',
    location: 'Tarlac City',
    rating: 4.7,
  },
];

// Simplified Place card component - no images
interface PlaceCardProps {
  place: Place;
  showVisits?: boolean;
}

const PlaceCard = ({ place, showVisits = false }: PlaceCardProps) => (
  <TouchableOpacity style={styles.card}>
    <View style={styles.cardContent}>
      <ThemedText type="subtitle" style={styles.cardTitle}>{place.name}</ThemedText>
      <ThemedText type="default" style={styles.cardLocation}>{place.location}</ThemedText>
      <View style={styles.cardFooter}>
        <ThemedText type="default" style={styles.cardRating}>★ {place.rating}</ThemedText>
        {showVisits && 'visits' in place && (
          <ThemedText type="default" style={styles.cardVisits}>{place.visits.toLocaleString()} visitors</ThemedText>
        )}
      </View>
    </View>
  </TouchableOpacity>
);

// Section component
interface SectionProps {
  title: string;
  data: Place[];
  showVisits?: boolean;
}

const Section = ({ title, data, showVisits = false }: SectionProps) => (
  <View style={styles.section}>
    <ThemedText type="subtitle" style={styles.sectionTitle}>{title}</ThemedText>
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.sectionContent}
    >
      {data.map(place => (
        <PlaceCard key={place.id} place={place} showVisits={showVisits} />
      ))}
    </ScrollView>
  </View>
);

export default function NewsScreen() {
  const { isLoggedIn, user } = useAuth();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const generatePdfReport = async () => {
    if (!isLoggedIn) {
      Alert.alert('Login Required', 'Please log in to generate reports');
      return;
    }

    try {
      setIsGeneratingPdf(true);
      
      // Fetch locations data from API
      let visitedLocations: Array<{
        name: string;
        latitude: number;
        longitude: number;
        visit_count?: number;
        average_rating?: number;
      }> = [];
      
      let userVisitHistory: Array<{
        name: string;
        date: string;
        type: string;
      }> = [];
      
      try {
        // Get all locations
        const locations = await locationsAPI.getLocations();
        
        // Sort by visit count if available
        visitedLocations = locations
          .filter(loc => loc.visit_count && loc.visit_count > 0)
          .sort((a, b) => (b.visit_count || 0) - (a.visit_count || 0))
          .slice(0, 10); // Top 10 visited places
          
        // Get user visit history if available - this may need to be implemented in the API
        if (user && user.id) {
          // This is a placeholder - you'd need to implement this endpoint
          try {
            // const userHistory = await locationsAPI.getUserVisitHistory(user.id);
            // userVisitHistory = userHistory.data;
            
            // Simulated data
            userVisitHistory = [
              { name: 'Camiling Church', date: '2023-12-15', type: 'visited' },
              { name: 'Tarlac Recreational Park', date: '2023-11-22', type: 'selected' },
              { name: 'Isdaan Floating Restaurant', date: '2023-10-05', type: 'viewed' }
            ];
          } catch (e) {
            console.error('Error fetching user history:', e);
          }
        }
      } catch (error) {
        console.error('Error fetching locations data:', error);
      }
      
      // Create HTML for the PDF report
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Helvetica, Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
              h1 { color: #2196F3; text-align: center; margin-bottom: 20px; }
              h2 { color: #0D47A1; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 30px; }
              .report-header { text-align: center; margin-bottom: 30px; }
              .user-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
              .stat-card { background: #f9f9f9; border-radius: 5px; padding: 15px; margin-bottom: 15px; }
              .stat-value { font-size: 24px; font-weight: bold; color: #2196F3; text-align: center; }
              .stat-label { text-align: center; color: #666; font-size: 14px; }
              .stat-grid { display: flex; justify-content: space-between; }
              .stat-column { width: 48%; }
            </style>
          </head>
          <body>
            <div class="report-header">
              <h1>IntelliTravel Visit Report</h1>
              <p>Generated on ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div class="user-info">
              <h2>User Information</h2>
              <p><strong>Name:</strong> ${user?.name || 'N/A'}</p>
              <p><strong>Email:</strong> ${user?.email || 'N/A'}</p>
              <p><strong>Member Since:</strong> ${user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
            </div>
            
            <h2>Most Visited Places</h2>
            ${visitedLocations.length > 0 ? `
            <table>
              <tr>
                <th>Name</th>
                <th>Location</th>
                <th>Visit Count</th>
                <th>Rating</th>
              </tr>
              ${visitedLocations.map(place => `
                <tr>
                  <td>${place.name}</td>
                  <td>${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}</td>
                  <td>${place.visit_count || 0}</td>
                  <td>${place.average_rating ? place.average_rating.toFixed(1) + '/5.0' : 'N/A'}</td>
                </tr>
              `).join('')}
            </table>
            ` : '<p>No visited places data available</p>'}
            
            <div class="stat-grid">
              <div class="stat-column">
                <div class="stat-card">
                  <div class="stat-value">${visitedLocations.length}</div>
                  <div class="stat-label">Places Visited</div>
                </div>
              </div>
              <div class="stat-column">
                <div class="stat-card">
                  <div class="stat-value">
                    ${visitedLocations.length > 0 
                      ? (visitedLocations.reduce((sum, p) => sum + (p.average_rating || 0), 0) / visitedLocations.length).toFixed(1) 
                      : 'N/A'}
                  </div>
                  <div class="stat-label">Average Rating</div>
                </div>
              </div>
            </div>
            
            <h2>Your Visit History</h2>
            ${userVisitHistory.length > 0 ? `
            <table>
              <tr>
                <th>Place</th>
                <th>Date</th>
                <th>Activity Type</th>
              </tr>
              ${userVisitHistory.map(visit => `
                <tr>
                  <td>${visit.name}</td>
                  <td>${visit.date}</td>
                  <td>${visit.type.charAt(0).toUpperCase() + visit.type.slice(1)}</td>
                </tr>
              `).join('')}
            </table>
            ` : '<p>No personal visit history available</p>'}
            
            <h2>Recommended Places</h2>
            <table>
              <tr>
                <th>Name</th>
                <th>Location</th>
                <th>Rating</th>
              </tr>
              ${recommendedPlaces.map(place => `
                <tr>
                  <td>${place.name}</td>
                  <td>${place.location}</td>
                  <td>${place.rating}/5.0</td>
                </tr>
              `).join('')}
            </table>
            
            <div class="footer">
              <p>This report was generated by IntelliTravel Application</p>
              <p>© ${new Date().getFullYear()} IntelliTravel. All rights reserved.</p>
            </div>
          </body>
        </html>
      `;
      
      // Generate the PDF file
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });
      
      console.log('PDF file generated:', uri);
      
      // Share the PDF file
      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf'
        });
      } else {
        await Sharing.shareAsync(uri, {
          dialogTitle: 'View or Share Your IntelliTravel Report',
          mimeType: 'application/pdf'
        });
      }
      
      Alert.alert('Success', 'Your travel report has been generated!');
    } catch (error) {
      console.error('Error generating PDF report:', error);
      Alert.alert('Error', 'Failed to generate report. Please try again later.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };  return (
    <ThemedView style={styles.container}>
      <TopNavBar />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Section title="Recommended for You" data={recommendedPlaces} />
        <Section title="Most Visited Places" data={mostVisitedPlaces} showVisits />
        <Section title="Highest Rated Places" data={highRatedPlaces} />
      </ScrollView>
      
      {isLoggedIn && (
        <TouchableOpacity 
          style={styles.floatingReportButton}
          onPress={generatePdfReport}
          disabled={isGeneratingPdf}
        >
          {isGeneratingPdf ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <FontAwesome name="file-pdf-o" size={20} color="white" />
              <ThemedText type="default" style={styles.reportButtonText}>Print Reports</ThemedText>
            </>
          )}
        </TouchableOpacity>
      )}
      
      {!isLoggedIn && <FloatingAuthButton />}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    marginTop: 20,
    paddingBottom: 20,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
    marginBottom: 12,
  },
  sectionContent: {
    paddingHorizontal: 8,
  },
  card: {
    width: 220,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  cardLocation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  cardRating: {
    fontSize: 12,
    color: '#FFC107',
    fontWeight: 'bold',
  },
  cardVisits: {
    fontSize: 12,
    color: '#2196F3',
  },
  floatingReportButton: {
    position: 'absolute',
    right: 10,
    bottom: 20,
    backgroundColor: '#2196F3',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 999,
  },
  reportButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  }
});
