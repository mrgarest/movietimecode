import { ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownUp, ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { MovieGenre, MovieListFilters, MovieListSort, MovieRecommendationColor, MovieYearRange } from '@/types/movie';

const SORTS: MovieListSort[] = ['added', 'release_desc', 'release_asc'];
const RECOMMENDATIONS: MovieRecommendationColor[] = ['green', 'yellow', 'red'];
const RATINGS = [5, 6, 7, 8];

const SORT_LABEL_KEYS: Record<MovieListSort, string> = {
    added: 'sortAdded',
    release_desc: 'sortReleaseDesc',
    release_asc: 'sortReleaseAsc',
};

const RECOMMENDATION_LABEL_KEYS: Record<MovieRecommendationColor, string> = {
    green: 'recommendationGreen',
    yellow: 'recommendationYellow',
    red: 'recommendationRed',
};

const RECOMMENDATION_DOT_CLASSES: Record<MovieRecommendationColor, string> = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-destructive',
};

export const DEFAULT_FILTERS: MovieListFilters = {
    genres: [],
    recommendations: [],
    year_from: null,
    year_to: null,
    rating: null,
    sort: 'added',
};

/**
 * Brings the filters to one form (the same as the server does), so equal filters give equal URLs and cache keys.
 */
export function normalizeFilters(filters: MovieListFilters): MovieListFilters {
    let { year_from, year_to } = filters;
    if (year_from !== null && year_to !== null && year_from > year_to) [year_from, year_to] = [year_to, year_from];

    return {
        ...filters,
        genres: [...new Set(filters.genres)].sort(),
        recommendations: RECOMMENDATIONS.filter(r => filters.recommendations.includes(r)),
        year_from,
        year_to,
    };
}

/**
 * Query string of the filters without default values (commas are kept readable).
 */
export function filtersToQuery(filters: MovieListFilters): string {
    const params = new URLSearchParams();

    if (filters.genres.length) params.set('genre', filters.genres.join(','));
    if (filters.recommendations.length) params.set('recommendation', filters.recommendations.join(','));
    if (filters.year_from !== null) params.set('year_from', String(filters.year_from));
    if (filters.year_to !== null) params.set('year_to', String(filters.year_to));
    if (filters.rating !== null) params.set('rating', String(filters.rating));
    if (filters.sort !== DEFAULT_FILTERS.sort) params.set('sort', filters.sort);

    return params.toString().replace(/%2C/g, ',');
}

function parseYear(value: string, range: MovieYearRange): number | null {
    const year = parseInt(value, 10);
    return Number.isInteger(year) && year >= range.min && year <= range.max ? year : null;
}

function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter(v => v !== value) : [...list, value];
}

/**
 * Selectable chip in the filters panel.
 */
function FilterChip({ active, onClick, children }: { active: boolean, onClick: () => void, children: ReactNode }) {
    return <span
        role="button"
        tabIndex={0}
        aria-pressed={active}
        onClick={onClick}
        onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
            }
        }}
        className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium select-none cursor-pointer duration-300",
            active
                ? "border-primary bg-primary text-primary-foreground hover:opacity-80"
                : "border-border bg-secondary text-secondary-foreground hover:opacity-60"
        )}
    >{children}</span>;
}

function FilterSection({ title, children }: { title: string, children: ReactNode }) {
    return <div className="space-y-3">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="flex flex-wrap gap-2">{children}</div>
    </div>;
}

function RecommendationDot({ color }: { color: MovieRecommendationColor }) {
    return <span className={cn("size-2 rounded-full", RECOMMENDATION_DOT_CLASSES[color])} />;
}

interface SortMenuProps {
    sort: MovieListSort
    onChange: (sort: MovieListSort) => void
}

/**
 * Dropdown with the sort of the list, applied immediately.
 */
export function MovieListSortMenu({ sort, onChange }: SortMenuProps) {
    const { t } = useTranslation();

    return <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-full" aria-label={t('sorting')}>
                <ArrowDownUp />
                <span className="text-xs sm:text-sm">{t(SORT_LABEL_KEYS[sort])}</span>
                <ChevronDown className="opacity-60" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={sort} onValueChange={(value) => onChange(value as MovieListSort)}>
                {SORTS.map(item => <DropdownMenuRadioItem
                    key={item}
                    value={item}
                    className="cursor-pointer"
                >{t(SORT_LABEL_KEYS[item])}</DropdownMenuRadioItem>)}
            </DropdownMenuRadioGroup>
        </DropdownMenuContent>
    </DropdownMenu>;
}

interface FilterSheetProps {
    filters: MovieListFilters
    genres: MovieGenre[]
    yearRange: MovieYearRange
    onApply: (filters: MovieListFilters) => void
}

/**
 * Side panel with filters, applied by the confirm button.
 */
