import { Client } from 'https://deno.land/x/mysql/mod.ts'
import SteamID from 'npm:steamid'
import { BanData } from './types.ts'

const client = await new Client().connect({
    hostname: Deno.env.get('DB_HOSTNAME'),
    port: Number(Deno.env.get('DB_PORT')),
    username: Deno.env.get('DB_USERNAME'),
    db: 's4_sam',
    password: Deno.env.get('DB_PASSWORD')
})


type SamPlayer = {
    rank: string
    playTime: number
}

export async function getSamPlayer(steamID: string): Promise<SamPlayer | undefined> {
    try {
        const steam2 = new SteamID(steamID).getSteam2RenderedID()
        
        const { rows } = await client.execute("SELECT rank, play_time FROM sam_players WHERE steamid = ?", [steam2])

        if (!rows?.length) return undefined
        
        const { play_time, ...rest } = rows[0];
        const samPlayer: SamPlayer = { playTime: play_time, ...rest };
        
        return samPlayer
    } catch (e) {
        console.log(e)
        return undefined
    }
}

export async function getBanData(steamID: string): Promise<BanData | null> {
    try {
        const steam2 = new SteamID(steamID).getSteam2RenderedID()
        
        const { rows } = await client.execute("SELECT reason, unban_date, admin FROM sam_bans WHERE steamid = ?", [steam2])
        
        if (!rows?.length) return null
        
        const { unban_date, ...rest } = rows[0]
        const banData: BanData = { unbanDate: unban_date, ...rest }
        
        return banData
    } catch (e) {
        console.log(e)
        return null
    }
}

export async function getSecondaryRank(steamID: string): Promise<string | null> {
    try {
        const { rows } = await client.execute("SELECT rank FROM secondary_ranks WHERE steam_id = ?", [steamID])
        
        return rows?.[0]?.rank ?? null
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