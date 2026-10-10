<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case Cash = 'cash';
    case GCash = 'gcash';
    case Maya = 'maya';
    case Card = 'card';
    case BankTransfer = 'bank_transfer';
    case Other = 'other';
}
