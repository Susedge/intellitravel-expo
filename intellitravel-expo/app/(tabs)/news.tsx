import React from 'react';
import { StyleSheet, ScrollView, Image, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/context/AuthContext';
import { FloatingAuthButton } from '@/components/FloatingAuthButton';
import { TopNavBar } from '@/components/TopNavBar';

// Type definitions
interface BasePlace {
  id: number;
  name: string;
  location: string;
  image: string;
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
    image: 'https://1.bp.blogspot.com/-JLxF9vaJYPc/XTrDI3RFPTI/AAAAAAAAdCM/ZCxRRps9WpQeOKFpi40mIr19_hwBzNQ5QCLcBGAs/s1600/DSC_0720.JPG',
    description: 'Historic church built in the Spanish colonial era, featuring beautiful architecture.',
    rating: 4.7,
  },
  {
    id: 2,
    name: 'Camiling Public Market',
    location: 'Camiling, Tarlac',
    image: 'https://i0.wp.com/www.vigattintourism.com/tourism/sites/default/files/images/P01_5.jpg',
    description: 'Experience local culture and fresh produce at this vibrant market.',
    rating: 4.3,
  },
  {
    id: 3,
    name: 'Camiling River',
    location: 'Camiling, Tarlac',
    image: 'https://fastly.4sqi.net/img/general/600x600/62454978_o4Z9YJlO5DmUsoiPodKTbAGDLxP4XE9gS_Yh5LPnUF0.jpg',
    description: 'Scenic river perfect for relaxation and picnics with family and friends.',
    rating: 4.5,
  },
];

const mostVisitedPlaces = [
  {
    id: 4,
    name: 'Isdaan Floating Restaurant',
    location: 'Gerona, Tarlac',
    image: 'https://media-cdn.tripadvisor.com/media/photo-s/10/71/ab/aa/isdaan-floating-restaurant.jpg',
    visits: 15420,
    rating: 4.6,
  },
  {
    id: 5,
    name: 'Monasterio de Tarlac',
    location: 'San Jose, Tarlac',
    image: 'https://i0.wp.com/www.vigattintourism.com/tourism/sites/default/files/images/IMG_6972.JPG',
    visits: 12300,
    rating: 4.8,
  },
  {
    id: 6,
    name: 'Tarlac Recreational Park',
    location: 'Tarlac City',
    image: 'https://i0.wp.com/www.vigattintourism.com/tourism/sites/default/files/images/DSC_0157_0.jpg',
    visits: 10800,
    rating: 4.4,
  },
];

const highRatedPlaces = [
  {
    id: 7,
    name: 'Kart City Tarlac',
    location: 'Tarlac City',
    image: 'https://photos.wikimapia.org/p/00/03/56/10/85_big.jpg',
    rating: 4.9,
  },
  {
    id: 8,
    name: 'Aqua Planet',
    location: 'Clark, Pampanga',
    image: 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/14/72/3c/be/aqua-planet.jpg?w=1200&h=-1&s=1',
    rating: 4.8,
  },
  {
    id: 9,
    name: 'Luisita Golf & Country Club',
    location: 'Tarlac City',
    image: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/244935291.jpg?k=4e0d86f7f5cd18f9c3c6c67328228a650b1d9055032af2e6c8a6953b9c7c9848&o=&hp=1',
    rating: 4.7,
  },
];

// Place card component

interface PlaceCardProps {
  place: Place;
  showVisits?: boolean;
}

// Place card component
interface PlaceCardProps {
  place: Place;
  showVisits?: boolean;
}

const PlaceCard = ({ place, showVisits = false }: PlaceCardProps) => (
  <TouchableOpacity style={styles.card}>
    <Image source={{ uri: place.image }} style={styles.cardImage} />
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
  const { isLoggedIn } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <TopNavBar />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.tabContent}>
          <ThemedText type="title" style={styles.tabTitle}>Travel News</ThemedText>
          <ThemedText type="default" style={styles.tabText}>
            Stay updated with the latest travel news and recommendations.
          </ThemedText>
          
          {isLoggedIn ? (
            <>
              <Section 
                title="Recommendations in Camiling" 
                data={recommendedPlaces} 
              />
              <Section 
                title="Most Visited Places" 
                data={mostVisitedPlaces} 
                showVisits={true} 
              />
              <Section 
                title="Highest Rated Destinations" 
                data={highRatedPlaces} 
              />
            </>
          ) : (
            <View style={styles.contentContainer}>
              <ThemedText type="default" style={styles.loginPrompt}>
                Log in to see personalized travel recommendations
              </ThemedText>
              <FloatingAuthButton />
            </View>
          )}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  tabContent: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
  },
  tabTitle: {
    fontSize: 28,
    marginBottom: 20,
  },
  tabText: {
    textAlign: 'center',
    marginBottom: 30,
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    width: '100%',
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    marginLeft: 5,
  },
  sectionContent: {
    paddingRight: 20,
  },
  card: {
    width: 250,
    borderRadius: 12,
    marginLeft: 15,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardLocation: {
    color: '#666',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cardRating: {
    color: '#f1c40f',
    fontWeight: 'bold',
  },
  cardVisits: {
    color: '#3498db',
  },
  loginPrompt: {
    textAlign: 'center',
    marginBottom: 20,
  }
});
