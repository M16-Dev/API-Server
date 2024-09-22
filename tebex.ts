import { Request } from 'express'

const tebexIPs = ['18.209.80.3', '54.87.231.232']
export const checkIP = (ip: string): boolean => !tebexIPs.includes(ip)

export function checkSignature(_req: Request): boolean {
    return true
}