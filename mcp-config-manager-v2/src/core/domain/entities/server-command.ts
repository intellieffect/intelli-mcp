/**
 * Server Command value object
 */

export interface ServerCommandProps {
  executable: string;
  arguments: string[];
}

export class ServerCommand {
  public readonly executable: string;
  public readonly arguments: string[];

  constructor(props: ServerCommandProps) {
    this.executable = props.executable;
    this.arguments = props.arguments;
  }

  /**
   * Get the full command string
   */
  toString(): string {
    return [this.executable, ...this.arguments].join(' ');
  }

  /**
   * Convert to array format
   */
  toArray(): string[] {
    return [this.executable, ...this.arguments];
  }
}