<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LocationVisit extends Model
{
    use HasFactory;

    // Make sure 'type' is included in fillable attributes
    protected $fillable = [
        'location_id',
        'user_id',
        'type'
    ];

    public function location()
    {
        return $this->belongsTo(Location::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
