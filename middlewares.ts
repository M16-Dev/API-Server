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
    app.set('trust proxy', 1)

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