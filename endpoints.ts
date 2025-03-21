import express, { Application, Request, Response, NextFunction } from 'express'
import * as db from './dbClients/apiDatabase.ts'
import * as sam from './dbClients/samDatabase.ts'
import * as maindb from './dbClients/mainDatabase.ts'
import * as tebex from './tebex.ts'
import * as utils from './utils.ts'
import config from './config.json' with { type: "json" }
import passport from 'passport'
import SteamStrategy from 'passport-steam'
import { BanData, PlayerData } from './types.ts'


// ? Routes that are open

const notRestricted = express.Router()

notRestricted.get("/uwu", (_req: Request, res: Response) => {
    return res.status(200).send("uwu!")
})


// ? Routes for auth

const steamAuth = express.Router()

passport.serializeUser((user: any, done: any) => { done(null, user) })
passport.deserializeUser((user: any, done: any) => { done(null, user) })
passport.use(new SteamStrategy({
    returnURL: Deno.env.get('DOMAIN') + '/auth/steam/return',
    realm: Deno.env.get('DOMAIN'),
    apiKey: Deno.env.get('STEAM_API_KEY'),
}, (_identifier: any, profile: any, done: any) => {
    return done(null, profile)
}))

steamAuth.get('/', (req: Request, _res: Response, next: NextFunction) => {
        if (req.query.key) {
            let discordID: string = ''
            for (const letter of req.query.key.split('').filter((_: string, i: number) => i % 2 === 0).join(''))
                discordID += String.fromCharCode(letter.charCodeAt(0) - 50)
            req.session.discordID = discordID
        }
        next()
    },
    passport.authenticate('steam')
)

steamAuth.get('/return', (req: Request, res: Response, next: NextFunction) => {
    const url = req.session.discordID ? '/user/link-accounts' : 'https://sklep.fable.zone/'
    passport.authenticate('steam', { failureRedirect: url, successRedirect: url, keepSessionInfo: true })(req, res, next)
})


// ? Routes that require steam authentication

const steamAuthRestricted = express.Router()
steamAuthRestricted.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated())
        return res.status(401).send('Not authorized')
    next()
})

steamAuthRestricted.get('/link-accounts', async (req: Request, res: Response) => {
    const dbRes = await db.connectAccounts(req.user.id, req.session.discordID)
    const botRes = await fetch(`${Deno.env.get("BOT_URL")}/loaduser?id=${req.session.discordID}&sid=${req.user.id}`, {
        method: 'POST',
        signal: AbortSignal.timeout(8000)
    }).catch(() => ({ status: 500 }))
    req.session.discordID = null
    res.status(dbRes || botRes.status == 200 ? 200 : 500).send((dbRes ? `Pomyślnie połączono konta!` : 'Nie udało się połączyć kont :c') + '</br>' + (botRes.status == 200 ? 'Nadano role na serwerze Discord!' : 'Nie udało się nadać ról na serwerze Discord :c'))
})

steamAuthRestricted.get('/logout', async (req: Request, res: Response) => await req.logout(() => res.redirect('https://sklep.fable.zone/') ))

steamAuthRestricted.get("/player", (req: Request, res: Response) => res.json(req.user))

steamAuthRestricted.get("/points", async (req: Request, res: Response) => {
    const points: number = await db.getPoints(req.user.id)

    return res.json({ points: points })
})

