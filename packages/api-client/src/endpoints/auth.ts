import { defineResource } from "../core/define-resource"
import type { EndpointDefinition } from "../core/types"
import type {
  AuthResponse,
  LoginRequest,
  RefreshTokenRequest,
  RegisterUserRequest,
  UserResponse,
} from "../types/auth"

const definitions = {
  login: { method: "POST", path: "/auth/login" } as EndpointDefinition<
    AuthResponse,
    LoginRequest
  >,
  me: { method: "GET", path: "/users/me" } as EndpointDefinition<UserResponse>,
  refresh: { method: "POST", path: "/auth/refresh" } as EndpointDefinition<
    AuthResponse,
    RefreshTokenRequest
  >,
  register: { method: "POST", path: "/auth/register" } as EndpointDefinition<
    AuthResponse,
    RegisterUserRequest
  >,
} as const

export const authResource = defineResource(definitions)
