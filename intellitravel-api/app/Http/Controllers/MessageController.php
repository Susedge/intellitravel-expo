<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MessageController extends Controller
{
    /**
     * Get all conversations for the authenticated user
     */
    public function conversations(Request $request)
    {
        $user = $request->user();
        
        // Get the latest message with each user
        $conversations = DB::select("
            SELECT 
                users.id,
                users.name,
                users.email,
                users.avatar,
                users.last_seen,
                latest_messages.id as message_id,
                latest_messages.content,
                latest_messages.created_at,
                latest_messages.sender_id,
                latest_messages.receiver_id,
                latest_messages.read,
                (
                    SELECT COUNT(*) FROM messages 
                    WHERE sender_id = users.id 
                    AND receiver_id = ? 
                    AND read = 0
                ) as unread_count
            FROM users
            JOIN (
                SELECT m.*
                FROM messages m
                JOIN (
                    SELECT 
                        CASE 
                            WHEN sender_id = ? THEN receiver_id
                            ELSE sender_id
                        END as user_id,
                        MAX(id) as max_id
                    FROM messages
                    WHERE sender_id = ? OR receiver_id = ?
                    GROUP BY user_id
                ) as latest ON (
                    (m.sender_id = latest.user_id AND m.receiver_id = ?) OR
                    (m.receiver_id = latest.user_id AND m.sender_id = ?)
                ) AND m.id = latest.max_id
            ) as latest_messages ON (
                latest_messages.sender_id = users.id OR latest_messages.receiver_id = users.id
            )
            WHERE users.id != ?
            ORDER BY latest_messages.created_at DESC
        ", [$user->id, $user->id, $user->id, $user->id, $user->id, $user->id, $user->id]);
        
        $formattedConversations = [];
        foreach ($conversations as $conversation) {
            $formattedConversations[] = [
                'id' => $conversation->id,
                'user' => [
                    'id' => $conversation->id,
                    'name' => $conversation->name,
                    'email' => $conversation->email,
                    'avatar' => $conversation->avatar,
                    'last_seen' => $conversation->last_seen,
                ],
                'last_message' => [
                    'id' => $conversation->message_id,
                    'content' => $conversation->content,
                    'created_at' => $conversation->created_at,
                    'sender_id' => $conversation->sender_id,
                    'receiver_id' => $conversation->receiver_id,
                    'read' => (bool) $conversation->read,
                ],
                'unread_count' => $conversation->unread_count,
            ];
        }
        
        return response()->json([
            'conversations' => $formattedConversations
        ]);
    }

    /**
     * Get messages between the authenticated user and another user
     */
    public function index(Request $request, User $user)
    {
        $authUser = $request->user();
        
        $messages = Message::where(function($query) use ($authUser, $user) {
                $query->where('sender_id', $authUser->id)
                      ->where('receiver_id', $user->id);
            })
            ->orWhere(function($query) use ($authUser, $user) {
                $query->where('sender_id', $user->id)
                      ->where('receiver_id', $authUser->id);
            })
            ->orderBy('created_at', 'desc')
            ->get();
        
        return response()->json([
            'messages' => $messages
        ]);
    }

    /**
     * Store a new message
     */
    public function store(Request $request)
    {
        $request->validate([
            'receiver_id' => 'required|exists:users,id',
            'content' => 'required|string'
        ]);
        
        $message = Message::create([
            'sender_id' => $request->user()->id,
            'receiver_id' => $request->receiver_id,
            'content' => $request->content,
            'read' => false
        ]);
        
        return response()->json([
            'message' => $message
        ], 201);
    }

    /**
     * Mark messages as read
     */
    public function markAsRead(Request $request, User $user)
    {
        $authUser = $request->user();
        
        Message::where('sender_id', $user->id)
            ->where('receiver_id', $authUser->id)
            ->where('read', false)
            ->update(['read' => true]);
        
        return response()->json([
            'success' => true
        ]);
    }
}
