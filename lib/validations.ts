import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use at most 72 characters")
  .regex(/[a-zA-Z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name")
    .max(80, "That name is too long"),
  email: emailSchema,
  password: passwordSchema,
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;

export const generateSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(3, "Describe what you want to generate")
    .max(4000, "Prompts are limited to 4000 characters"),
  temperature: z.number().min(0).max(2).optional(),
});

export type GenerateValues = z.infer<typeof generateSchema>;
