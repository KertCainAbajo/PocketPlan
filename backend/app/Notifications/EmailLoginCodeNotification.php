<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** The 6-digit sign-in code, sent to the address the student typed. */
class EmailLoginCodeNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly string $code) {}

    /** The plain code, for tests; it is never stored or logged by the app. */
    public function code(): string
    {
        return $this->code;
    }

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $minutes = (int) config('pocketplan.email_code.ttl_minutes');

        return (new MailMessage)
            ->subject("{$this->code} is your PocketPlan code")
            ->greeting('Your PocketPlan sign-in code')
            ->line('Enter this code in the app to continue:')
            ->line("**{$this->code}**")
            ->line("It expires in {$minutes} minutes and can only be used once.")
            ->line('If you didn’t try to sign in, you can ignore this email. Nobody can get in without this code.');
    }
}
