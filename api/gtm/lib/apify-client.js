// Fetch results from an Apify dataset after a webhook fires.
// Apify webhooks send run metadata (not the data itself).
// We use the dataset ID to fetch the actual results.

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN

export async function fetchApifyDataset(datasetId, { limit = 1000, offset = 0 } = {}) {
  if (!APIFY_API_TOKEN) throw new Error('APIFY_API_TOKEN not configured')
  if (!datasetId) throw new Error('datasetId required')

  const url = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}&limit=${limit}&offset=${offset}&format=json`
  const res = await fetch(url)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Apify dataset fetch failed (${res.status}): ${text}`)
  }

  return res.json()
}

export async function fetchAllDatasetItems(datasetId) {
  const items = []
  let offset = 0
  const limit = 1000

  while (true) {
    const batch = await fetchApifyDataset(datasetId, { limit, offset })
    if (!batch.length) break
    items.push(...batch)
    if (batch.length < limit) break
    offset += limit
  }

  return items
}
