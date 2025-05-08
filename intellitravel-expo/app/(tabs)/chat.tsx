import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, View, Image, Modal, ScrollView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/context/AuthContext';
import { FloatingAuthButton } from '@/components/FloatingAuthButton';
import { Ionicons } from '@expo/vector-icons';
import { chatAPI, GroupChat } from '@/services/api';
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

// Translation service functions
const translateText = async (
  text: string, 
  sourceLang: string = "auto", 
  targetLang: string = "tl"
): Promise<{translatedText: string, error?: string}> => {
  try {
    const response = await fetch("https://libretranslate.de/translate", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: targetLang,
        format: "text",
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      return { translatedText: text, error: data.error };
    }
    
    return { translatedText: data.translatedText };
  } catch (error) {
    console.error('Translation error:', error);
    return { translatedText: text, error: 'Translation service unavailable' };
  }
};

const detectLanguage = async (text: string): Promise<string> => {
  try {
    const response = await fetch("https://libretranslate.de/detect", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
      }),
    });

    const data = await response.json();
    if (data && data.length > 0) {
      return data[0].language;
    }
    return "en"; // Default to English if detection fails
  } catch (error) {
    console.error('Language detection error:', error);
    return "en";
  }
};

export default function ChatScreen() {
  const { isLoggedIn, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'direct' | 'groups'>('direct');
  
  // Translation metadata stored separately to avoid type issues
  const [translatedMessages, setTranslatedMessages] = useState<{
    [messageId: number]: {
      isTranslated: boolean;
      originalContent: string;
    }
  }>({});

  useEffect(() => {
    if (isLoggedIn) {
      fetchConversations();
      fetchGroups();
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

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getGroups();
      setGroups(response.groups);
    } catch (error) {
      console.error('Error fetching groups:', error);
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

  const openGroupChat = (groupId: number) => {
    router.push({
      pathname: "/(app)/groups/[groupId]",
      params: { groupId: groupId.toString() }
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const toggleSelectMember = (user: User) => {
    if (selectedMembers.some(member => member.id === user.id)) {
      setSelectedMembers(selectedMembers.filter(member => member.id !== user.id));
    } else {
      setSelectedMembers([...selectedMembers, user]);
    }
  };

  const createNewGroup = async () => {
    if (!groupName.trim()) {
      return;
    }

    try {
      setLoading(true);
      await chatAPI.createGroup({
        name: groupName,
        description: groupDescription,
        member_ids: selectedMembers.map(user => user.id)
      });
      
      setGroupName('');
      setGroupDescription('');
      setSelectedMembers([]);
      setShowCreateGroup(false);
      fetchGroups();
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Translation helper functions
  const isMessageTranslated = (message: Message): boolean => {
    return translatedMessages[message.id]?.isTranslated === true;
  };
  
  const getOriginalContent = (message: Message): string | undefined => {
    return translatedMessages[message.id]?.originalContent;
  };
  
  // Handle message translation
  const handleTranslate = async (message: Message | undefined) => {
    if (!message) return;
    
    try {
      const messageId = message.id;
      const conversationsCopy = [...conversations];
      const groupsCopy = [...groups];
      
      // If already translated, revert to original
      if (isMessageTranslated(message)) {
        const originalContent = getOriginalContent(message);
        if (originalContent) {
          message.content = originalContent;
        }
        
        // Remove from translated messages
        setTranslatedMessages(prev => {
          const newState = {...prev};
          delete newState[messageId];
          return newState;
        });
      } else {
        // Detect language
        const detectedLang = await detectLanguage(message.content);
        
        // Determine target language based on detected language
        const targetLang = detectedLang === 'tl' ? 'en' : 'tl';
        
        // Save original message content
        const originalContent = message.content;
        
        // Show loading indicator
        message.content = "Translating...";
        
        // Force UI update
        if (activeTab === 'direct') {
          setConversations([...conversationsCopy]);
        } else {
          setGroups([...groupsCopy]);
        }
        
        // Translate the message
        const { translatedText, error } = await translateText(
          originalContent,
          detectedLang,
          targetLang
        );
        
        if (error) {
          console.error('Translation error:', error);
          message.content = originalContent;
          return;
        }
        
        // Update message with translated text
        message.content = translatedText;
        
        // Store translation metadata
        setTranslatedMessages(prev => ({
          ...prev,
          [messageId]: {
            isTranslated: true,
            originalContent
          }
        }));
      }
      
      // Update state to refresh UI
      if (activeTab === 'direct') {
        setConversations([...conversationsCopy]);
      } else {
        setGroups([...groupsCopy]);
      }
    } catch (error) {
      console.error('Translation error:', error);
    }
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
          <ThemedView style={styles.messagePreviewContainer}>
            <ThemedText 
              numberOfLines={1} 
              style={[styles.messagePreview, item.unread_count > 0 && styles.unreadMessage]}
            >
              {item.last_message.content}
            </ThemedText>
            {isMessageTranslated(item.last_message) && (
              <ThemedText style={styles.translatedTag}>(translated)</ThemedText>
            )}
            {item.last_message.content && item.last_message.content.length > 0 && (
              <TouchableOpacity 
                style={styles.translateButton} 
                onPress={(e) => {
                  e.stopPropagation();
                  handleTranslate(item.last_message);
                }}
              >
                <Ionicons 
                  name={isMessageTranslated(item.last_message) ? "language" : "language-outline"} 
                  size={16} 
                  color="#5e72e4" 
                />
              </TouchableOpacity>
            )}
          </ThemedView>
        )}
      </ThemedView>
    </TouchableOpacity>
  );

  const renderGroupItem = ({ item }: { item: GroupChat }) => (
    <TouchableOpacity 
      style={styles.conversationItem}
      onPress={() => openGroupChat(item.id)}
    >
      <View style={styles.avatarContainer}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <ThemedText>{item.name.charAt(0).toUpperCase()}</ThemedText>
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
          <ThemedView style={styles.groupNameContainer}>
            <ThemedText type="subtitle" numberOfLines={1}>{item.name}</ThemedText>
            <ThemedText style={styles.membersCount}>{item.members_count} members</ThemedText>
          </ThemedView>
          {item.last_message && (
            <ThemedText style={styles.timeText}>{formatTime(item.last_message.created_at)}</ThemedText>
          )}
        </ThemedView>
        {item.last_message && (
          <ThemedView style={styles.messagePreviewContainer}>
            <ThemedText 
              numberOfLines={1} 
              style={[styles.messagePreview, item.unread_count > 0 && styles.unreadMessage]}
            >
              {item.last_message.content}
            </ThemedText>
            {isMessageTranslated(item.last_message) && (
              <ThemedText style={styles.translatedTag}>(translated)</ThemedText>
            )}
            {item.last_message.content && item.last_message.content.length > 0 && (
              <TouchableOpacity 
                style={styles.translateButton} 
                onPress={(e) => {
                  e.stopPropagation();
                  handleTranslate(item.last_message);
                }}
              >
                <Ionicons 
                  name={isMessageTranslated(item.last_message) ? "language" : "language-outline"} 
                  size={16} 
                  color="#5e72e4" 
                />
              </TouchableOpacity>
            )}
          </ThemedView>
        )}
      </ThemedView>
    </TouchableOpacity>
  );

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => showCreateGroup ? toggleSelectMember(item) : startConversation(item.id)}
    >
      <View style={styles.avatarContainer}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <ThemedText>{item.name.charAt(0).toUpperCase()}</ThemedText>
          </View>
        )}
        {showCreateGroup && selectedMembers.some(member => member.id === item.id) && (
          <View style={styles.selectedBadge}>
            <Ionicons name="checkmark" size={16} color="white" />
          </View>
        )}
      </View>
      <ThemedView style={styles.userDetails}>
        <ThemedText type="subtitle">{item.name}</ThemedText>
        <ThemedText style={styles.emailText}>{item.email}</ThemedText>
      </ThemedView>
    </TouchableOpacity>
  );

  const renderCreateGroupModal = () => (
    <Modal
      visible={showCreateGroup}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCreateGroup(false)}
    >
      <ThemedView style={styles.modalContainer}>
        <ThemedView style={styles.modalContent}>
          <ThemedView style={styles.modalHeader}>
            <ThemedText type="title">Create Group</ThemedText>
            <TouchableOpacity onPress={() => setShowCreateGroup(false)}>
              <Ionicons name="close" size={24} color="#999" />
            </TouchableOpacity>
          </ThemedView>
          
          <ThemedText style={styles.inputLabel}>Group Name</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Enter group name"
            value={groupName}
            onChangeText={setGroupName}
            placeholderTextColor="#999"
          />
          
          <ThemedText style={styles.inputLabel}>Description (Optional)</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter group description"
            value={groupDescription}
            onChangeText={setGroupDescription}
            placeholderTextColor="#999"
            multiline={true}
            numberOfLines={3}
          />
          
          <ThemedText style={styles.inputLabel}>Add Members</ThemedText>
          
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
          
          {selectedMembers.length > 0 && (
            <ThemedView style={styles.selectedMembersContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {selectedMembers.map(member => (
                  <ThemedView key={member.id} style={styles.selectedMemberChip}>
                    <ThemedText style={styles.selectedMemberName}>{member.name}</ThemedText>
                    <TouchableOpacity onPress={() => toggleSelectMember(member)}>
                      <Ionicons name="close-circle" size={16} color="#999" />
                    </TouchableOpacity>
                  </ThemedView>
                ))}
              </ScrollView>
            </ThemedView>
          )}
          
          <FlatList
            data={users}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderUserItem}
            style={styles.membersList}
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
          
          <TouchableOpacity 
            style={[styles.createButton, !groupName.trim() && styles.disabledButton]}
            onPress={createNewGroup}
            disabled={!groupName.trim()}
          >
            <ThemedText style={styles.createButtonText}>Create Group</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </Modal>
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
      {renderCreateGroupModal()}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ThemedView style={styles.tabContent}>
          <ThemedView style={styles.header}>
            <ThemedText type="title" style={styles.tabTitle}>Messages</ThemedText>
            <ThemedView style={styles.headerButtons}>
              <TouchableOpacity 
                style={styles.newGroupButton}
                onPress={() => {
                  setShowCreateGroup(true);
                  setShowUserSearch(false);
                }}
              >
                <Ionicons name="people" size={24} color="#3498db" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.newChatButton}
                onPress={() => {
                  setShowUserSearch(!showUserSearch);
                  setShowCreateGroup(false);
                }}
              >
                <Ionicons 
                  name={showUserSearch ? "close" : "create-outline"} 
                  size={24} 
                  color="#3498db" 
                />
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>

          {!showUserSearch && (
            <ThemedView style={styles.tabsContainer}>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'direct' && styles.activeTab]}
                onPress={() => setActiveTab('direct')}
              >
                <ThemedText style={[styles.tabText, activeTab === 'direct' && styles.activeTabText]}>
                  Direct Messages
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'groups' && styles.activeTab]}
                onPress={() => setActiveTab('groups')}
              >
                <ThemedText style={[styles.tabText, activeTab === 'groups' && styles.activeTabText]}>
                  Group Chats
                </ThemedText>
              </TouchableOpacity>
            </ThemedView>
          )}

          <ThemedView style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={showUserSearch ? "Search users..." : activeTab === 'direct' ? "Search conversations..." : "Search groups..."}
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
          ) : activeTab === 'direct' ? (
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
          ) : (
            <FlatList
              data={groups}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderGroupItem}
              ListEmptyComponent={
                <ThemedView style={styles.emptyContainer}>
                  <ThemedText style={styles.emptyText}>
                    No group chats yet. Create a new group to start chatting!
                  </ThemedText>
                  <TouchableOpacity 
                    style={styles.startChatButton}
                    onPress={() => setShowCreateGroup(true)}
                  >
                    <ThemedText style={styles.startChatButtonText}>Create Group</ThemedText>
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
  headerButtons: {
    flexDirection: 'row',
  },
  tabTitle: {
    fontSize: 28,
  },
  tabText: {
    textAlign: 'center',
    marginBottom: 0,
    fontSize: 14,
    color: '#666',
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
  newGroupButton: {
    padding: 8,
    marginRight: 8,
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
  selectedBadge: {
    position: 'absolute',
    right: -5,
    top: -5,
    backgroundColor: '#27ae60',
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
  groupNameContainer: {
    flex: 1,
  },
  membersCount: {
    fontSize: 12,
    color: '#666',
  },
  messagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  messagePreview: {
    color: '#666',
    fontSize: 14,
    flex: 1,
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
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
  },
  activeTabText: {
    color: '#3498db',
    fontWeight: 'bold',
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
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  membersList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#3498db',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  selectedMembersContainer: {
    marginBottom: 16,
  },
  selectedMemberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  selectedMemberName: {
    fontSize: 14,
    marginRight: 4,
  },
  translateButton: {
    padding: 4,
    marginLeft: 4,
  },
  translatedTag: {
    fontSize: 10,
    color: '#5e72e4',
    fontStyle: 'italic',
    marginLeft: 4,
    marginRight: 2,
  },
});
