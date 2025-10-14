import { z } from "zod"

export const UserMetadataSchema = z.object({
    firstname: z.string().trim().min(1).max(100),
    lastname: z.string().trim().min(1).max(100),
    position: z.string().trim().min(1).max(100),
    company: z.string().trim().min(1).max(100),
    industry: z.string().trim().min(1).max(100),
    phone: z.e164().trim(),
    email: z.email().trim(),
    url: z.url().trim().max(255).optional(),
    about: z.string().trim().max(2000).optional(),
})