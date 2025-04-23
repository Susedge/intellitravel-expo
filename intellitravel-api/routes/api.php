<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\GroupController;
use App\Http\Controllers\GroupMessageController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Public location routes - ORDER MATTERS!
Route::post('/locations/visits', [LocationController::class, 'logVisit']);
Route::get('/locations/nearby', [LocationController::class, 'nearby']);
Route::get('/locations', [LocationController::class, 'index']);
Route::get('/locations/{location}', [LocationController::class, 'show']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    
    // Users
    Route::get('/users/search', [UserController::class, 'search']);
    Route::get('/users/{user}', [UserController::class, 'show']);
    
    // Messages
    Route::get('/conversations', [MessageController::class, 'conversations']);
    Route::get('/messages/{user}', [MessageController::class, 'index']);
    Route::post('/messages', [MessageController::class, 'store']);
    Route::post('/messages/{user}/read', [MessageController::class, 'markAsRead']);
    
    // Protected location endpoints - Fixed order
    Route::post('/locations/ratings', [LocationController::class, 'rateLocation']);
    Route::get('/locations/{location}/analytics', [LocationController::class, 'getAnalytics']);
    Route::post('/locations', [LocationController::class, 'store']);
    Route::put('/locations/{location}', [LocationController::class, 'update']);
    Route::delete('/locations/{location}', [LocationController::class, 'destroy']);

    // Group chat routes
    Route::get('/groups', [GroupController::class, 'index']);
    Route::post('/groups', [GroupController::class, 'store']);
    Route::get('/groups/{group}', [GroupController::class, 'show']);
    Route::get('/groups/{group}/members', [GroupController::class, 'members']);
    Route::post('/groups/{group}/members', [GroupController::class, 'addMember']);
    Route::delete('/groups/{group}/members/{user}', [GroupController::class, 'removeMember']);
    Route::post('/groups/{group}/leave', [GroupController::class, 'leave']);

    // Group messages
    Route::get('/groups/{group}/messages', [GroupMessageController::class, 'index']);
    Route::post('/group-messages', [GroupMessageController::class, 'store']);
});
