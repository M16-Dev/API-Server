import { Client } from 'https://deno.land/x/mysql/mod.ts'

const client = await new Client().connect({
    hostname: Deno.env.get('DB_HOSTNAME'),
    port: Number(Deno.env.get('DB_PORT')),
    username: Deno.env.get('DB_USERNAME'),
    db: 'api_v4',
    password: Deno.env.get('DB_PASSWORD')
})


export async function getPoints(steamID: string): Promise<number | boolean> {
    try {
        const { rows } = await client.execute("SELECT points FROM points WHERE steam_id = ?", [steamID])
        return rows?.[0]?.points ?? 0
    } catch (e) {
        console.log(e)
        return false
    }
}

export async function addPoints(steamID: string, points: number): Promise<boolean> {
    try {
        const res = await client.execute(`
            INSERT INTO points (steam_id, points)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE
            points = points + ?`, 
            [steamID, points, points])

        const success = !!res?.affectedRows

        if (success)
            client.execute(`
                INSERT INTO points_logs (steam_id, points_added) VALUES (?, ?)`, [steamID, points])
        
        return success
    } catch (e) {
        console.log(e)
        return false
    }
}

export async function bundlePurchase(steamID: string, bundleCode: string, price: number): Promise<boolean> {
    try {
        const res = await client.execute(`INSERT INTO bundles_purchased (steam_id, bundle, price) VALUES (?, ?, ?)`, [steamID, bundleCode, price])
        return !!res?.affectedRows
    } catch (e) {
        console.log(e)
        return false
    }
}

export async function connectAccounts(steamID: string, discordID: string): Promise<boolean> {
    try {
        const res = await client.execute(`INSERT INTO steam_discord_ids (steam_id, discord_id) VALUES (?, ?)`, [steamID, discordID])
        return !!res?.affectedRows
    } catch (e) {
        console.log(e)
        return false
    }
}

export async function getSteamID(discordID: string): Promise<string | false> {
    try {
        const { rows } = await client.execute("SELECT steam_id FROM steam_discord_ids WHERE discord_id = ?", [discordID])
        return rows?.[0]?.steam_id ?? false
    } catch (e) {
        console.log(e)
        return false
    }
}

export async function getDiscordID(steamID: string): Promise<string | false> {
    try {
        const { rows } = await client.execute("SELECT discord_id FROM steam_discord_ids WHERE steam_id = ?", [steamID])
        return rows?.[0]?.discord_id ?? false
    } catch (e) {
        console.log(e)
        return false
    }
}

export async function getPointsLogs(steamID: string): Promise<Array<{ points_added: number, timestamp: string }> | false> {
    try {
        const { rows } = await client.execute("SELECT points_added, log_time FROM points_logs WHERE steam_id = ?", [steamID])
        return rows ?? false
    } catch (e) {
        console.log(e)
        return false
    }
}