import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, View, Image } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/context/AuthContext';
import { FloatingAuthButton } from '@/components/FloatingAuthButton';
import { Ionicons } from '@expo/vector-icons';
import { chatAPI } from '@/services/api';
import { router } from 'expo-router';
import { TopNavBar } from '@/components/TopNavBar';

// Interface definitions
interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  last_seen?: string;
}

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  created_at: string;
  read: boolean;
}

interface Conversation {
  id: number;
  user: User;
  last_message?: Message;
  unread_count: number;
}

export default function ChatScreen() {
  const { isLoggedIn, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      fetchConversations();
    }
  }, [isLoggedIn]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getConversations();
      setConversations(response.conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setUsers([]);
      return;
    }
    
    try {
      setLoading(true);
      const response = await chatAPI.searchUsers(query);
      setUsers(response.users);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    searchUsers(text);
  };

  const startConversation = (userId: number) => {
    router.push({
      pathname: "/(app)/messages/[userId]",
      params: { userId: userId.toString() }
    });
  };

  const openConversation = (conversationId: number, userId: number) => {
    router.push({
      pathname: "/(app)/messages/[userId]",
      params: { userId: userId.toString() }
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity 
      style={styles.conversationItem}
      onPress={() => openConversation(item.id, item.user.id)}
    >
      <View style={styles.avatarContainer}>
        {item.user.avatar ? (
          <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <ThemedText>{item.user.name.charAt(0).toUpperCase()}</ThemedText>
          </View>
        )}
        {item.unread_count > 0 && (
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>{item.unread_count}</ThemedText>
          </View>
        )}
      </View>
      <ThemedView style={styles.conversationDetails}>
        <ThemedView style={styles.conversationHeader}>
          <ThemedText type="subtitle" numberOfLines={1}>{item.user.name}</ThemedText>
          {item.last_message && (
            <ThemedText style={styles.timeText}>{formatTime(item.last_message.created_at)}</ThemedText>
          )}
        </ThemedView>
        {item.last_message && (
          <ThemedText 
            numberOfLines={1} 
            style={[styles.messagePreview, item.unread_count > 0 && styles.unreadMessage]}
          >
            {item.last_message.content}
          </ThemedText>
        )}
      </ThemedView>
    </TouchableOpacity>
  );

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => startConversation(item.id)}
    >
      <View style={styles.avatarContainer}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <ThemedText>{item.name.charAt(0).toUpperCase()}</ThemedText>
          </View>
        )}
      </View>
      <ThemedView style={styles.userDetails}>
        <ThemedText type="subtitle">{item.name}</ThemedText>
        <ThemedText style={styles.emailText}>{item.email}</ThemedText>
      </ThemedView>
    </TouchableOpacity>
  );

  if (!isLoggedIn) {
    return (
      <ThemedView style={styles.container}>
        <TopNavBar />
        <ThemedView style={styles.tabContent}>
          <ThemedText type="title" style={styles.tabTitle}>Travel Assistant</ThemedText>
          <ThemedText type="default" style={styles.tabText}>
            Chat with other travelers and share your experiences.
          </ThemedText>
          <FloatingAuthButton />
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <TopNavBar />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ThemedView style={styles.tabContent}>
          <ThemedView style={styles.header}>
            <ThemedText type="title" style={styles.tabTitle}>Messages</ThemedText>
            <TouchableOpacity 
              style={styles.newChatButton}
              onPress={() => setShowUserSearch(!showUserSearch)}
            >
              <Ionicons 
                name={showUserSearch ? "close" : "create-outline"} 
                size={24} 
                color="#3498db" 
              />
            </TouchableOpacity>
          </ThemedView>

          <ThemedView style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={showUserSearch ? "Search users..." : "Search conversations..."}
              value={searchQuery}
              onChangeText={handleSearchChange}
              placeholderTextColor="#999"
            />
          </ThemedView>

          {loading ? (
            <ActivityIndicator size="large" color="#3498db" style={styles.loader} />
          ) : showUserSearch ? (
            <FlatList
              data={users}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderUserItem}
              ListEmptyComponent={
                <ThemedView style={styles.emptyContainer}>
                  <ThemedText style={styles.emptyText}>
                    {searchQuery.length > 0 
                      ? "No users found. Try a different search term." 
                      : "Type to search for users"}
                  </ThemedText>
                </ThemedView>
              }
            />
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderConversationItem}
              ListEmptyComponent={
                <ThemedView style={styles.emptyContainer}>
                  <ThemedText style={styles.emptyText}>
                    No conversations yet. Start chatting with other travelers!
                  </ThemedText>
                  <TouchableOpacity 
                    style={styles.startChatButton}
                    onPress={() => setShowUserSearch(true)}
                  >
                    <ThemedText style={styles.startChatButtonText}>Find Users</ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              }
            />
          )}
        </ThemedView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tabTitle: {
    fontSize: 28,
  },
  tabText: {
    textAlign: 'center',
    marginBottom: 30,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  newChatButton: {
    padding: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    right: -5,
    top: -5,
    backgroundColor: '#3498db',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  conversationDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  messagePreview: {
    color: '#666',
    fontSize: 14,
  },
  unreadMessage: {
    fontWeight: 'bold',
    color: '#333',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  emailText: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginBottom: 20,
  },
  startChatButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  startChatButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
