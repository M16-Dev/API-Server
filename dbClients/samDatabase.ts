import { Client } from 'https://deno.land/x/mysql/mod.ts'
import SteamID from 'npm:steamid'
import { BanData } from '../types.ts'

const client = await new Client().connect({
    hostname: Deno.env.get('DB_HOSTNAME'),
    port: Number(Deno.env.get('DB_PORT')),
    username: Deno.env.get('DB_USERNAME'),
    db: 's4_sam',
    password: Deno.env.get('DB_PASSWORD')
})


type SamPlayer = {
    rank: string
    expiryDate: number
    firstJoin: number
    lastJoin: number
    playTime: number
}

export async function getSamPlayer(steamID: string): Promise<SamPlayer | undefined> {
    try {
        const steam2 = new SteamID(steamID).getSteam2RenderedID()
        
        const { rows } = await client.execute("SELECT rank, expiry_date AS expiryDate, first_join AS firstJoin, last_join AS lastJoin, play_time AS playTime FROM sam_players WHERE steamid = ?", [steam2])

        if (!rows?.length) return undefined
        
        return rows[0]
    } catch (e) {
        console.log(e)
        return undefined
    }
}

export async function getBanData(steamID: string): Promise<BanData | null> {
    try {
        const steam2 = new SteamID(steamID).getSteam2RenderedID()
        
        const { rows } = await client.execute("SELECT reason, unban_date AS unbanDate, admin FROM sam_bans WHERE steamid = ?", [steam2])
        
        if (!rows?.length) return null
        
        return rows[0]
    } catch (e) {
        console.log(e)
        return null
    }
}

type SecondaryRankData = {
    secondaryRank: string
    secondaryExpiryDate: number
}

export async function getSecondaryRankData(steamID: string): Promise<SecondaryRankData | null> {
    try {
        const { rows } = await client.execute("SELECT rank AS secondaryRank, expires AS secondaryExpiryDate FROM secondary_ranks WHERE steam_id = ?", [steamID])
        
        if (!rows?.length) return null
        
        return rows[0]
    } catch (e) {
        console.log(e)
        return null
    }
}

export async function getWarnPoints(steamID: string): Promise<number> {
    try {
        const { rows } = await client.execute("SELECT SUM(points) as pointSum FROM yaws_warns WHERE player = ?", [steamID])
        return rows?.[0]?.pointSum ?? 0
    } catch (e) {
        console.log(e)
        return 0
    }
}