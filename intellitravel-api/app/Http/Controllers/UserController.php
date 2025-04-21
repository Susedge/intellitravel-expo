<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    /**
     * Search for users
     */
    public function search(Request $request)
    {
        $query = $request->input('query');
        $authUser = $request->user();
        
        $users = User::where('id', '!=', $authUser->id)
            ->where(function($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                  ->orWhere('email', 'like', "%{$query}%");
            })
            ->limit(20)
            ->get(['id', 'name', 'email', 'avatar', 'last_seen']);
        
        return response()->json([
            'users' => $users
        ]);
    }

    /**
     * Get user details
     */
    public function show(User $user)
    {
        return response()->json([
            'user' => $user->only(['id', 'name', 'email', 'avatar', 'last_seen'])
        ]);
    }
}
