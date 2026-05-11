import { Head, usePage } from '@inertiajs/react'

interface Metadata {
    title?: string
    description?: string
    image?: string
}

export function MetaTag({ title, description, image = '/images/b35hj3.jpg' }: Metadata) {
    const { url } = usePage()
    const pathname = new URL(url, 'http://localhost').pathname
    const isHome = pathname === '/'

    const fullTitle = title
        ? isHome ? title : `${title} | Movie Timecode`
        : 'Movie Timecode'

    return (
        <Head>
            <title>{fullTitle}</title>
            {description && <meta name="description" content={description} />}
            {description && <meta property="og:description" content={description} />}
            <meta property="og:title" content={fullTitle} />
            <meta property="og:image" content={image} />
            <meta name="twitter:title" content={fullTitle} />
            {description && <meta name="twitter:description" content={description} />}
            <meta name="twitter:image" content={image} />
        </Head>
    )
}