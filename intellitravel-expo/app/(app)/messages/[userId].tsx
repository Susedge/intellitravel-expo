import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { chatAPI } from '@/services/api';
import { useLocalSearchParams, router } from 'expo-router';

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  created_at: string;
  read: boolean;
}

interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  last_seen?: string;
}

export default function MessageScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const userId = parseInt(params.userId as string);
  
  const [recipient, setRecipient] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  
  useEffect(() => {
    fetchUserDetails();
    fetchMessages();
    
    // Set up polling for new messages
    const interval = setInterval(fetchMessages, 5000);
    
    return () => clearInterval(interval);
  }, [userId]);
  
  const fetchUserDetails = async () => {
    try {
      const response = await chatAPI.getUserDetails(userId);
      setRecipient(response.user);
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };
  
  const fetchMessages = async () => {
    try {
      const response = await chatAPI.getMessages(userId);
      setMessages(response.messages);
      setLoading(false);
      
      // Mark messages as read - add type annotation to 'm'
      if (response.messages.some((m: Message) => !m.read && m.sender_id === userId)) {
        chatAPI.markAsRead(userId);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
    }
  };
  
  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      setSending(true);
      await chatAPI.sendMessage(userId, newMessage);
      setNewMessage('');
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };
  
const renderMessageItem = ({ item, index }: { item: Message, index: number }) => {
    const isCurrentUser = item.sender_id === user?.id;
    const showDate = index === 0 || 
      formatDate(messages[index - 1].created_at) !== formatDate(item.created_at);
    
    return (
      <>
        {showDate && (
          <ThemedView style={styles.dateContainer}>
            <ThemedText style={styles.dateText}>{formatDate(item.created_at)}</ThemedText>
          </ThemedView>
        )}
        <ThemedView 
          style={[
            styles.messageContainer,
            isCurrentUser ? styles.sentMessage : styles.receivedMessage
          ]}
        >
          <ThemedText 
            style={[
              styles.messageText,
              isCurrentUser ? styles.sentMessageText : styles.receivedMessageText
            ]}
          >
            {item.content}
          </ThemedText>
          <ThemedText style={styles.timeText}>{formatTime(item.created_at)}</ThemedText>
          {isCurrentUser && (
            <Ionicons 
              name={item.read ? "checkmark-done" : "checkmark"} 
              size={16} 
              color={item.read ? "#3498db" : "#999"} 
              style={styles.readStatus}
            />
          )}
        </ThemedView>
      </>
    );
  };
  
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={90}
    >
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#3498db" />
        </TouchableOpacity>
        {recipient ? (
          <ThemedView style={styles.headerInfo}>
            <ThemedText type="subtitle" style={styles.headerName}>{recipient.name}</ThemedText>
            <ThemedText style={styles.headerStatus}>
              {recipient.last_seen ? `Last seen ${formatTime(recipient.last_seen)}` : 'Offline'}
            </ThemedText>
          </ThemedView>
        ) : (
          <ThemedView style={styles.headerInfo}>
            <ThemedText type="subtitle">Loading...</ThemedText>
          </ThemedView>
        )}
      </ThemedView>
      
      {loading ? (
        <ActivityIndicator size="large" color="#3498db" style={styles.loader} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messagesList}
          inverted={messages.length > 0}
          ListEmptyComponent={
            <ThemedView style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>
                No messages yet. Start the conversation!
              </ThemedText>
            </ThemedView>
          }
        />
      )}
      
      <ThemedView style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          placeholderTextColor="#999"
        />
        <TouchableOpacity 
          style={[styles.sendButton, !newMessage.trim() && styles.disabledButton]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: 50,
  },
  backButton: {
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
  },
  headerStatus: {
    fontSize: 12,
    color: '#999',
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 16,
    position: 'relative',
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#3498db',
    borderBottomRightRadius: 4,
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  sentMessageText: {
    color: '#fff',
  },
  receivedMessageText: {
    color: '#333',
  },
  timeText: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 2,
    color: 'rgba(255,255,255,0.7)',
  },
  readStatus: {
    position: 'absolute',
    bottom: 6,
    right: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#3498db',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
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
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
