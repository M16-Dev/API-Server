import { Client } from "https://deno.land/x/mysql/mod.ts"
import { SteamID } from 'https://deno.land/x/steamid@v1.2.0/mod.ts';

const api_v4 = await new Client().connect({
    hostname: "mws02.mikr.us",
    port: 50183,
    username: "api_v4",
    db: "api_v4",
    password: "dHJ!$!@SKdhASUILDHas7iod127od5#@a7hdlad12"
})

const api_v3 = await new Client().connect({
    hostname: "mws02.mikr.us",
    port: 50183,
    username: "api_v4",
    db: "api_v3",
    password: "dHJ!$!@SKdhASUILDHas7iod127od5#@a7hdlad12"
})

export async function getSteamIDFromToken(token: string): Promise<string> {
    const { rows } = await api_v4.execute("SELECT steam_id FROM tokens WHERE token = ?", [token])

    return rows[0]?.steam_id
}

export async function getTokenSteamIDPairs(): Promise<Record<string, string>> {
    const { rows } = await api_v4.execute("SELECT * FROM tokens")

    const result: Record<string, string> = {}

    rows.forEach(obj => result[obj.token] = obj.steam_id);

    return result
}

export async function getTokens(): Promise<Array<string>> {
    const { rows } = await api_v4.execute("SELECT token FROM tokens")

    return rows?.map(x => x.token) as Array<string>
}

export async function getPlayerData(steamID: string) {
    const { rows } = await client.execute("SELECT token FROM tokens")
}