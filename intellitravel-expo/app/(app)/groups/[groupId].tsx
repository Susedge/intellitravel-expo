import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, FlatList, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView, Image } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { chatAPI, GroupChat, Message, User } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function GroupChatScreen() {
  const { groupId } = useLocalSearchParams();
  const [group, setGroup] = useState<GroupChat | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);

  useEffect(() => {
    if (groupId) {
      loadGroup();
      loadMessages();
      loadGroupMembers();
    }
  }, [groupId]);

  const loadGroup = async () => {
    try {
      console.log(`Loading group details for ID: ${groupId}`);
      const res = await chatAPI.getGroupDetails(Number(groupId));
      console.log('Group details response:', res);
      setGroup(res);
    } catch (e) {
      console.error('Error loading group:', e);
    }
  };

  const loadMessages = async () => {
    try {
      console.log(`Loading messages for group ID: ${groupId}`);
      const res = await chatAPI.getGroupMessages(Number(groupId));
      console.log('Group messages response:', res);
      
      // Handle different response formats
      const messageArray = res.messages || res || [];
      console.log('Message array to be set:', messageArray);
      setMessages(messageArray);
    } catch (e) {
      console.error('Error loading messages:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupMembers = async () => {
    try {
      if (!groupId) return;
      const res = await chatAPI.getGroupMembers(Number(groupId));
      const members = res.members || [];
      setGroupMembers(members.map((member: any) => member.user));
    } catch (e) {
      console.error('Error loading group members:', e);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setUsers([]);
      return;
    }
    
    try {
      setSearchLoading(true);
      const response = await chatAPI.searchUsers(query);
      // Filter out users who are already members
      const memberIds = groupMembers.map(member => member.id);
      const filteredUsers = response.users.filter((user: User) => !memberIds.includes(user.id));
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    searchUsers(text);
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !groupId) return;
    
    try {
      await chatAPI.sendGroupMessage(Number(groupId), messageText);
      setMessageText('');
      loadMessages(); // Reload messages after sending
    } catch (e) {
      console.error('Error sending message:', e);
    }
  };

  const addMember = async (userId: number) => {
    try {
      await chatAPI.addGroupMember(Number(groupId), userId);
      // Refresh member list and group details
      loadGroupMembers();
      loadGroup();
      // Close the modal and reset search
      setShowAddMembers(false);
      setSearchQuery('');
      setUsers([]);
    } catch (e) {
      console.error('Error adding member:', e);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => addMember(item.id)}
    >
      <View style={styles.avatarContainer}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.userDetails}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <ActivityIndicator size="large" style={{marginTop: 20}} />;

  if (!group) return <Text style={{padding: 20}}>Group not found.</Text>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.memberCount}>{group.members_count || 0} members</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => setShowAddMembers(true)}
        >
          <Ionicons name="person-add" size={24} color="#3498db" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={messages}
        keyExtractor={item => item.id?.toString() || Math.random().toString()}
        renderItem={({ item }) => (
          <View style={styles.messageContainer}>
            <Text style={styles.senderName}>{item.user?.name || `User ${item.user_id}`}</Text>
            <Text style={styles.messageContent}>{item.content}</Text>
            <Text style={styles.timestamp}>{new Date(item.created_at).toLocaleTimeString()}</Text>
          </View>
        )}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>
          </View>
        }
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a message..."
          multiline
        />
        <TouchableOpacity 
          style={styles.sendButton} 
          onPress={sendMessage}
          disabled={!messageText.trim()}
        >
          <Ionicons name="send" size={24} color={messageText.trim() ? "#3498db" : "#ccc"} />
        </TouchableOpacity>
      </View>

      {/* Add Members Modal */}
      <Modal
        visible={showAddMembers}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddMembers(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <ThemedView style={styles.modalContent}>
            <ThemedView style={styles.modalHeader}>
              <ThemedText type="title">Add Members</ThemedText>
              <TouchableOpacity onPress={() => setShowAddMembers(false)}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </ThemedView>
            
            <ThemedView style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search users to add..."
                value={searchQuery}
                onChangeText={handleSearchChange}
                placeholderTextColor="#999"
              />
            </ThemedView>
            
            {searchLoading ? (
              <ActivityIndicator size="large" color="#3498db" style={styles.loader} />
            ) : (
              <FlatList
                data={users}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderUserItem}
                style={styles.usersList}
                ListEmptyComponent={
                  <ThemedView style={styles.emptyContainer}>
                    <ThemedText style={styles.emptyText}>
                      {searchQuery.length > 0 
                        ? "No users found. Try a different search term." 
                        : "Type to search for users to add"}
                    </ThemedText>
                  </ThemedView>
                }
              />
            )}
          </ThemedView>
        </ThemedView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  groupName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  memberCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  addButton: {
    padding: 8,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  senderName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  messageContent: {
    fontSize: 16,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    alignSelf: 'flex-end',
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
  },
  sendButton: {
    marginLeft: 12,
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 10,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  usersList: {
    maxHeight: 300,
  },
  userItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
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
  userDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  loader: {
    padding: 20,
  },
});
