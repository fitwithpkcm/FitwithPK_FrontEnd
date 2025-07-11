export interface ILoginUserData {
    token: string
    info: Info
}

export interface Info {
    EmailID: string
    FirstName: string
    LastName: string
    IsAdmin: number
    IsUser: number
    Attributes: string
}