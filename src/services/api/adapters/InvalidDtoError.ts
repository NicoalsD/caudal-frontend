/** The server sent data that does not fit the contract (for example an invalid date). */
export class InvalidDtoError extends Error {
  constructor(field: string, options?: ErrorOptions) {
    super(`Invalid value in response field "${field}"`, options);
    this.name = 'InvalidDtoError';
  }
}
