import express from 'express'
import middlewares from './middlewares.ts'
import endpoints from './endpoints.ts'
import "jsr:@std/dotenv/load";

const app = express()
app.disable('x-powered-by')

middlewares(app)
endpoints(app)

app.listen(Deno.env.get('PORT'), () => {
    console.log(`Server running on ${Deno.env.get('DOMAIN')}`)
})