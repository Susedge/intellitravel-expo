<?php

namespace App\Http\Controllers;

use App\Models\Location;
use App\Models\LocationVisit;
use App\Models\LocationRating;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class LocationController extends Controller
{
    /**
     * Get all locations
     */
    public function index()
    {
        try {
            $locations = Location::all();
            return response()->json($locations);
        } catch (\Exception $e) {
            Log::error('Failed to fetch locations: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch locations'], 500);
        }
    }

    /**
     * Create a new location
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'latitude' => 'required|numeric',
                'longitude' => 'required|numeric',
                'description' => 'nullable|string',
                'type' => 'nullable|string',
            ]);

            $location = Location::create($validated);
            
            // Log the visit by the currently authenticated user
            if (Auth::check()) {
                LocationVisit::create([
                    'location_id' => $location->id,
                    'user_id' => Auth::id(),
                    'type' => 'created'
                ]);
            }

            return response()->json($location, 201);
        } catch (\Exception $e) {
            Log::error('Failed to create location: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to create location: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get a specific location
     */
    public function show(Location $location)
    {
        try {
            // Include average rating and visit count
            $location->load(['ratings', 'visits']);
            $location->average_rating = $location->ratings->avg('rating') ?? 0;
            $location->visit_count = $location->visits->count();
            
            // Log the view (if authenticated)
            if (Auth::check()) {
                LocationVisit::create([
                    'location_id' => $location->id,
                    'user_id' => Auth::id(),
                    'type' => 'viewed'
                ]);
            }

            return response()->json($location);
        } catch (\Exception $e) {
            Log::error('Failed to fetch location: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch location'], 500);
        }
    }

    /**
     * Update a location
     */
    public function update(Request $request, Location $location)
    {
        try {
            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'latitude' => 'sometimes|numeric',
                'longitude' => 'sometimes|numeric',
                'description' => 'nullable|string',
                'type' => 'nullable|string',
            ]);

            $location->update($validated);
            return response()->json($location);
        } catch (\Exception $e) {
            Log::error('Failed to update location: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to update location'], 500);
        }
    }

    /**
     * Delete a location
     */
    public function destroy(Location $location)
    {
        try {
            $location->delete();
            return response()->json(null, 204);
        } catch (\Exception $e) {
            Log::error('Failed to delete location: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete location'], 500);
        }
    }

    /**
     * Find nearby locations
     */
    public function nearby(Request $request)
    {
        try {
            Log::info('Nearby location request received', ['params' => $request->all()]);
            
            $validated = $request->validate([
                'lat' => 'required|numeric',
                'lng' => 'required|numeric',
                'radius' => 'sometimes|numeric|min:0.001|max:100', // Allow smaller radius
            ]);

            $radius = $request->input('radius', 5); // Default 5km radius
            $latitude = $validated['lat'];
            $longitude = $validated['lng'];

            Log::info('Searching for locations', [
                'latitude' => $latitude,
                'longitude' => $longitude,
                'radius' => $radius
            ]);

            // Check if we're using SQLite
            $connection = config('database.default');
            $isSqlite = in_array($connection, ['sqlite', 'testing']);
            
            $locations = [];
            
            if ($isSqlite) {
                // For SQLite, use PHP to calculate distance
                Log::info('Using PHP-based distance calculation for SQLite');
                $allLocations = Location::all();
                
                foreach ($allLocations as $location) {
                    $distance = $this->calculateDistance(
                        $latitude, 
                        $longitude, 
                        $location->latitude, 
                        $location->longitude
                    );
                    
                    if ($distance <= $radius) {
                        $location->distance = $distance;
                        $locations[] = $location;
                    }
                }
                
                // Sort by distance
                usort($locations, function($a, $b) {
                    return $a->distance <=> $b->distance;
                });
                
                // Convert to collection
                $locations = collect($locations);
            } else {
                // Using Haversine formula in SQL (for MySQL/PostgreSQL)
                Log::info('Using SQL Haversine formula for distance calculation');
                $locations = Location::select('*')
                    ->selectRaw('( 6371 * acos( cos( radians(?) ) * cos( radians( latitude ) ) * cos( radians( longitude ) - radians(?) ) + sin( radians(?) ) * sin( radians( latitude ) ) ) ) AS distance', 
                        [$latitude, $longitude, $latitude])
                    ->having('distance', '<=', $radius)
                    ->orderBy('distance')
                    ->get();
            }

            Log::info('Locations found', ['count' => count($locations)]);

            // Add visit counts and average ratings
            foreach ($locations as $location) {
                $location->visit_count = LocationVisit::where('location_id', $location->id)->count();
                $location->average_rating = LocationRating::where('location_id', $location->id)->avg('rating') ?? 0;
            }

            return response()->json($locations);
        } catch (\Exception $e) {
            Log::error('Failed to find nearby locations', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            // Return empty array instead of 500 error
            return response()->json([]);
        }
    }

    /**
     * Log a visit to a location
     */
    public function logVisit(Request $request)
    {
        try {
            Log::info('Visit logging request received', ['data' => $request->all()]);
            
            $validated = $request->validate([
                'latitude' => 'required|numeric',
                'longitude' => 'required|numeric',
                'name' => 'required|string|max:255',
                'type' => 'required|string|in:viewed,selected,visited'
            ]);
            
            Log::info('Validation passed', ['validated' => $validated]);

            // Check DB connection type to handle SQLite differently
            $connection = config('database.default');
            $isSqlite = in_array($connection, ['sqlite', 'testing']);
            
            // Find nearby location
            $nearbyLocation = null;
            
            if ($isSqlite) {
                // For SQLite, use PHP to calculate distance (less efficient but works)
                Log::info('Using PHP-based distance calculation for SQLite');
                $locations = Location::all();
                $userLat = $validated['latitude'];
                $userLng = $validated['longitude'];
                
                foreach ($locations as $location) {
                    // Simple distance calculation (not perfect but good enough for testing)
                    $distance = $this->calculateDistance(
                        $userLat, 
                        $userLng, 
                        $location->latitude, 
                        $location->longitude
                    );
                    
                    if ($distance <= 0.05) { // 50 meters in kilometers
                        $nearbyLocation = $location;
                        break;
                    }
                }
            } else {
                // For MySQL/PostgreSQL, use Haversine formula
                Log::info('Using SQL Haversine formula for distance calculation');
                $nearbyLocation = Location::select('*')
                    ->selectRaw('( 6371 * acos( cos( radians(?) ) * cos( radians( latitude ) ) * cos( radians( longitude ) - radians(?) ) + sin( radians(?) ) * sin( radians( latitude ) ) ) ) AS distance', 
                        [$validated['latitude'], $validated['longitude'], $validated['latitude']])
                    ->having('distance', '<=', 0.05) // 50 meters in kilometers
                    ->orderBy('distance')
                    ->first();
            }
            
            // Create a new location if none exists nearby
            if (!$nearbyLocation) {
                Log::info('No nearby location found, creating new one');
                $nearbyLocation = Location::create([
                    'name' => $validated['name'],
                    'latitude' => $validated['latitude'],
                    'longitude' => $validated['longitude'],
                    'type' => 'user_added'
                ]);
                Log::info('New location created', ['location' => $nearbyLocation->toArray()]);
            } else {
                Log::info('Existing location found', ['location' => $nearbyLocation->toArray()]);
            }

            // Log the visit
            Log::info('Creating visit record');
            $visit = LocationVisit::create([
                'location_id' => $nearbyLocation->id,
                'user_id' => Auth::check() ? Auth::id() : null,
                'type' => $validated['type']
            ]);
            Log::info('Visit record created', ['visit' => $visit->toArray()]);

            return response()->json([
                'message' => 'Visit logged successfully',
                'location' => $nearbyLocation,
                'visit' => $visit
            ], 201);
        } catch (\Exception $e) {
            Log::error('Location visit logging error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);
            return response()->json(['error' => 'Failed to log visit: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Rate a location
     */
    public function rateLocation(Request $request)
    {
        try {
            Log::info('Rating request received', ['data' => $request->all()]);
            
            if (!Auth::check()) {
                Log::warning('Unauthenticated rating attempt');
                return response()->json(['error' => 'Unauthenticated'], 401);
            }
            
            Log::info('User authenticated', ['user_id' => Auth::id()]);
            
            $validated = $request->validate([
                'location_id' => 'required|exists:locations,id',
                'rating' => 'required|integer|min:1|max:5',
                'comment' => 'nullable|string'
            ]);
            
            Log::info('Validation passed', ['validated' => $validated]);

            // Check if user has already rated this location
            $existingRating = LocationRating::where('location_id', $validated['location_id'])
                ->where('user_id', Auth::id())
                ->first();
                
            Log::info('Existing rating check', ['exists' => (bool)$existingRating]);

            if ($existingRating) {
                Log::info('Updating existing rating');
                $existingRating->update([
                    'rating' => $validated['rating'],
                    'comment' => $validated['comment'] ?? $existingRating->comment
                ]);
                $rating = $existingRating;
            } else {
                Log::info('Creating new rating');
                $rating = LocationRating::create([
                    'location_id' => $validated['location_id'],
                    'user_id' => Auth::id(),
                    'rating' => $validated['rating'],
                    'comment' => $validated['comment'] ?? null
                ]);
                Log::info('New rating created', ['rating_id' => $rating->id]);
            }

            return response()->json($rating, 201);
        } catch (\Exception $e) {
            Log::error('Failed to rate location', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);
            return response()->json(['error' => 'Failed to rate location: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get analytics for a location
     */
    public function getAnalytics(Location $location)
    {
        try {
            // Get visit counts by type
            $visitsByType = LocationVisit::where('location_id', $location->id)
                ->select('type', DB::raw('count(*) as count'))
                ->groupBy('type')
                ->get();
            
            // Get average rating
            $averageRating = LocationRating::where('location_id', $location->id)->avg('rating') ?? 0;
            
            // Get rating distribution
            $ratingDistribution = LocationRating::where('location_id', $location->id)
                ->select('rating', DB::raw('count(*) as count'))
                ->groupBy('rating')
                ->get();
                
            // Get recent comments
            $recentComments = LocationRating::where('location_id', $location->id)
                ->whereNotNull('comment')
                ->with('user:id,name')
                ->latest()
                ->take(5)
                ->get(['id', 'user_id', 'rating', 'comment', 'created_at']);

            // Get visits over time (last 30 days)
            $visitsOverTime = LocationVisit::where('location_id', $location->id)
                ->where('created_at', '>=', now()->subDays(30))
                ->select(DB::raw('DATE(created_at) as date'), DB::raw('count(*) as count'))
                ->                groupBy('date')
                ->get();

            return response()->json([
                'location' => $location,
                'visits_total' => LocationVisit::where('location_id', $location->id)->count(),
                'visits_by_type' => $visitsByType,
                'visits_over_time' => $visitsOverTime,
                'average_rating' => $averageRating,
                'rating_distribution' => $ratingDistribution,
                'recent_comments' => $recentComments
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to get location analytics', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'location_id' => $location->id
            ]);
            return response()->json(['error' => 'Failed to get location analytics'], 500);
        }
    }

    /**
     * Simple distance calculation using Haversine formula in PHP
     * Calculate the distance between two points in kilometers
     */
    private function calculateDistance($lat1, $lon1, $lat2, $lon2)
    {
        // Convert degrees to radians
        $lat1 = deg2rad($lat1);
        $lon1 = deg2rad($lon1);
        $lat2 = deg2rad($lat2);
        $lon2 = deg2rad($lon2);
        
        // Haversine formula
        $dlat = $lat2 - $lat1;
        $dlon = $lon2 - $lon1;
        $a = sin($dlat/2) * sin($dlat/2) + cos($lat1) * cos($lat2) * sin($dlon/2) * sin($dlon/2);
        $c = 2 * asin(sqrt($a));
        $r = 6371; // Radius of Earth in kilometers
        
        return $r * $c;
    }
}

