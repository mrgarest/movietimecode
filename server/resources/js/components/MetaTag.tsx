import { Head, usePage } from '@inertiajs/react'

interface Metadata {
    noIndex?: boolean
    noFollow?: boolean
    noSiteName?: boolean
    title?: string
    description?: string
    image?: string
    canonicalUrl?: string
}

const truncate = (text: string, max = 155) =>
    text.length > max ? text.slice(0, max).trimEnd() + '…' : text;

export function MetaTag({ title, description = undefined, noIndex = false, noFollow = noIndex, noSiteName = false, image = '/images/b35hj3.jpg', canonicalUrl = undefined }: Metadata) {
    const { url } = usePage()
    const pathname = new URL(url, 'http://localhost').pathname
    const truncatedDescription = description ? truncate(description) : undefined;

    const fullTitle = noSiteName ? title : `${title} | Movie Timecode`;

    const baseUrl = 'https://movietimecode.garest.net';
    canonicalUrl = canonicalUrl ? canonicalUrl : `${baseUrl}${pathname}`;
    const fullImageUrl = image.startsWith('http') ? image : `${baseUrl}${image}`;

    return (
        <Head>
            <title>{fullTitle}</title>

            <link rel="canonical" href={canonicalUrl} />

            {/* Basic SEO */}
            {truncatedDescription && <meta name="description" content={truncatedDescription} />}
            <meta name="robots" content={`${noIndex ? 'noindex' : 'index'}, ${noFollow ? 'nofollow' : 'follow'}`} />

            {/* Open Graph */}
            <meta property="og:type" content="website" />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:title" content={fullTitle} />
            {truncatedDescription && <meta property="og:description" content={truncatedDescription} />}
            <meta property="og:image" content={fullImageUrl} />
            <meta property="og:site_name" content="Movie Timecode" />
            <meta property="og:locale" content="uk_UA" />

            {/* Twitter Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content={canonicalUrl} />
            <meta name="twitter:title" content={fullTitle} />
            {truncatedDescription && <meta name="twitter:description" content={truncatedDescription} />}
            <meta name="twitter:image" content={fullImageUrl} />
        </Head>
    )
}