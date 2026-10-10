<?php

namespace Tests\Feature\Api\V1;

use App\Enums\CategoryType;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithStudents;
use Tests\TestCase;

class CategoryTest extends TestCase
{
    use InteractsWithStudents, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCategories();
    }

    public function test_lists_active_defaults_and_own_categories_only(): void
    {
        $student = $this->actingAsStudent();
        $this->defaultCategory('Shopping')->update(['is_active' => false]);
        Category::factory()->forUser($student)->create(['name' => 'Coffee']);
        Category::factory()->forUser(User::factory()->create())->create(['name' => 'Someone else']);

        $names = collect($this->getJson('/api/v1/categories?type=expense')->assertOk()->json('data'))->pluck('name');

        $this->assertContains('Food', $names);
        $this->assertContains('Coffee', $names);
        $this->assertNotContains('Shopping', $names);
        $this->assertNotContains('Someone else', $names);
        $this->assertNotContains('Allowance', $names, 'type filter excludes income categories');
    }

    public function test_student_can_create_a_personal_income_category(): void
    {
        $student = $this->actingAsStudent();

        $this->postJson('/api/v1/categories', ['type' => 'income', 'name' => 'Tutoring', 'icon' => 'book-open'])
            ->assertCreated()
            ->assertJsonPath('data.type', 'income')
            ->assertJsonPath('data.is_default', false);

        $this->assertTrue($student->personalCategories()->where('name', 'Tutoring')->exists());
    }

    public function test_name_must_not_clash_with_a_default_or_own_category_of_the_same_type(): void
    {
        $this->actingAsStudent();

        $this->postJson('/api/v1/categories', ['type' => 'expense', 'name' => 'Food'])
            ->assertUnprocessable()->assertJsonValidationErrors('name');

        // Same name is fine for the other type.
        $this->postJson('/api/v1/categories', ['type' => 'income', 'name' => 'Food'])->assertCreated();
    }

    public function test_student_can_rename_and_deactivate_their_own_category_but_not_change_its_type(): void
    {
        $student = $this->actingAsStudent();
        $category = Category::factory()->forUser($student)->create(['name' => 'Coffee']);

        $this->putJson("/api/v1/categories/{$category->id}", ['name' => 'Coffee & Tea', 'is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.name', 'Coffee & Tea')
            ->assertJsonPath('data.is_active', false);

        $this->putJson("/api/v1/categories/{$category->id}", ['name' => 'X', 'is_active' => true, 'type' => 'income'])
            ->assertUnprocessable()->assertJsonValidationErrors('type');
    }

    public function test_default_and_other_students_categories_cannot_be_edited(): void
    {
        $this->actingAsStudent();
        $default = $this->defaultCategory('Food');
        $foreign = Category::factory()->forUser(User::factory()->create())->create();

        $this->putJson("/api/v1/categories/{$default->id}", ['name' => 'Hacked', 'is_active' => true])->assertNotFound();
        $this->putJson("/api/v1/categories/{$foreign->id}", ['name' => 'Hacked', 'is_active' => true])->assertNotFound();
        $this->assertSame('Food', $default->fresh()?->name);
    }

    public function test_default_income_categories_are_seeded(): void
    {
        $this->assertSame(7, Category::query()->defaults()->where('type', CategoryType::Income)->count());
        $this->assertSame(9, Category::query()->defaults()->where('type', CategoryType::Expense)->count());
    }
}
