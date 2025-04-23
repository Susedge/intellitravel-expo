<?php

namespace App\Http\Controllers;

use App\Models\Group;
use App\Models\GroupMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GroupMessageController extends Controller
{
    // List messages in a group
    public function index(Group $group)
    {
        $messages = $group->messages()->with('user')->orderBy('created_at')->get();
        return response()->json(['messages' => $messages]);
    }

    // Send a message to a group
    public function store(Request $request)
    {
        $request->validate([
            'group_id' => 'required|exists:groups,id',
            'content' => 'required|string',
        ]);
        $message = GroupMessage::create([
            'group_id' => $request->group_id,
            'user_id' => Auth::id(),
            'content' => $request->content,
        ]);
        return response()->json($message->load('user'), 201);
    }
}
