import { Client } from 'https://deno.land/x/mysql/mod.ts'

const api_v4 = await new Client().connect({
    hostname: Deno.env.get('DB_HOSTNAME'),
    port: Number(Deno.env.get('DB_PORT')),
    username: Deno.env.get('DB_USERNAME'),
    db: Deno.env.get('DB_DB'),
    password: Deno.env.get('DB_PASSWORD')
})


export async function getPoints(steamID: string): Promise<number | boolean> {
    try {
        const { rows } = await api_v4.execute("SELECT points FROM points WHERE steam_id = ?", [steamID])
        return rows?.[0]?.points ?? 0
    } catch (e) {
        console.log(e)
        return false
    }
}

export async function addPoints(steamID: string, points: number): Promise<boolean> {
    try {
        const res = await api_v4.execute(`
            INSERT INTO points (steam_id, points)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE
            points = points + ?`, 
            [steamID, points, points])

        const success = !!res?.affectedRows

        if (success)
            api_v4.execute(`
                INSERT INTO points_logs (steam_id, points_added) VALUES (?, ?)`, [steamID, points])
        
        return success
    } catch (e) {
        console.log(e)
        return false
    }
}

export async function bundlePurchase(steamID: string, bundleCode: string, price: number): Promise<boolean> {
    try {
        const res = await api_v4.execute(`INSERT INTO bundles_purchased (steam_id, bundle, price) VALUES (?, ?, ?)`, [steamID, bundleCode, price])
        return !!res?.affectedRows
    } catch (e) {
        console.log(e)
        return false
    }
}

export async function connectAccounts(steamID: string, discordID: string): Promise<boolean> {
    try {
        const res = await api_v4.execute(`INSERT INTO steam_discord_ids (steam_id, discord_id) VALUES (?, ?)`, [steamID, discordID])
        return !!res?.affectedRows
    } catch (e) {
        console.log(e)
        return false
    }
}