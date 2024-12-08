import { Client } from 'https://deno.land/x/mysql/mod.ts'

const client = await new Client().connect({
    hostname: Deno.env.get('DB_HOSTNAME'),
    port: Number(Deno.env.get('DB_PORT')),
    username: Deno.env.get('DB_USERNAME'),
    db: 's4_main',
    password: Deno.env.get('DB_PASSWORD')
})

export async function getCash(steamID: string): Promise<number> {
    try {
        const { rows } = await client.execute("SELECT wallet as cash FROM darkrp_player WHERE uid = ?", [steamID])
        return rows?.[0]?.cash ?? 0
    } catch (e) {
        console.log(e)
        return 0
    }
}