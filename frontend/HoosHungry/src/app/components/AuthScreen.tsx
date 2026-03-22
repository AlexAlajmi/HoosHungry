import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "Seller" | "Buyer";
  mealExchangeAvailable: boolean;
  walletBalance: number;
  headline: string;
}

interface ApiError {
  error?: string;
}

interface AuthScreenProps {
  onAuthenticated: (user: AuthUser) => void;
  onBack: () => void;
}

const API_BASE = "http://localhost:5009/api";

function normalizeAuthUser(payload: unknown): AuthUser | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const value = payload as Record<string, unknown>;
  const role = value.role ?? value.Role;

  if (
    (role !== "Buyer" && role !== "Seller") ||
    (typeof (value.id ?? value.Id) !== "string") ||
    (typeof (value.email ?? value.Email) !== "string") ||
    (typeof (value.name ?? value.Name) !== "string")
  ) {
    return null;
  }

  return {
    id: String(value.id ?? value.Id),
    email: String(value.email ?? value.Email),
    name: String(value.name ?? value.Name),
    role,
    mealExchangeAvailable: Boolean(
      value.mealExchangeAvailable ?? value.MealExchangeAvailable,
    ),
    walletBalance: Number(
      value.walletBalance ?? value.WalletBalance ?? 0,
    ),
    headline: String(value.headline ?? value.Headline ?? ""),
  };
}

export default function AuthScreen({
  onAuthenticated,
  onBack,
}: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"Buyer" | "Seller">("Buyer");
  const [headline, setHeadline] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRole("Buyer");
    setHeadline("");
  };

  const switchMode = (nextMode: "login" | "signup") => {
    setMode(nextMode);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("Email and password are required.");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      toast.error("Name is required.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/auth/${mode === "login" ? "login" : "signup"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "login"
              ? {
                  email: email.trim(),
                  password,
                }
              : {
                  email: email.trim(),
                  name: name.trim(),
                  password,
                  role,
                  headline: headline.trim(),
                },
          ),
        },
      );

      const payload =
        ((await response.json().catch(() => null)) as
          | AuthUser
          | ApiError
          | null) ?? null;

      if (!response.ok) {
        throw new Error(
          (payload as ApiError | null)?.error ??
            "Authentication failed.",
        );
      }

      const user = normalizeAuthUser(payload);
      if (!user) {
        throw new Error("Authentication response was invalid.");
      }

      onAuthenticated(user);
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Authentication failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#efefef] px-6 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center gap-4">
          <Button onClick={onBack} variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-sm text-gray-600">
              Log in or create an account to continue.
            </p>
          </div>
        </div>

        <Card className="p-6">
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
            <Button
              className="w-full"
              onClick={() => switchMode("login")}
              variant={mode === "login" ? "default" : "ghost"}
            >
              Login
            </Button>
            <Button
              className="w-full"
              onClick={() => switchMode("signup")}
              variant={mode === "signup" ? "default" : "ghost"}
            >
              Sign Up
            </Button>
          </div>

          <div className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="mb-2 block font-semibold">
                  Full Name
                </label>
                <Input
                  placeholder="Your name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
            )}

            <div>
              <label className="mb-2 block font-semibold">Email</label>
              <Input
                placeholder="you@virginia.edu"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                Password
              </label>
              <Input
                placeholder="Enter your password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
              />
            </div>

            {mode === "signup" && (
              <>
                <div>
                  <label className="mb-2 block font-semibold">
                    Account Type
                  </label>
                  <Select
                    value={role}
                    onValueChange={(value) =>
                      setRole(value as "Buyer" | "Seller")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Buyer">Buyer</SelectItem>
                      <SelectItem value="Seller">Seller</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-2 block font-semibold">
                    Headline
                  </label>
                  <Input
                    placeholder="Optional short profile note"
                    value={headline}
                    onChange={(event) =>
                      setHeadline(event.target.value)
                    }
                  />
                </div>
              </>
            )}

            <Button
              className="w-full bg-[#fd6500] hover:bg-[#e55a00]"
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Log In"
                  : "Create Account"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
