<?php

namespace App\Http\Controllers;

use App\Models\Group;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GroupController extends Controller
{
    // List groups the user is a member of
    public function index()
    {
        $groups = Auth::user()->groups()->withCount('members')->with('messages')->get();
        return response()->json(['groups' => $groups]);
    }

    // Create a group
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'member_ids' => 'array',
            'member_ids.*' => 'exists:users,id',
        ]);

        $group = Group::create([
            'name' => $request->name,
            'description' => $request->description,
            'created_by' => Auth::id(),
        ]);
        // Add creator as admin
        $group->members()->attach(Auth::id(), ['role' => 'admin']);
        // Add other members as regular members
        if ($request->member_ids) {
            foreach ($request->member_ids as $memberId) {
                if ($memberId != Auth::id()) {
                    $group->members()->attach($memberId, ['role' => 'member']);
                }
            }
        }
        return response()->json($group->load('members'), 201);
    }

    // Show group details
    public function show(Group $group)
    {
        $group->load('members', 'messages.user');
        return response()->json($group);
    }

    // Get group members
    public function members(Group $group)
    {
        $members = $group->members;
        return response()->json(['members' => $members]);
    }    

    // Add member
    public function addMember(Request $request, Group $group)
    {
        $request->validate(['user_id' => 'required|exists:users,id']);
        $group->members()->syncWithoutDetaching([$request->user_id => ['role' => 'member']]);
        return response()->json(['success' => true]);
    }

    // Remove member
    public function removeMember(Group $group, User $user)
    {
        $group->members()->detach($user->id);
        return response()->json(['success' => true]);
    }

    // Leave group
    public function leave(Group $group)
    {
        $group->members()->detach(Auth::id());
        return response()->json(['success' => true]);
    }
}
