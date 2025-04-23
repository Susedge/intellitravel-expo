<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Group extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'avatar', 'description', 'created_by'
    ];

    public function members()
    {
        return $this->belongsToMany(User::class, 'group_user')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function messages()
    {
        return $this->hasMany(GroupMessage::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
