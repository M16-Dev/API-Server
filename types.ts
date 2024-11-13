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
    expiration: number
    reason?: string
    admin: string
}

export type PlayerData = {
    steamID: string
    discordID?: string
    rank: string
    secondaryRank: string | null
    ban: BanData | null
    playTime: number
    warnPoints: number

}