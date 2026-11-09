<?php

namespace App\DTO\Movie;

use App\Enums\MovieCompanyRole;
use App\Models\MovieCompany;
use Illuminate\Support\Str;

class MovieCompanData
{
    // Moderate risk
    public const HAZARD_MODERATE = 3;

    // High risk
    public const HAZARD_HIGH = 2;

    public function __construct(
        public int $id,
        public string $name,
        public int $hazardLevel,
        public MovieCompanyRole $role,
    ) {}

    public static function fromModel(MovieCompany $movieCompany): self
    {
        $nameLower = mb_strtolower($movieCompany->company->name);
        $hazardLevel = self::getHazardLevel($nameLower);

        return new self(
            id: $movieCompany->company_id,
            name: $movieCompany->company->name,
            hazardLevel: $hazardLevel,
            role: MovieCompanyRole::from($movieCompany->role_id)
        );
    }

    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'],
            name: $data['name'],
            hazardLevel: $data['hazard_level'],
            role: MovieCompanyRole::from($data['role_id'])
        );
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'hazard_level' => $this->hazardLevel,
            'role_id' => $this->role->value,
        ];
    }

    /**
     * Hazard level of the company by its lowercase name.
     */
    public static function getHazardLevel(string $nameLower): int
    {
        foreach (self::hazardKeywordsByLevel() as $level => $keywords) {
            if (Str::contains($nameLower, $keywords)) return $level;
        }

        return 0;
    }

    /**
     * Keywords of hazardous companies by hazard level (the order matters).
     *
     * @return array<int, string[]>
     */
    public static function hazardKeywordsByLevel(): array
    {
        return config('movie.hazard_companies');
    }

    /**
     * All keywords of hazardous companies.
     *
     * @return string[]
     */
    public static function hazardKeywords(): array
    {
        return array_merge(...array_values(self::hazardKeywordsByLevel()));
    }
}
