import express, { Application, Request, Response, NextFunction } from 'express'
import * as db from './database.ts'
import * as tebex from './tebex.ts'
import config from './config.json' with { type: "json" }
import passport from 'passport'
import SteamStrategy from 'passport-steam'


// ? Routes that are open

const notRestricted = express.Router()

notRestricted.get("/uwu", (_req: Request, res: Response) => {
    return res.status(200).send("uwu!")
})


// ? Routes for auth

const auth = express.Router()

passport.serializeUser((user: any, done: any) => { done(null, user) })
passport.deserializeUser((user: any, done: any) => { done(null, user) })
passport.use(new SteamStrategy({
    returnURL: Deno.env.get('DOMAIN') + '/auth/steam/return',
    realm: Deno.env.get('DOMAIN'),
    apiKey: Deno.env.get('STEAM_API_KEY'),
}, (_identifier: any, profile: any, done: any) => {
    return done(null, profile)
  }
))

auth.get('/steam', passport.authenticate('steam'))

auth.get('/steam/return',
    passport.authenticate('steam', { failureRedirect: 'https://sklep.fable.zone/' }),
    (req: Request, res: Response) => { res.redirect('https://sklep.fable.zone/') }
)


// ? Routes that require steam authentication

const steamAuthRestricted = express.Router()
steamAuthRestricted.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated())
        return res.status(401).send('Not authorized')
    next()
})

steamAuthRestricted.get('/logout', async (req: Request, res: Response) => await req.logout(() => res.redirect('https://sklep.fable.zone/') ))

steamAuthRestricted.get("/player", (req: Request, res: Response) => res.json(req.user))

steamAuthRestricted.get("/points", async (req: Request, res: Response) => {
    const points: number | boolean = await db.getPoints(req.user.id)
    if (!points) return res.status(500).send("Failed to get points.")

    return res.json({ points: points })
})

steamAuthRestricted.post("/bundle-purchase", async (req: Request, res: Response) => {
    const requestedBundle: string = req.body?.bundle
    if (!(requestedBundle in config.bundles))
        return res.status(400).send("Provided bundle code is not related with any existing bundle.")

    const steamID: string = req.user.id

    const points: number | boolean = await db.getPoints(steamID)
    if (!points) return res.status(500).send("Failed to get points.")

    const bundlePrice: number = config.bundles[requestedBundle as keyof typeof config.bundles].price
    if (points as number < bundlePrice)
        // return res.status(400).send(`Insufficient funds for this purchase. Missing ${bundlePrice - points} points.`)
        return res.status(400).send(`Niewystarczające środki na zakup. Brakuje ${bundlePrice - (points as number)} punktów.`)

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


// tebex
const tebexRestricted = express.Router()
tebexRestricted.use((req: Request, res: Response, next: NextFunction) => {
    if (!(tebex.checkIP(req.ip) && tebex.checkSignature(req)))
        return res.status(401).json(`You're not from tebex! Who let's you in there? WHO DO YOU WORK FOR!`)
    next()
})

tebexRestricted.post("/points-purchase", async (req: Request, res: Response) => {

    if (req.body?.type === "validation.webhook")
        return res.status(200).json({ id: req.body?.id })

    if (req.body?.type  !== "payment.completed")
        return res.status(202)

    const product = req.body?.subject?.products[0]
    const steamUser = req.body?.subject?.customer?.username

    if (!product) {
        await fetch(Deno.env.get('WEBHOOK') as string, {
            method: "POST",
            body: JSON.stringify({ content: `${steamUser?.username} [${steamUser?.id}] has bought a premium points pack with ID ${product?.id}, that is not existing in config. The purchase has not been handled, but funds have been taken. Please resolve this issue manually.` }),
        })
        return res.status(400)
    }

    const dbResponse: boolean = await db.addPoints(steamUser?.id, Number(product?.custom))
    if (!dbResponse) {
        await fetch(Deno.env.get('WEBHOOK') as string, {
            method: "POST",
            body: JSON.stringify({ content: `${steamUser?.username} [${steamUser?.id}] has bought a premium points pack with ID ${product?.id}, but db query failed to give purchased points. The points have not been given, but funds have been taken. Please resolve this issue manually.` }),
        })
        return res.status(400)
    }

    const id = req.body?.id // upsi ktos zapomnial dodac ;*
    res.json({ id: id }) // ojejku faktycznie uwu

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
    app.use('/auth', auth)
    app.use('/user', steamAuthRestricted)
    app.use('/secure', tokenRestricted)
    app.use('/tebex', tebexRestricted)
}
