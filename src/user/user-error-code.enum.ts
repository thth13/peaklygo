export enum UserErrorCode {
  UserNotFound = 'USER_NOT_FOUND',
  WrongCredentials = 'WRONG_CREDENTIALS',
  EmailNotFound = 'EMAIL_NOT_FOUND',
  EmailNotUnique = 'EMAIL_NOT_UNIQUE',
  UsernameNotUnique = 'USERNAME_NOT_UNIQUE',
  InvalidVerificationToken = 'INVALID_VERIFICATION_TOKEN',
  InvalidResetRequest = 'INVALID_RESET_REQUEST',
}
