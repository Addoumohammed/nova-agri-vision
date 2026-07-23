import { z } from "zod";
import { passwordPolicySchema } from "@/lib/auth/service";

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Name is too short").max(80).nullable().optional(),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+()\-\s\d]*$/, "Invalid phone")
    .nullable()
    .optional()
    .or(z.literal("")),
  company: z.string().trim().max(120).nullable().optional().or(z.literal("")),
  country: z.string().trim().max(80).nullable().optional().or(z.literal("")),
  website: z
    .string()
    .trim()
    .max(200)
    .regex(/^(https?:\/\/)?[^\s]+\.[^\s]+$/i, "Invalid URL")
    .nullable()
    .optional()
    .or(z.literal("")),
  taxId: z.string().trim().max(60).nullable().optional().or(z.literal("")),
  locale: z.enum(["en", "ar"]).optional(),
  timezone: z.string().trim().max(60).nullable().optional().or(z.literal("")),
  dateFormat: z.string().trim().max(30).nullable().optional().or(z.literal("")),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordPolicySchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "New password must differ from current",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const privacySchema = z.object({
  profileVisibility: z.enum(["public", "workspace", "private"]),
  showEmail: z.boolean(),
  analyticsOptIn: z.boolean(),
  marketingEmails: z.boolean(),
});

export const deleteAccountSchema = z.object({
  confirmation: z.literal("delete my account", {
    errorMap: () => ({ message: 'Type "delete my account" to confirm' }),
  }),
  reason: z.string().max(500).optional(),
});
