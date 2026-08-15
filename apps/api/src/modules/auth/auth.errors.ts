export class AuthError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

export const invalidCredentialsError = () => new AuthError("Invalid email or password", 401);
export const unauthorizedError = () => new AuthError("Authentication required", 401);
export const emailAlreadyRegisteredError = () => new AuthError("Email is already registered", 409);
export const tenantAccessRequiredError = () => new AuthError("Tenant access required", 403);
