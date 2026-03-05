<div class="sticky top-0 left-0 right-0">
    <div class="h-14 px-3 flex items-center justify-center gap-3 bg-background">
        @foreach ($navItems as $item)
            <a class="text-sm text-muted-foreground hover:text-foreground font-medium duration-300 p-1{!! $item['mobileHide'] ? ' max-sm:hidden' : '' !!}"
                href="{{ $item['href'] }}"{!! $item['blank'] ? ' target="_blank"' : '' !!}>{{ $item['text'] }}</a>
        @endforeach
    </div>
    <div class="bg-gradient-to-b from-background/80 to-transparent h-2"></div>
</div>