steamAuthRestricted.post("/bundle-purchase", async (req: Request, res: Response) => {
    const requestedBundle: string = req.body?.bundle
    if (!(requestedBundle in config.bundles))
        return res.status(400).send("Provided bundle code is not related with any existing bundle.")

    const steamID: string = req.user.id

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
    
    await utils.sendWebhook({
        webhook: Deno.env.get('WEBHOOK') as string, 
        user: { id:req.user.id, name: req.user.displayName, avatar: req.user._json.avatarfull }, 
        color: 0x00AAFF, 
        title: "Zakupiono pakiet!", 
        fields: [
            { name: "Pakiet", value: requestedBundle, inline: true },
            { name: "Cena", value: `${bundlePrice}<a:piwo:1261359013866639361>`, inline: true }
        ]
    })
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

    const products = req.body?.subject?.products
    const steamUser = req.body?.subject?.customer?.username

    let isProblem = false
    for (const product of products) {
        if (!product) {
            await utils.sendWebhook({
                webhook: Deno.env.get('WEBHOOK') as string,
                user: { id: steamUser.id, name: steamUser.username },
                color: 0xFF0000,
                title: `Failed points purchase!`,
                description: `User bought premium points pack with ID **${product?.id}**, that is not existing in config.\nThe purchase has not been handled, but funds have been taken.\nPlease resolve this issue manually.`
            })
            isProblem = true
            continue
        }

        const dbResponse: boolean = await db.addPoints(steamUser?.id, Number(product?.custom) * product.quantity)
        if (!dbResponse) {
            await utils.sendWebhook({
                webhook: Deno.env.get('WEBHOOK') as string,
                user: { id: steamUser.id, name: steamUser.username },
                color: 0xFF0000,
                title: `Failed points purchase!`,
                description: `User bought premium points pack with ID **${product?.id}**, but db query failed to give purchased points.\nThe points have not been given, but funds have been taken.\nPlease resolve this issue manually.`
            })
            isProblem = true
        }
    }

    const id = req.body?.id // upsi ktos zapomnial dodac ;*
    res.json({ id }) // ojejku faktycznie uwu

    return res.status(isProblem ? 400 : 200)
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
    const amount: number = req.body?.amount
    if (!amount)
        return res.status(400).send("Did not provide amount of points.")

    const givePointsQueryRes: boolean = await db.addPoints(steamID, amount)
    if (!givePointsQueryRes)
        return res.status(500).send("Failed to give points.")
    return res.status(200).send(`Points has been given successfuly.`)
})

tokenRestricted.get('/player', async (req: Request, res: Response) => {
    if (req.query.discordID && req.query.steamID)
        return res.status(400).send("Provided both steamID and discordID. Should provide only one.")
    if (!req.query.discordID && !req.query.steamID) 
        return res.status(400).send("Did not provide either steamID or discordID.")

    let discordID: string | undefined = req.query.discordID
    const steamID: string | undefined = req.query.steamID ?? await db.getSteamID(discordID as string)
    
    if (!steamID) return res.status(400).send("There is no steamID related with given discordID.")

    if (!discordID && steamID) discordID = await db.getDiscordID(steamID)

    const samPlayer = await sam.getSamPlayer(steamID)
    // if (!samPlayer) return res.status(500).send("Failed to get player data from SAM database.")
    const { rank, expiryDate, firstJoin, lastJoin, playTime } = samPlayer ?? { rank: undefined, expiryDate: undefined, firstJoin: undefined, lastJoin: undefined, playTime: 0 }
    const secondaryRankData = await sam.getSecondaryRankData(steamID)
    const secondaryRank = secondaryRankData ? secondaryRankData.secondaryRank : null
    const secondaryExpiryDate = secondaryRankData ? secondaryRankData.secondaryExpiryDate : null
    const ban: BanData | null = await sam.getBanData(steamID) || null
    const points: number = await db.getPoints(steamID)
    const cash: number = await maindb.getCash(steamID)
    const warnPoints: number = await sam.getWarnPoints(steamID)

    const playerData: PlayerData = {
        steamID, discordID,
        rank, expiryDate, secondaryRank, secondaryExpiryDate,
        firstJoin, lastJoin, playTime,
        ban, points, cash, warnPoints,
    }

    return res.status(200).json(playerData)
})


export default (app: Application) => {
    app.use('/public', notRestricted)
    app.use('/auth/steam', steamAuth)
    app.use('/user', steamAuthRestricted)
    app.use('/secure', tokenRestricted)
    app.use('/tebex', tebexRestricted)
}
