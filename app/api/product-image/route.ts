import { findMatchingProductImage, type CommonsImageSearchResult } from "@/lib/product-image";

export async function GET(request: Request) {
  const productName = new URL(request.url).searchParams.get("name")?.trim();
  if (!productName || productName.length > 120) {
    return Response.json({ error: "Provide a product name up to 120 characters long." }, { status: 400 });
  }

  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: productName,
    gsrnamespace: "6",
    gsrlimit: "10",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "1200",
    format: "json",
  });

  try {
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      headers: { "User-Agent": "Pricele/1.0 (https://github.com/SingleWebGame/Pricele)" },
      next: { revalidate: 86_400 },
    });
    if (!response.ok) {
      console.error(`Wikimedia image search returned ${response.status} for ${productName}.`);
      return Response.json({ error: "Product image search is unavailable." }, { status: 502 });
    }

    const searchResult = await response.json() as CommonsImageSearchResult;
    const image = findMatchingProductImage(productName, searchResult.query?.pages);
    return Response.json(
      { image },
      { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } },
    );
  } catch (error) {
    console.error(`Could not search Wikimedia for ${productName}.`, error);
    return Response.json({ error: "Product image search is unavailable." }, { status: 502 });
  }
}
