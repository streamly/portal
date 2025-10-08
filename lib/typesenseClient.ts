import Typesense from 'typesense'


const TYPESENSE_HOST = process.env.TYPESENSE_HOST!
const TYPESENSE_ADMIN_KEY = process.env.TYPESENSE_ADMIN_KEY!
const TYPESENSE_SEARCH_KEY = process.env.TYPESENSE_SEARCH_KEY!


const typesenseClient = new Typesense.Client({
    nodes: [
        {
            host: TYPESENSE_HOST,
            port: 443,
            protocol: "https",
        },
    ],
    apiKey: TYPESENSE_ADMIN_KEY,
    connectionTimeoutSeconds: 2,
})


export function generatePortalScopedKey(filterBy: string, sortBy: string) {
    return typesenseClient
        .keys()
        .generateScopedSearchKey(TYPESENSE_SEARCH_KEY, {
            filter_by: filterBy,
            sort_by: sortBy,
            include_fields: 'id,uid,cid,title,description,company,people,gated,duration,created,billing,score,ranking'
        })
}