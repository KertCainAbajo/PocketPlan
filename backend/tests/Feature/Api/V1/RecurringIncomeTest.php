<?php

namespace Tests\Feature\Api\V1;

use App\Enums\CategoryType;
use App\Enums\RecurrenceFrequency;
use App\Models\RecurringIncome;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithStudents;
use Tests\TestCase;

class RecurringIncomeTest extends TestCase
{
    use InteractsWithStudents, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCategories();
        $this->freezeToday();
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'category_id' => $this->defaultCategory('Allowance', CategoryType::Income)->id,
            'amount' => '2000',
            'description' => 'Weekly allowance',
            'frequency' => 'weekly',
            'start_date' => '2026-09-23', // two weeks before "today"
        ], $overrides);
    }

    public function test_creating_a_backdated_schedule_records_every_payment_already_due(): void
    {
        $student = $this->actingAsStudent();

        $this->postJson('/api/v1/recurring-incomes', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.occurrences_generated', 3)
            ->assertJsonPath('data.next_due_on', '2026-10-14');

        $this->assertSame(
            ['2026-09-23', '2026-09-30', '2026-10-07'],
            $student->incomes()->orderBy('received_on')->pluck('received_on')->map->toDateString()->all(),
        );
    }

    public function test_future_schedule_records_nothing_until_due(): void
    {
        $student = $this->actingAsStudent();

        $this->postJson('/api/v1/recurring-incomes', $this->payload(['start_date' => '2026-10-10']))
            ->assertCreated()
            ->assertJsonPath('data.occurrences_generated', 0);
        $this->assertSame(0, $student->incomes()->count());

        $this->freezeToday('2026-10-10');
        $this->artisan('pocketplan:generate-recurring-incomes')->assertSuccessful();
        $this->assertSame(1, $student->incomes()->count());
    }

    public function test_generation_is_idempotent(): void
    {
        $student = $this->actingAsStudent();
        $this->postJson('/api/v1/recurring-incomes', $this->payload())->assertCreated();

        $this->artisan('pocketplan:generate-recurring-incomes')->assertSuccessful();
        $this->artisan('pocketplan:generate-recurring-incomes')->assertSuccessful();
        $this->getJson('/api/v1/incomes')->assertOk();

        $this->assertSame(3, $student->incomes()->count());
    }

    public function test_schedule_stops_after_its_end_date(): void
    {
        $student = $this->actingAsStudent();

        $this->postJson('/api/v1/recurring-incomes', $this->payload(['end_date' => '2026-09-30']))
            ->assertCreated()
            ->assertJsonPath('data.is_active', false)
            ->assertJsonPath('data.next_due_on', null);

        $this->assertSame(2, $student->incomes()->count());
    }

    public function test_paused_schedule_catches_up_when_resumed(): void
    {
        $student = $this->actingAsStudent();
        $id = $this->postJson('/api/v1/recurring-incomes', $this->payload(['start_date' => self::TODAY]))->json('data.id');
        $update = ['category_id' => $this->defaultCategory('Allowance', CategoryType::Income)->id, 'amount' => '2500', 'description' => 'Allowance (raised)'];

        $this->putJson("/api/v1/recurring-incomes/{$id}", [...$update, 'is_active' => false])->assertOk();
        $this->freezeToday('2026-10-21');
        $this->getJson('/api/v1/dashboard')->assertOk();
        $this->assertSame(1, $student->incomes()->count(), 'paused schedules record nothing');

        $this->putJson("/api/v1/recurring-incomes/{$id}", [...$update, 'is_active' => true])->assertOk();
        $this->assertSame(['2000.00', '2500.00', '2500.00'], $student->incomes()->orderBy('received_on')->pluck('amount')->all());
    }

    public function test_deleting_a_schedule_keeps_recorded_income(): void
    {
        $student = $this->actingAsStudent();
        $id = $this->postJson('/api/v1/recurring-incomes', $this->payload())->json('data.id');

        $this->deleteJson("/api/v1/recurring-incomes/{$id}")->assertNoContent();

        $this->assertSame(3, $student->incomes()->count());
        $this->assertSame(0, $student->incomes()->whereNotNull('recurring_income_id')->count());
    }

    public function test_other_students_schedules_are_invisible(): void
    {
        $this->actingAsStudent();
        $foreign = RecurringIncome::factory()->create();

        $this->deleteJson("/api/v1/recurring-incomes/{$foreign->id}")->assertNotFound();
        $this->getJson('/api/v1/recurring-incomes')->assertJsonCount(0, 'data');
    }

    public function test_monthly_payments_on_the_31st_do_not_drift(): void
    {
        $start = CarbonImmutable::parse('2026-01-31');
        $dates = array_map(fn (int $n) => RecurrenceFrequency::Monthly->occurrence($start, $n)->toDateString(), range(0, 3));

        $this->assertSame(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'], $dates);
    }

    public function test_backdating_is_limited_to_one_year(): void
    {
        $this->actingAsStudent();

        $this->postJson('/api/v1/recurring-incomes', $this->payload(['frequency' => 'daily', 'start_date' => '2025-01-01']))
            ->assertJsonValidationErrors('start_date');
    }
}
