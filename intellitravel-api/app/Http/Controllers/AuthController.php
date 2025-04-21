<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        try {
            $fields = $request->validate([
                'name' => 'required|string',
                'email' => 'required|string|unique:users,email',
                'password' => 'required|string|confirmed'
            ]);

            $user = User::create([
                'name' => $fields['name'],
                'email' => $fields['email'],
                'password' => bcrypt($fields['password'])
            ]);

            // $token = $user->createToken('apptoken')->plainTextToken;
            $token = "test_token";

            return response([
                'user' => $user,
                'token' => $token
            ], 201);
            
        } catch (ValidationException $e) {
            return response([
                'message' => 'Validation error',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response([
                'message' => 'Registration failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function login(Request $request)
    {
        try {
            $fields = $request->validate([
                'email' => 'required|string|email',
                'password' => 'required|string'
            ]);

            // Check email
            $user = User::where('email', $fields['email'])->first();

            // Check password
            if (!$user || !Hash::check($fields['password'], $user->password)) {
                return response([
                    'message' => 'Invalid credentials'
                ], 401);
            }

            // Delete old tokens if you want users to have only one active token
            // $user->tokens()->delete();
            
            // $token = $user->createToken('apptoken')->plainTextToken;
            $token = "test_token";

            return response([
                'user' => $user,
                'token' => $token
            ], 200);
            
        } catch (ValidationException $e) {
            return response([
                'message' => 'Validation error',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response([
                'message' => 'Login failed',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString() // Add this line to get more details
            ], 500);
        }
    }

    public function logout(Request $request)
    {
        try {
            // Revoke the token that was used to authenticate the current request
            if (auth()->check()) {
                auth()->user()->currentAccessToken()->delete();
                
                return response([
                    'message' => 'Logged out successfully'
                ], 200);
            }
            
            return response([
                'message' => 'Not authenticated'
            ], 401);
            
        } catch (\Exception $e) {
            return response([
                'message' => 'Logout failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
