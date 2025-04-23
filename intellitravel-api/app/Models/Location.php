<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Location extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'latitude',
        'longitude',
        'description',
        'type'
    ];

    public function visits(): HasMany
    {
        return $this->hasMany(LocationVisit::class);
    }

    public function ratings(): HasMany
    {
        return $this->hasMany(LocationRating::class);
    }

    // Calculate distance between two coordinates in kilometers
    public static function distance($lat1, $lon1, $lat2, $lon2)
    {
        if (($lat1 == $lat2) && ($lon1 == $lon2)) {
            return 0;
        }

        $theta = $lon1 - $lon2;
        $dist = sin(deg2rad($lat1)) * sin(deg2rad($lat2)) + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * cos(deg2rad($theta));
        $dist = acos($dist);
        $dist = rad2deg($dist);
        $miles = $dist * 60 * 1.1515;
        
        return $miles * 1.609344; // Convert miles to kilometers
    }
}
