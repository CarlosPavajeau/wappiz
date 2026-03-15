export type LoginRequest = {
  email: string
  password: string
}

export type AuthResponse = {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    tenantId: string
    role: string
  }
}

export type RegisterUserRequest = {
  email: string
  name: string
  password: string
}

export type RefreshTokenRequest = {
  refreshToken: string
}

export type UserResponse = {
  id: string
  email: string
  tenantId: string
  role: string
}
