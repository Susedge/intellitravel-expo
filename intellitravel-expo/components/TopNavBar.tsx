import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Modal, Text, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export function TopNavBar() {
  const { isLoggedIn, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  const handleProfilePress = () => {
    setShowMenu(true);
  };

  const handleMenuClose = () => {
    setShowMenu(false);
  };

  const handleLogin = () => {
    setShowMenu(false);
    router.push('/(auth)/login');
  };

  const handleSignup = () => {
    setShowMenu(false);
    router.push('/(auth)/signup');
  };

  const handleLogout = async () => {
    setShowMenu(false);
    await logout();
    router.replace('/(tabs)/map');
  };

  const handleSettings = () => {
    setShowMenu(false);
    // Settings functionality will be added later
    alert('Settings feature coming soon!');
  };

  const handleProfile = () => {
    setShowMenu(false);
    router.push('/(app)/dashboard');
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.leftContainer}>
        <ThemedText type="title" style={[styles.title, { color: themeColors.tint }]}>IntelliTravel</ThemedText>
      </View>
      
      <View style={styles.rightContainer}>
        <TouchableOpacity 
          style={styles.iconButton} 
          onPress={handleSettings}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={24} color={themeColors.tint} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.iconButton} 
          onPress={handleProfilePress}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={isLoggedIn ? "person" : "person-outline"} 
            size={24} 
            color={themeColors.tint} 
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={handleMenuClose}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={handleMenuClose}
        >
          <View style={[
            styles.menuContainer, 
            { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF' }
          ]}>
            {isLoggedIn ? (
              <>
                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={handleProfile}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person" size={20} color={themeColors.tint} style={styles.menuIcon} />
                  <Text style={[styles.menuText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#333333' }]}>
                    My Profile
                  </Text>
                </TouchableOpacity>
                
                <View style={styles.menuDivider} />
                
                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={handleLogout}
                  activeOpacity={0.7}
                >
                  <Ionicons name="log-out-outline" size={20} color="#e74c3c" style={styles.menuIcon} />
                  <Text style={[styles.menuText, { color: '#e74c3c' }]}>Logout</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={handleLogin}
                  activeOpacity={0.7}
                >
                  <Ionicons name="log-in-outline" size={20} color={themeColors.tint} style={styles.menuIcon} />
                  <Text style={[styles.menuText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#333333' }]}>
                    Login
                  </Text>
                </TouchableOpacity>
                
                <View style={styles.menuDivider} />
                
                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={handleSignup}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person-add-outline" size={20} color={themeColors.tint} style={styles.menuIcon} />
                  <Text style={[styles.menuText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#333333' }]}>
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 40,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 1000,
  },
  leftContainer: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 12,
    borderRadius: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    borderRadius: 12,
    marginTop: Platform.OS === 'ios' ? 100 : StatusBar.currentHeight ? StatusBar.currentHeight + 60 : 90,
    marginRight: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8,
    minWidth: 180,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIcon: {
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    marginHorizontal: 8,
  }
});
