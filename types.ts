type EmbedField = {
    name: string
    value: string
    inline: boolean
}
type EmbedUser = {
    id: string
    name: string
    avatar?: string
}

export type WebhookData = {
    webhook: string
    user: EmbedUser
    color?: number
    title: string
    description?: string
    fields?: EmbedField[]
}


export type BanData = {
    unbanDate: number
    reason?: string
    admin: string
}

export type PlayerData = {
    steamID: string
    discordID?: string
    points: number
    rank?: string
    expiryDate?: number
    secondaryRank: string | null
    secondaryExpiryDate: number | null
    firstJoin?: number
    lastJoin?: number
    playTime: number
    ban: BanData | null
    warnPoints: number
}