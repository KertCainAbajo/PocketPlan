<?php

namespace App\Enums;

/** Who deactivated an account. A self-deactivated student may reactivate by signing in. */
enum DeactivatedBy: string
{
    case Admin = 'admin';
    case Self = 'self';
}
