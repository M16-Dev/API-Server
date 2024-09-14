import { Application, Request, Response } from 'express'
import SteamAuth from 'steam-openid'
import "jsr:@std/dotenv/load"


// Initialize Steam OpenID
const endpointForSteamAuth = '/auth/steam/return'
const steam = new SteamAuth({
    realm: Deno.env.get('DOMAIN'),
    returnUrl: Deno.env.get('DOMAIN') + endpointForSteamAuth,
    apiKey: Deno.env.get('STEAM_API_KEY')
})


export default (app: Application) => {
    app.get('/auth/steam', async (req: Request, res: Response) => {
        const url: string = await steam.getRedirectUrl().catch((err: string) => {
            return res.status(500).send(`Unable to get Steam authentication URL: ${err}`)
        })

        return res.status(302).redirect(url)
    })

    app.get(endpointForSteamAuth, async (req: Request, res: Response) => {
        const steamUser = await steam.authenticate(req).catch((err: string) => {
            return res.status(500).send(`Authentication failed: ${err}`)
        })

        req.session.steamUser = steamUser
        return res.redirect('https://fable.zone/')
    })

    app.get('/auth/steam/logout', async (req: Request, res: Response) => {
        await req.session.destroy()
        return res.redirect('https://fable.zone/')
    })

    app.get("/player", async (req: Request, res: Response) => {
        // const token: string = await getToken(req) as string
        // const steamID: string = await getSteamIDFromToken(token)
        
        return res.send(req.session.steamUser)
    })
}


/*
"/player": {
    methods: ["GET"],
    accessLevel: AccessLevels.USER,
    function: async (req, info) => {
        // TODO request player data from db
        const body = {
            hours: 10000,
            steamID: "76561198111111111",
            discordID: "11111111111111111",
            banned: false,
            primaryRank: null,
            secondaryRank: null
        }
        return new Response(JSON.stringify(body), { status: 501 })
    }
},
"/connect-accounts": {
    methods: ["POST"],
    accessLevel: AccessLevels.USER,
    function: async (req, info) => {
        let body
        try { body = await req.json() } catch (err) { return new Response(null, { status: 400 }) }
        const discordID = body?.discordID
        const steamID = body?.steamID

        if (!discordID || !steamID) return new Response(null, { status: 400 })

        // TODO validate and process request body

        return new Response('This endpoint is for internal infrastructure connections only', { status: 423 })
    }
},
"/payment/premium-points-purchase": {
    methods: ["POST"],
    accessLevel: AccessLevels.USER,
    function: async (req, info) => {
        console.log("uwu");
        
        let body
        console.log("uwu");
        try { body = await req.json() } catch (e) { return new Response(e, { status: 400 }) }
        const pointsPackage = config.pointsPackages[body.pointsPackage as keyof typeof config.pointsPackages]
        if (!pointsPackage)
            return new Response(null, { status: 400 })
        
        const token: string = await getToken(req) as string
        const steamID: string = await getSteamIDFromToken(token)
        
        const data = {
            title: "Zakup doładowania",
            amount: {
                value: pointsPackage.price,
                currencyCode: "PLN"
            },
            sign: sha1("Zakup doładowania" + pointsPackage.price + "PLN" + config.cashbill.secret, "utf-8", "hex")
        }
        
        const cashbillRes = await fetch(`https://pay.cashbill.pl/wstest/rest/payment/${config.cashbill.shopID}`, {
            method: "POST",
            body: JSON.stringify(data)
        })
        console.log(cashbillRes)
        return new Response(null, { status: cashbillRes.status })
    }
},
"/payment/cashbill/response": {
    methods: ["POST", "GET", "PUT", "PATCH"],
    accessLevel: AccessLevels.CASHBILL,
    function: async (req, info) => {
        console.log(req);
        return new Response(null, { status: 200 })
    }
},
"/admin/grant-bundle": {
    methods: ["POST"],
    accessLevel: AccessLevels.ADMIN,
    function: async (req, info) => {
        return new Response(null, { status: 501 })
    }
},
"/admin/player": {
    methods: ["GET"],
    accessLevel: AccessLevels.ADMIN,
    function: async (req, info) => {
        // TODO request player data from db
        const body = {
            hours: 10000,
            steamID: "76561198111111111",
            discordID: "11111111111111111",
            banned: false,
            adminRank: null,
            premiumRank: null
        }
        return new Response(JSON.stringify(body), { status: 501 })
    }
},
"/gmod/pending-bundles": {
    methods: ["GET"],
    accessLevel: AccessLevels.HIGHEST,
    function: async (req, info) => {
        // TODO request player data from db
        const body = {
            hours: 10000,
            steamID: "76561198111111111",
            discordID: "11111111111111111",
            banned: false,
            adminRank: null,
            premiumRank: null
        }
        return new Response(JSON.stringify(body), { status: 501 })
    }
},
*/