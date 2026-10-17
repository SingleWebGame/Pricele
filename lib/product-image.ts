export type CommonsImagePage = {
  title: string;
  imageinfo?: {
    thumburl?: string;
    descriptionurl?: string;
    extmetadata?: {
      Artist?: { value?: string };
      LicenseShortName?: { value?: string };
    };
  }[];
};

export type CommonsImageSearchResult = {
  query?: {
    pages?: Record<string, CommonsImagePage>;
  };
};

export type ProductImageResult = {
  url: string;
  descriptionUrl: string | null;
  attribution: string;
  license: string;
};

const imageSearchStopWords = new Set(["a", "an", "and", "for", "in", "of", "the", "with", "inch"]);

function plainText(value: string | undefined): string {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function findMatchingProductImage(
  productName: string,
  pages: Record<string, CommonsImagePage> | undefined,
): ProductImageResult | null {
  if (!pages) return null;
  const productTerms = productName.toLowerCase().match(/[a-z0-9]+/g)?.filter((term) => !imageSearchStopWords.has(term)) ?? [];
  if (productTerms.length === 0) return null;

  let bestMatch: { photo: ProductImageResult; score: number } | null = null;
  for (const page of Object.values(pages)) {
    const titleTerms = new Set(page.title.toLowerCase().match(/[a-z0-9]+/g) ?? []);
    const matchedTerms = productTerms.filter((term) => titleTerms.has(term)).length;
    const score = matchedTerms / productTerms.length;
    const imageInfo = page.imageinfo?.[0];
    const url = imageInfo?.thumburl;
    if (url && score >= 0.8 && (!bestMatch || score > bestMatch.score)) {
      const descriptionUrl = imageInfo.descriptionurl;
      let commonsDescriptionUrl: string | null = null;
      if (descriptionUrl) {
        try {
          const parsedUrl = new URL(descriptionUrl);
          if (parsedUrl.protocol === "https:" && parsedUrl.hostname === "commons.wikimedia.org") {
            commonsDescriptionUrl = parsedUrl.href;
          }
        } catch {
          commonsDescriptionUrl = null;
        }
      }
      bestMatch = {
        photo: {
          url,
          descriptionUrl: commonsDescriptionUrl,
          attribution: plainText(imageInfo.extmetadata?.Artist?.value),
          license: plainText(imageInfo.extmetadata?.LicenseShortName?.value),
        },
        score,
      };
    }
  }
  return bestMatch?.photo ?? null;
}
