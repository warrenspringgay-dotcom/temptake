// src/app/launch/head.tsx

export default function Head() {
  const title = "TempTake – Food safety checks done properly";
  const description =
    "TempTake replaces messy paper logs with simple daily routines for temperatures, cleaning and allergens – built for real UK kitchens.";

  const url = "https://temptake.com/public/logo.png";
  const ogImage = "https://temptake.com/public/logo.png"; // change to your real OG image path

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index,follow" />

      {/* Canonical */}
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content="TempTake" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content="TempTake app showing food safety checks dashboard" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Basic JSON-LD for the software product */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "TempTake",
            applicationCategory: "BusinessApplication",
            operatingSystem: "iOS, Android, Web",
            url,
            offers: {
              "@type": "Offer",
              price: "9.99",
              priceCurrency: "GBP",
            },
            description,
          }),
        }}
      />
    </>
  );
}
