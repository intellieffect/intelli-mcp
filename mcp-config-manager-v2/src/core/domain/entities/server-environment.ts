/**
 * Server Environment value object
 */

export interface ServerEnvironmentProps {
  variables: Record<string, string>;
}

export class ServerEnvironment {
  private readonly variables: Record<string, string>;

  constructor(props: ServerEnvironmentProps) {
    this.variables = { ...props.variables };
  }

  /**
   * Get an environment variable
   */
  get(key: string): string | undefined {
    return this.variables[key];
  }

  /**
   * Set an environment variable
   */
  set(key: string, value: string): void {
    this.variables[key] = value;
  }

  /**
   * Remove an environment variable
   */
  remove(key: string): void {
    delete this.variables[key];
  }

  /**
   * Get all variables
   */
  getAll(): Record<string, string> {
    return { ...this.variables };
  }

  /**
   * Check if a variable exists
   */
  has(key: string): boolean {
    return key in this.variables;
  }

  /**
   * Get the number of variables
   */
  get size(): number {
    return Object.keys(this.variables).length;
  }

  /**
   * Convert to plain object
   */
  toJSON(): Record<string, string> {
    return this.getAll();
  }
}