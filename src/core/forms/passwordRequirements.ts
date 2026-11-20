export type PasswordRequirementKey = 'length' | 'notUsername' | 'differentFromCurrent';

export interface PasswordRequirement {
  readonly key: PasswordRequirementKey;
  readonly met: boolean;
}

export interface PasswordRequirementInput {
  readonly value: string;
  readonly current: string;
  readonly username: string;
  readonly min: number;
  readonly max: number;
}

/**
 * The rules of the new password the client can check by itself, for the live checklist of screen
 * S02. The server still decides (common passwords and the last five are checked there only).
 * Nothing is met until something is typed, so an empty field does not look "correct".
 */
export function passwordRequirements(input: PasswordRequirementInput): PasswordRequirement[] {
  const typed = input.value.length > 0;
  const username = input.username.trim().toLowerCase();
  return [
    { key: 'length', met: input.value.length >= input.min && input.value.length <= input.max },
    {
      key: 'notUsername',
      met: typed && (username === '' || !input.value.toLowerCase().includes(username)),
    },
    { key: 'differentFromCurrent', met: typed && input.value !== input.current },
  ];
}
