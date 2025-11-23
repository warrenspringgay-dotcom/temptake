// app/sitemap.ts
export default function sitemap() {
  return [
    {
      url: 'https://temptake.com',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://temptake.com/blog',        // even if 404 now — Google loves forward declaration
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: 'https://temptake.com/pricing',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ]
}