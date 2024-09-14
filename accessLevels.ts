const AccessLevels = {
    EVERYONE: 0, // gówno endpointy pewnie nieużywane będzie
    USER: 1, // endpointy dla uzytkownika z akcjami wyłącznie dotyczącymi jego konta
    ADMIN: 2, // endpointy dla administratora, mogą ingerować w konta innych użytkowników
    HIGHEST: 3, // endpointy zablokowane pod konkretne adresy IP
    CASHBILL: 4
}

export default AccessLevels