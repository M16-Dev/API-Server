import express, { Application, Request, Response, NextFunction } from 'express'
import SteamAuth from 'steam-openid'
import * as db from './database.ts'
import * as tebex from './tebex.ts'
import config from './config.json' with { type: "json" }


// Initialize Steam OpenID
const steam = new SteamAuth({
    realm: Deno.env.get('DOMAIN'),
    returnUrl: Deno.env.get('DOMAIN') + '/public/auth/steam/return',
    apiKey: Deno.env.get('STEAM_API_KEY')
})



// ? Routes that are open

const notRestricted = express.Router()

notRestricted.get("/uwu", async (req: Request, res: Response) => {
    return res.status(200).send("uwu!")
})

notRestricted.get('/auth/steam', async (req: Request, res: Response) => {
    const url: string = await steam.getRedirectUrl().catch((err: string) => {
        return res.status(500).send(`Unable to get Steam authentication URL: ${err}`)
    })

    return res.status(302).redirect(url)
})

notRestricted.get('/auth/steam/return', async (req: Request, res: Response) => {
    const steamUser = await steam.authenticate(req).catch((err: string) => {
        return res.status(500).send(`Authentication failed: ${err}`)
    })

    req.session.steamUser = steamUser
    // console.log(req.sessionID)
    return res.redirect('https://sklep.fable.zone/')
})



// ? Routes that require steam authentication

const steamAuthRestricted = express.Router()
steamAuthRestricted.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.session.steamUser)
        return res.status(401).send('Not authorized')
    next()
})

steamAuthRestricted.get('/logout', async (req: Request, res: Response) => {
    await req.session.destroy()
    return res.redirect('https://sklep.fable.zone/')
})

steamAuthRestricted.get("/player", async (req: Request, res: Response) => {
    return res.send(req.session.steamUser)
})

steamAuthRestricted.get("/points", async (req: Request, res: Response) => {
    const points: number = await db.getPoints(req.session.steamUser.steamid)

    return res.json({ points: points })
})

steamAuthRestricted.post("/bundle-purchase", async (req: Request, res: Response) => {
    const requestedBundle: string = req.body?.bundle
    if (!(requestedBundle in config.bundles))
        return res.status(400).send("Provided bundle code is not related with any existing bundle.")

    const steamID: string = req.session.steamUser.steamid

    const points: number = await db.getPoints(steamID)

    const bundlePrice: number = config.bundles[requestedBundle as keyof typeof config.bundles].price
    if (points < bundlePrice)
        // return res.status(400).send(`Insufficient funds for this purchase. Missing ${bundlePrice - points} points.`)
        return res.status(400).send(`Niewystarczające środki na zakup. Brakuje ${bundlePrice - points} punktów.`)

    const payQueryRes: boolean = await db.addPoints(steamID, -bundlePrice)
    if (!payQueryRes)
        // return res.status(500).send("Failed to purchase bundle. Your funds have not changed.")
        return res.status(500).send("Nie udało się zakupić paczki. Twoje środki nie zostały zabrane.")

    const bundleQueryRes: boolean = await db.bundlePurchase(steamID, requestedBundle, bundlePrice)
    if (!bundleQueryRes)
        // return res.status(500).send("Failed to purchase bundle. Your funds could have changed. If you encountered this response, please contact an administrator.")
        return res.status(500).send("Nie udało się zakupić paczki. Twoje środki mogły zostać zabrane. Jeśli napotkałeś ten błąd, skontaktuj się z administratorem.")
    return res.status(200).send(`Zakupiono pakiet! Wszystkie rzeczy zostaną za chwilę dodane do Twojego konta.`)
})

// do wyjebania/przerobienia
steamAuthRestricted.post("/points-purchase/cashbil", async (req: Request, res: Response) => {

    return res.status(501).send("Cashbil is not supported yet Use Tebex instead.")
})


// tebex
const tebexRestricted = express.Router()
tebexRestricted.use((req: Request, res: Response, next: NextFunction) => {
    // console.log(req.session)
    if (!(tebex.checkIP(req.ip) && tebex.checkSignature(req)))
        return res.status(401).json(`You're not from tebex! Who let's you in there? WHO DO YOU WORK FOR!`)
    next()
})

tebexRestricted.post("/points-purchase", async (req: Request, res: Response) => {
    // check if request is from Tebex

    // if (!(tebex.checkIP(req.ip) && tebex.checkSignature(req)))
        // return res.status(401).json(`You're not from tebex! Who let's you in there? WHO DO YOU WORK FOR!`)

    // validation if requested by Tebex

    if (req.body?.type === "validation.webhook")
        return res.status(200).json({ id: req.body?.id })

    if (req.body?.type  !== "payment.completed")
        return res.status(202)

    const product = req.body?.subject?.products[0]
    const steamUser = req.body?.subject?.customer?.username

    if (!product) {
        await fetch(config.webhook, {
            method: "POST",
            body: JSON.stringify({ content: `${steamUser?.username} [${steamUser?.id}] has bought a premium points pack with ID ${product?.id}, that is not existing in config. The purchase has not been handled, but funds have been taken. Please resolve this issue manually.` }),
        })
        return res.status(400)
    }

    const dbResponse: boolean = await db.addPoints(steamUser?.id, Number(product?.custom))
    if (!dbResponse) {
        await fetch(config.webhook, {
            method: "POST",
            body: JSON.stringify({ content: `${steamUser?.username} [${steamUser?.id}] has bought a premium points pack with ID ${product?.id}, but db query failed to give purchased points. The points have not been given, but funds have been taken. Please resolve this issue manually.` }),
        })
        return res.status(400)
    }

    const id = req.body?.id // upsi ktos zapomnial dodac ;*
    res.json({ id: id })

    return res.status(200)
})



// ? Routes that require bear token
const tokenRestricted = express.Router()
tokenRestricted.use((req: Request, res: Response, next: NextFunction) => {
    if (req.get('Authorization') !== 'Bearer ' + Deno.env.get('API_SECRET'))
        return res.status(401).send('Not authorized')
    next()
})

tokenRestricted.post('/points', async (req: Request, res: Response) => {
    const steamID: string = req.body?.steamID
    if (!steamID)
        return res.status(400).send("Did not provide steamID.")
    const points: number = req.body?.points
    if (!points)
        return res.status(400).send("Did not provide amount of points.")

    const givePointsQueryRes: boolean = await db.addPoints(steamID, points)
    if (!givePointsQueryRes)
        return res.status(500).send("Failed to give points.")
    return res.status(200).send(`Points has been given successfuly.`)
})



export default (app: Application) => {
    app.use('/public', notRestricted)
    app.use('/user', steamAuthRestricted)
    app.use('/secure', tokenRestricted)
    app.use('/tebex', tebexRestricted)
}
