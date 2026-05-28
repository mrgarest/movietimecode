import { Head, usePage } from '@inertiajs/react'

interface Metadata {
    noIndex?: boolean
    noSiteName?: boolean
    title?: string
    description?: string
    image?: string
    canonicalUrl?: string
}

export function MetaTag({ title, description = undefined, noIndex = false, noSiteName = false, image = '/images/b35hj3.jpg', canonicalUrl = undefined }: Metadata) {
    const { url } = usePage()
    const pathname = new URL(url, 'http://localhost').pathname

    const fullTitle = noSiteName ? title : `${title} | Movie Timecode`;

    const baseUrl = 'https://movietimecode.mrgarest.com';
    canonicalUrl = canonicalUrl ? canonicalUrl : `${baseUrl}${pathname}`;
    const fullImageUrl = image.startsWith('http') ? image : `${baseUrl}${image}`;

    return (
        <Head>
            <title>{fullTitle}</title>

            <link rel="canonical" href={canonicalUrl} />

            {/* Basic SEO */}
            {description && <meta name="description" content={description} />}
            <meta name="robots" content={noIndex ? "noindex, nofollow" : "index, follow"} />

            {/* Open Graph */}
            <meta property="og:type" content="website" />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:title" content={fullTitle} />
            {description && <meta property="og:description" content={description} />}
            <meta property="og:image" content={fullImageUrl} />
            <meta property="og:site_name" content="Movie Timecode" />
            <meta property="og:locale" content="uk_UA" />

            {/* Twitter Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content={canonicalUrl} />
            <meta name="twitter:title" content={fullTitle} />
            {description && <meta name="twitter:description" content={description} />}
            <meta name="twitter:image" content={fullImageUrl} />
        </Head>
    )
}