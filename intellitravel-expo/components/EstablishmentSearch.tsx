import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, ActivityIndicator, FlatList } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Establishment } from '@/services/api';
import EstablishmentService from '@/services/EstablishmentService';

interface EstablishmentSearchProps {
  userLocation: { latitude: number, longitude: number } | null;
  onSelectEstablishment: (establishment: Establishment) => void;
}

const EstablishmentSearch: React.FC<EstablishmentSearchProps> = ({ userLocation, onSelectEstablishment }) => {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Establishment[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async () => {
    if (!userLocation) {
      return; // Can't search without location
    }

    try {
      setLoading(true);
      setShowResults(true);
      
      const searchParams = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        radius: 5000, // 5km radius
        keyword: keyword,
        limit: 20
      };
      
      const establishments = await EstablishmentService.searchEstablishments(searchParams);
      setResults(establishments);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: Establishment) => {
    onSelectEstablishment(item);
    setShowResults(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Search places, restaurants, hotels..."
          value={keyword}
          onChangeText={setKeyword}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
          <FontAwesome name="search" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      {showResults && (
        <View style={styles.resultsContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#0066ff" style={styles.loader} />
          ) : (
            results.length === 0 ? (
              <Text style={styles.noResults}>No places found</Text>
            ) : (
              <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.resultItem}
                    onPress={() => handleSelect(item)}
                  >
                    <Text style={styles.resultName}>{item.name}</Text>
                    <Text style={styles.resultType}>{item.type}</Text>
                    {item.distance && (
                      <Text style={styles.resultDistance}>
                        {(item.distance / 1000).toFixed(2)} km away
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            )
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    zIndex: 999,
  },
  searchBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 5,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  input: {
    flex: 1,
    padding: 8,
    fontSize: 16,
  },
  searchButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsContainer: {
    marginTop: 5,
    backgroundColor: 'white',
    borderRadius: 5,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  loader: {
    padding: 20,
  },
  noResults: {
    padding: 15,
    textAlign: 'center',
    color: '#666',
  },
  resultItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultType: {
    fontSize: 14,
    color: '#666',
    marginTop: 3,
  },
  resultDistance: {
    fontSize: 12,
    color: '#0066ff',
    marginTop: 3,
  },
});

export default EstablishmentSearch;