export function MovieListFilterSheet({ filters, genres, yearRange, onApply }: FilterSheetProps) {
    const { t } = useTranslation();

    const sortedGenres = useMemo(
        () => [...genres].sort((a, b) => a.name.localeCompare(b.name, 'uk')),
        [genres]
    );

    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<MovieListFilters>(filters);
    const [yearFrom, setYearFrom] = useState('');
    const [yearTo, setYearTo] = useState('');

    const handleOpenChange = (value: boolean) => {
        if (value) {
            setDraft(filters);
            setYearFrom(filters.year_from?.toString() ?? '');
            setYearTo(filters.year_to?.toString() ?? '');
        }
        setOpen(value);
    };

    const update = (patch: Partial<MovieListFilters>) => setDraft(prev => ({ ...prev, ...patch }));

    // The sort is changed by its own menu, so it is kept
    const reset = () => {
        setDraft({ ...DEFAULT_FILTERS, sort: draft.sort });
        setYearFrom('');
        setYearTo('');
    };

    const apply = () => {
        setOpen(false);
        onApply(normalizeFilters({
            ...draft,
            year_from: parseYear(yearFrom, yearRange),
            year_to: parseYear(yearTo, yearRange),
        }));
    };

    const isDefault = filtersToQuery(normalizeFilters({ ...draft, sort: DEFAULT_FILTERS.sort })) === '' && !yearFrom && !yearTo;
    const currentYear = new Date().getFullYear();

    // Count of the applied filters (the sort is not counted)
    const appliedCount = filters.genres.length
        + filters.recommendations.length
        + (filters.year_from !== null || filters.year_to !== null ? 1 : 0)
        + (filters.rating !== null ? 1 : 0);

    return <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-full">
                <SlidersHorizontal />
                <span className="text-xs sm:text-sm">{t('filters')}</span>
                {appliedCount > 0 && <span className="sm:hidden flex size-4 items-center justify-center rounded-full bg-primary text-[10px] leading-none text-primary-foreground">
                    {appliedCount}
                </span>}
            </Button>
        </SheetTrigger>
        <SheetContent side="right" className="gap-0">
            <SheetHeader>
                <SheetTitle>{t('filters')}</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
                <FilterSection title={t('recommendation')}>
                    {RECOMMENDATIONS.map(color => <FilterChip
                        key={color}
                        active={draft.recommendations.includes(color)}
                        onClick={() => update({ recommendations: toggle(draft.recommendations, color) })}
                    >
                        <RecommendationDot color={color} />
                        {t(RECOMMENDATION_LABEL_KEYS[color])}
                    </FilterChip>)}
                </FilterSection>

                <div className="space-y-3">
                    <div className="text-sm font-medium text-foreground">{t('releaseYear')}</div>
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            inputMode="numeric"
                            min={yearRange.min}
                            max={Math.min(currentYear, yearRange.max)}
                            placeholder={t('from')}
                            value={yearFrom}
                            onChange={(e) => setYearFrom(e.target.value)}
                        />
                        <span className="text-muted-foreground">—</span>
                        <Input
                            type="number"
                            inputMode="numeric"
                            min={yearRange.min}
                            max={Math.min(currentYear, yearRange.max)}
                            placeholder={t('to')}
                            value={yearTo}
                            onChange={(e) => setYearTo(e.target.value)}
                        />
                    </div>
                </div>

                <FilterSection title={t('ratingImdb')}>
                    {RATINGS.map(rating => <FilterChip
                        key={rating}
                        active={draft.rating === rating}
                        onClick={() => update({ rating: draft.rating === rating ? null : rating })}
                    >{rating}+</FilterChip>)}
                </FilterSection>

                <FilterSection title={t('genres')}>
                    {sortedGenres.map(genre => <FilterChip
                        key={genre.slug}
                        active={draft.genres.includes(genre.slug)}
                        onClick={() => update({ genres: toggle(draft.genres, genre.slug) })}
                    >{genre.name}</FilterChip>)}
                </FilterSection>
            </div>
            <SheetFooter className="flex-row border-t border-border gap-4">
                <Button
                    variant="outline"
                    className="flex-1"
                    disabled={isDefault}
                    onClick={reset}
                >{t('reset')}</Button>
                <Button className="flex-1" onClick={apply}>{t('confirm')}</Button>
            </SheetFooter>
        </SheetContent>
    </Sheet>;
}

interface ActiveFiltersProps {
    filters: MovieListFilters
    selectedGenres: MovieGenre[]
    onChange: (filters: MovieListFilters) => void
}

/**
 * Row of the applied filters, each one is removed by its X.
 */
export function MovieListActiveFilters({ filters, selectedGenres, onChange }: ActiveFiltersProps) {
    const { t } = useTranslation();

    const chips: { key: string, label: ReactNode, remove: Partial<MovieListFilters> }[] = [];

    filters.recommendations.forEach(color => chips.push({
        key: `recommendation-${color}`,
        label: <><RecommendationDot color={color} />{t(RECOMMENDATION_LABEL_KEYS[color])}</>,
        remove: { recommendations: filters.recommendations.filter(r => r !== color) },
    }));

    if (filters.year_from !== null || filters.year_to !== null) chips.push({
        key: 'year',
        label: filters.year_from !== null && filters.year_to !== null
            ? (filters.year_from === filters.year_to ? filters.year_from : `${filters.year_from}–${filters.year_to}`)
            : filters.year_from !== null
                ? `${t('from')} ${filters.year_from}`
                : `${t('to')} ${filters.year_to}`,
        remove: { year_from: null, year_to: null },
    });

    if (filters.rating !== null) chips.push({
        key: 'rating',
        label: `IMDb ${filters.rating}+`,
        remove: { rating: null },
    });

    selectedGenres.forEach(genre => chips.push({
        key: `genre-${genre.slug}`,
        label: genre.name,
        remove: { genres: filters.genres.filter(g => g !== genre.slug) },
    }));

    // On small screens the applied filters are only visible in the filters panel
    return <div className="hidden sm:flex flex-1 flex-wrap items-center gap-2 min-h-8">
        {chips.map(chip => <span
            key={chip.key}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary py-1 pl-2.5 pr-1.5 text-xs font-medium text-secondary-foreground select-none"
        >
            {chip.label}
            <button
                type="button"
                onClick={() => onChange({ ...filters, ...chip.remove })}
                aria-label={t('resetFilter')}
                title={t('resetFilter')}
                className="-ml-0.5 rounded-full p-0.5 cursor-pointer duration-300 hover:opacity-60"
            >
                <X className="size-3" strokeWidth={3} />
            </button>
        </span>)}
    </div>;
}
