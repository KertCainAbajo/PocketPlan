<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Onboarding\CompleteOnboarding;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\OnboardingRequest;
use App\Http\Resources\V1\UserResource;

class OnboardingController extends Controller
{
    public function __invoke(OnboardingRequest $request, CompleteOnboarding $onboarding): UserResource
    {
        /** @var array{currency: string, allowance_amount: string, frequency: string, start_date: string, end_date?: string|null, recurring?: bool, savings_goal?: array{name: string, target_amount: string, target_date?: string|null}|null} $input */
        $input = $request->validated();

        return new UserResource($onboarding->handle($request->user(), $input));
    }
}
