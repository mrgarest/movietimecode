<?php

namespace App\Models;

use App\Enums\RoleId;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Passport\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'role_id',
        'username',
        'email',
        'password',
        'picture',
        'email_verified_at',
        'last_login_at',
        'deactivated_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id'               => 'int',
            'role_id'          => RoleId::class,
            'username'         => 'string',
            'email'            => 'string',
            'password'         => 'hashed',
            'picture'          => 'string',
            'created_at'       => 'datetime',
            'updated_at'       => 'datetime',
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'deactivated_at'   => 'datetime',
            'deleted_at'       => 'datetime',
        ];
    }

    public function tokens()
    {
        return $this->hasMany(ExpansionAuth::class);
    }

    public function providers()
    {
        return $this->hasMany(UserProvider::class);
    }

    public function isAdmin(): bool
    {
        return $this->role_id === RoleId::ADMIN;
    }
}
