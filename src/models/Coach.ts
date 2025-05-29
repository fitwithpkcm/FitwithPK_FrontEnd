export interface ICoach {
    IdCoach?: number
    CoachName: string
    IdUser: number
    BasicDetails: BasicDetails
    ProfessionalDetails: ProfessionalDetails
}

export interface BasicDetails {
    phone: string
    banner_image: string
    profile_picture: string
    subject: string,
    social_media: SocialMediaPlatform[]
}

export interface SocialMediaPlatform {
    platform: string
    url: string
    icon?: string
}

export interface ProfessionalDetails {
    certifications: Certification[]
    specializations: string[]
    about: string
    timing: string
}

export interface Certification {
    id?: number
    name: string
    centre: string
    file_url: string
}
