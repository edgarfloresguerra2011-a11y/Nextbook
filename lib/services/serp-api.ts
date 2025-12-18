
export async function callSerpApi(query: string) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
      console.warn("No SERPAPI_KEY found. Returning mock data.");
      // Provide some realistic-looking "trends" for the demo if no key is present
      return {
          titles: [
             `The Future of ${query}: A 2025 Outlook`,
             `Why Everyone is Talking About ${query}`,
             `Essential Guide to ${query} for Beginners`,
             `${query} Mastery: Advanced Strategies`,
             `Top Trends in ${query} You Need to Know`
          ]
      };
  }

  try {
    const response = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}&num=5`);
    const data = await response.json();
    
    if (data.organic_results) {
        return {
            titles: data.organic_results.map((r: any) => r.title)
        };
    }
    return { titles: [] };
  } catch (e) {
      console.error("SerpApi fail", e);
      return { titles: [] };
  }
}
