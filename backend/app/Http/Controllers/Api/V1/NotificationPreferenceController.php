<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationPreferenceController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $preference = $request->user()->notificationPreference()->firstOrCreate();

        return response()->json(['data' => [
            'daily_warning' => $preference->daily_warning,
            'threshold_alert' => $preference->threshold_alert,
            'budget_ending' => $preference->budget_ending,
            'budget_completed' => $preference->budget_completed,
            'daily_reminder' => $preference->daily_reminder,
            'reminder_time' => substr($preference->reminder_time, 0, 5),
            'warning_threshold_percent' => $preference->warning_threshold_percent,
        ]]);
    }

    public function update(Request $request): JsonResponse
    {
        $input = $request->validate([
            'daily_warning' => ['sometimes', 'boolean'],
            'threshold_alert' => ['sometimes', 'boolean'],
            'budget_ending' => ['sometimes', 'boolean'],
            'budget_completed' => ['sometimes', 'boolean'],
            'daily_reminder' => ['sometimes', 'boolean'],
            'reminder_time' => ['sometimes', 'date_format:H:i'],
            'warning_threshold_percent' => ['sometimes', 'integer', 'between:1,100'],
        ]);
        if (isset($input['reminder_time'])) {
            $input['reminder_time'] .= ':00';
        }

        $preference = $request->user()->notificationPreference()->firstOrCreate();
        $preference->fill($input)->save();

        return $this->show($request);
    }
}
