<?php

namespace App\Http\Resources\V1;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Laravel\Sanctum\NewAccessToken;

/**
 * Response body for register and login: the plain-text token (shown once) plus the user.
 */
class AuthTokenResource extends JsonResource
{
    public function __construct(private readonly NewAccessToken $token, private readonly User $user)
    {
        parent::__construct($token);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'token' => $this->token->plainTextToken,
            'token_type' => 'Bearer',
            'expires_at' => $this->token->accessToken->expires_at?->toIso8601String(),
            'user' => new UserResource($this->user),
        ];
    }
}
