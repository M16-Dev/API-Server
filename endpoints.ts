import { Application, Request, Response, NextFunction } from 'express'
import SteamAuth from 'steam-openid'
import "jsr:@std/dotenv/load"
import * as db from './database.ts'
import config from './config.json' with { type: "json" }


// Initialize Steam OpenID
const endpointForSteamAuth = '/auth/steam/return'
const steam = new SteamAuth({
    realm: Deno.env.get('DOMAIN'),
    returnUrl: Deno.env.get('DOMAIN') + endpointForSteamAuth,
    apiKey: Deno.env.get('STEAM_API_KEY')
})


export default (app: Application) => {

    // ! ---- Endpoints for steam auth ---------------------------------------------------

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

    // * ---- Applying middleware --------------------------------------------------------

    app.use(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.session.steamUser)
            return res.status(401).send('Not authorized')
        next()
    })

    // ! ---- Endpoints restricted to authenticated users --------------------------------

    app.get('/logout', async (req: Request, res: Response) => {
        await req.session.destroy()
        return res.redirect('https://fable.zone/')
    })

    app.get("/player", async (req: Request, res: Response) => {
        return res.send(req.session.steamUser)
    })

    app.get("/points", async (req: Request, res: Response) => {
        const points: number = await db.getPoints(req.session.steamUser.steamid)

        return res.json({ points: points })
    })

    app.post("/bundle-purchase", async (req: Request, res: Response) => {
        const requestedBundle: string = req.body.bundle
        if (!(requestedBundle in config.bundles))
            return res.status(400).send("Provided bundle code is not related with any existing bundle.")

        const points: number = await db.getPoints(req.session.steamUser.steamid)
        const bundlePrice: number = config.bundles[requestedBundle as keyof typeof config.bundles].price
        if (points < bundlePrice)
            return res.status(400).send(`Insufficient funds for this purchase. Missing ${bundlePrice - points} points.`)

        const queryRes: boolean = await db.addPoints(req.session.steamUser.steamid, -bundlePrice)
        if (!queryRes)
            return res.status(500).send("Failed to purchase bundle. Your funds have not changed.")

        return res.status(200).send(`Purchase successful.`)
    })
}