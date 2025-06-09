"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { isAdminEmail } from "@/lib/config";

const formSchema = z.object({
  email: z.string()
    .email("Invalid email address")
    .min(1, "Email is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password cannot exceed 100 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot exceed 50 characters")
    .optional(),
  confirmPassword: z.string()
    .min(1, "Password confirmation is required")
    .optional(),
}).refine((data) => {
  if (data.confirmPassword && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof formSchema>;

interface AuthFormProps {
  type: 'login' | 'register';
}

export function AuthForm({ type }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);

      if (type === "register") {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            name: data.name,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Registration failed");
        }

        toast.success("Registration successful! Please log in.");
        router.push("/auth/login");
        return;
      }

      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      // Determine redirect based on email
      if (isAdminEmail(data.email)) {
        router.push("/dashboard/admin");
        toast.success("Admin login successful!");
      } else {
        // Check verification status for clients
        const response = await fetch("/api/auth/session");
        const session = await response.json();
        
        if (session?.user?.status === "PENDING") {
          toast.success("Login successful! Account pending admin approval.");
        } else {
          toast.success("Login successful!");
        }
        router.push("/dashboard/client");
      }
    } catch (error) {
      toast.error(
        error instanceof Error 
          ? error.message 
          : "An error occurred during authentication"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-center">
          {type === "login" ? "Welcome Back" : "Create an Account"}
        </h2>
        <p className="text-sm text-gray-500 text-center">
          {type === "login" 
            ? "Please sign in to continue"
            : "Please fill in the information below to create your account"}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {type === "register" && (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <Input
              {...register("name")}
              type="text"
              placeholder="Enter your name"
              error={errors.name?.message}
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <Input
            {...register("email")}
            type="email"
            placeholder="Enter your email"
            error={errors.email?.message}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <Input
            {...register("password")}
            type="password"
            placeholder="Enter your password"
            error={errors.password?.message}
          />
        </div>

        {type === "register" && (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <Input
              {...register("confirmPassword")}
              type="password"
              placeholder="Confirm your password"
              error={errors.confirmPassword?.message}
            />
          </div>
        )}

        <Button type="submit" className="w-full" isLoading={isLoading}>
          {type === "login" ? "Sign In" : "Sign Up"}
        </Button>
      </form>
    </div>
  );
}