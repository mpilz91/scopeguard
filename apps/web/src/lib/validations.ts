import { z } from "zod"

export const registerSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z
    .string()
    .min(8, "Minimo 8 caratteri")
    .regex(/[A-Z]/, "Almeno una maiuscola")
    .regex(/[0-9]/, "Almeno un numero"),
  name: z.string().min(2, "Nome troppo corto"),
  organizationName: z.string().min(2, "Nome organizzazione troppo corto"),
})

export const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(1, "Password richiesta"),
})

export const customerSchema = z.object({
  name: z.string().min(2, "Nome richiesto"),
  contactEmail: z.string().email("Email non valida").optional().or(z.literal("")),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

export const assetSchema = z.object({
  name: z.string().min(2, "Nome richiesto"),
  type: z.enum(["IP", "CIDR", "DOMAIN", "URL", "HOST"]),
  value: z.string().min(1, "Valore richiesto"),
  customerId: z.string().cuid("Customer ID non valido"),
  description: z.string().optional(),
})

export const assessmentSchema = z.object({
  title: z.string().min(3, "Titolo richiesto"),
  description: z.string().optional(),
  type: z.enum(["EXTERNAL", "INTERNAL", "WEBAPP", "RETEST"]),
  customerId: z.string().cuid("Customer ID non valido"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const membershipInviteSchema = z.object({
  email: z.string().email("Email non valida"),
  role: z.enum(["ADMIN", "PENTESTER", "VIEWER"]),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CustomerInput = z.infer<typeof customerSchema>
export type AssetInput = z.infer<typeof assetSchema>
export type AssessmentInput = z.infer<typeof assessmentSchema>
export type MembershipInviteInput = z.infer<typeof membershipInviteSchema>
