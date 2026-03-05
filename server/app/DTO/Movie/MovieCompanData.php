<?php

namespace App\DTO\Movie;

use App\Enums\MovieCompanyRole;
use App\Models\MovieCompany;
use Illuminate\Support\Str;

class MovieCompanData
{
    public function __construct(
        public int $id,
        public string $name,
        public int $hazardLevel,
        public MovieCompanyRole $role,
    ) {}

    public static function fromModel(MovieCompany $movieCompany): self
    {
        $nameLower = mb_strtolower($movieCompany->company->name);
        $hazardLevel = match (true) {
            Str::contains($nameLower, ['marvel']) => 3,
            Str::contains($nameLower, ['warner', 'disney', 'netflix', 'apple', 'hbo', 'amazon', 'crunchyroll']) => 2,
            default => 0,
        };

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
}
