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

type WebhookData = {
    webhook: string
    user: EmbedUser
    color?: number
    title: string
    description?: string
    fields?: EmbedField[]
}

export async function sendWebhook(webhookData: WebhookData): Promise<void> {
    await fetch(webhookData.webhook, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            embeds: [
                {
                title: webhookData.title,
                description: webhookData.description,
                color: webhookData.color,
                fields: webhookData.fields,
                author: {
                    name: webhookData.user.name,
                    url: `https://steamcommunity.com/profiles/${webhookData.user.id}/`
                },
                footer: {
                    text: `SteamID: ${webhookData.user.id}`
                },
                timestamp: new Date().toISOString(),
                thumbnail: {
                    url: webhookData.user.avatar
                }
                }
            ],
            username: "Logi Sklep",
            avatar_url: "https://i.imgur.com/UqgqJCw.png",
        }),
    })
}