import md5 from 'md5'

export function formatViewerId(viewerId: string) {
    return md5(viewerId)
}