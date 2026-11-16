import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { absoluteUrl, formatDate, getPost, imageUrl, ph } from '@/lib/payload'
import { Img } from '../../Img'
import { loadSite } from '../../site'

export const dynamic = 'force-static'
// Posts published after the last deploy are rendered on first visit, then cached.
export const dynamicParams = true

type Props = { params: Promise<{ domain: string; slug: string }> }

export const generateStaticParams = () => []

const load = async ({ params }: Props) => {
  const { domain, slug } = await params
  const site = await loadSite(domain)
  return { ...site, post: await getPost(site.tenant.id, slug) }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { post, siteUrl } = await load(props)
  if (!post) return {}
  const image = absoluteUrl(siteUrl, imageUrl(post.image, 'large'))
  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: `/news/${post.slug}` },
    openGraph: { type: 'article', title: post.title, description: post.summary, publishedTime: post.publishedDate, images: image ? [image] : undefined },
  }
}

export default async function PostPage(props: Props) {
  const { post } = await load(props)
  if (!post) notFound()

  return (
    <article className="article">
      <Link className="back" href="/news">← All news</Link>
      <h1><span className={ph(post.title)}>{post.title}</span></h1>
      <time dateTime={post.publishedDate}>{formatDate(post.publishedDate)}</time>
      {post.image && typeof post.image === 'object' && (
        <div className="cover"><Img media={post.image} size="large" label="" /></div>
      )}
      {post.body && <RichText data={post.body} className="prose" />}
    </article>
  )
}
