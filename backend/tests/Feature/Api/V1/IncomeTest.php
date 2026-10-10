<?php

namespace Tests\Feature\Api\V1;

use App\Enums\CategoryType;
use App\Models\Income;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithStudents;
use Tests\TestCase;

class IncomeTest extends TestCase
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
            'category_id' => $this->defaultCategory('Freelance', CategoryType::Income)->id,
            'amount' => '1500',
            'description' => 'Logo commission',
            'received_on' => self::TODAY,
        ], $overrides);
    }

    public function test_student_can_record_edit_and_delete_income(): void
    {
        $this->actingAsStudent();

        $id = $this->postJson('/api/v1/incomes', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.amount', '1500.00')
            ->assertJsonPath('data.category.name', 'Freelance')
            ->json('data.id');

        $this->putJson("/api/v1/incomes/{$id}", $this->payload(['amount' => '1750.25']))
            ->assertOk()->assertJsonPath('data.amount', '1750.25');

        $this->deleteJson("/api/v1/incomes/{$id}")->assertNoContent();
        $this->assertDatabaseCount('incomes', 0);
    }

    public function test_income_needs_an_income_category_and_a_past_date(): void
    {
        $this->actingAsStudent();

        $this->postJson('/api/v1/incomes', $this->payload(['category_id' => $this->defaultCategory('Food')->id]))
            ->assertJsonValidationErrors('category_id');
        $this->postJson('/api/v1/incomes', $this->payload(['received_on' => '2026-10-08']))
            ->assertJsonValidationErrors('received_on');
    }

    public function test_history_is_private_filtered_and_totalled(): void
    {
        $student = $this->actingAsStudent();
        Income::factory()->for($student)->create(['amount' => '2000.00', 'received_on' => '2026-10-01', 'description' => 'Allowance']);
        Income::factory()->for($student)->create(['amount' => '500.00', 'received_on' => '2026-10-06', 'description' => 'Gift from Tita']);
        $foreign = Income::factory()->create();

        $this->getJson('/api/v1/incomes')
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.description', 'Gift from Tita')
            ->assertJsonPath('meta.total_amount', '2500.00');

        $this->getJson('/api/v1/incomes?search=tita')->assertJsonCount(1, 'data');
        $this->getJson("/api/v1/incomes/{$foreign->id}")->assertNotFound();
        $this->deleteJson("/api/v1/incomes/{$foreign->id}")->assertNotFound();
    }
}
