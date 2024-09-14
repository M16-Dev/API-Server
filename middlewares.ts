import express from 'express'
import session from 'express-session'
import helmet from 'helmet'
import config from './config.json' with { type: "json" }


const IPs: string[] = []


export default (app: express.Application) => {
    // security middleware
    app.use(helmet())

    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (IPs.filter(ip => ip === req.ip).length >= config.ratelimit.amount)
            return res.status(429).send('Bad ending :(')

        IPs.push(req.ip)
        setTimeout(() => IPs.shift(), config.ratelimit.ms)
    
        return next()
        // if (!await isAuthorized(req, info))
        //     return res.status(401).send('Bad ending :(')
    })

    // Configure session middleware
    app.use(session({
        secret: Deno.env.get('SESSION_SECRET'),
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: Deno.env.get('DOMAIN')?.split(':')[0] === 'https',
            httpOnly: true
        }
    }))

    app.use(express.json()) // Always serialize body to object (assume JSON).
}



// const ratelimited: Array<string> = [];
// export async function isRateLimited(req: Request, info: Deno.ServeHandlerInfo): Promise<boolean> {
//     const reqip = info.remoteAddr.hostname
//     if (ratelimited.filter(ip => ip === reqip).length >= config.ratelimit.amount) return true

//     ratelimited.push(reqip)
//     setTimeout(() => ratelimited.shift(), config.ratelimit.ms)

//     return false
// }


// let tokens: Array<string>;
// async function syncTokensWithDB(): Promise<void> {
//     tokens = await getTokens()
// }
// setInterval(() => syncTokensWithDB(), 1000 * 60 * (Math.random() * 10 + 5))
// syncTokensWithDB()

// export async function isAuthorized(req: Request, info: Deno.ServeHandlerInfo): Promise<boolean> {
//     const authToken = req.headers.get('Authorization')?.match(/Bearer (.*)/)?.[1]
//     if (!authToken) return false
//     if (!tokens.includes(authToken)) return false

//     return true
// }