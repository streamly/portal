export interface VideoHit {
    id: string
    uid: string
    cid: number
    billing: number
    company: string
    people: string[]
    created: number
    description: string
    duration: number
    ranking: number
    score: number
    title: string
    gated: 0 | 1
    channel: string
    __position: number
}