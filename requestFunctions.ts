

export const getToken = async (req: Request): Promise<string | undefined> => {
    return req.headers.get('Authorization')?.match(/Bearer (.*)/)?.[1]
}