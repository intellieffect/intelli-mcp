/**
 * Dependency injection container with type safety
 */

import 'reflect-metadata';

// Service registration tokens
export const TOKENS = {
  // Repositories
  SERVER_REPOSITORY: Symbol('ServerRepository'),
  CONFIGURATION_REPOSITORY: Symbol('ConfigurationRepository'),
  
  // Services
  SERVER_SERVICE: Symbol('ServerService'),
  CONFIGURATION_SERVICE: Symbol('ConfigurationService'),
  
  // Infrastructure
  LOGGER: Symbol('Logger'),
  EVENT_BUS: Symbol('EventBus'),
  PROCESS_MANAGER: Symbol('ProcessManager'),
  HEALTH_CHECKER: Symbol('HealthChecker'),
  VALIDATOR: Symbol('Validator'),
  
  // External dependencies
  ELECTRON_APP: Symbol('ElectronApp'),
  FILE_SYSTEM: Symbol('FileSystem'),
  STORAGE: Symbol('Storage'),
} as const;

// Service lifetime types
export type ServiceLifetime = 'singleton' | 'transient' | 'scoped';

// Service registration interface
export interface ServiceRegistration<T = unknown> {
  readonly token: symbol;
  readonly factory: (container: Container) => T;
  readonly lifetime: ServiceLifetime;
  readonly dependencies?: readonly symbol[];
}

// Container interface
export interface IContainer {
  register<T>(registration: ServiceRegistration<T>): void;
  resolve<T>(token: symbol): T;
  createScope(): IContainer;
  dispose(): Promise<void>;
}

// Service decorator for automatic registration
export function Service(token: symbol, lifetime: ServiceLifetime = 'singleton') {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    const dependencies = Reflect.getMetadata('design:paramtypes', constructor) || [];
    const dependencyTokens = dependencies.map((_, index: number) => 
      Reflect.getMetadata('inject:token', constructor, index)
    ).filter(Boolean);
    
    Container.defaultContainer.register({
      token,
      factory: (container) => {
        const resolvedDependencies = dependencyTokens.map(token => container.resolve(token));
        return new constructor(...resolvedDependencies);
      },
      lifetime,
      dependencies: dependencyTokens,
    });
    
    return constructor;
  };
}

// Inject decorator for constructor parameters
export function Inject(token: symbol) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    Reflect.defineMetadata('inject:token', token, target, parameterIndex);
  };
}

// Main container implementation
export class Container implements IContainer {
  private readonly registrations = new Map<symbol, ServiceRegistration>();
  private readonly singletonInstances = new Map<symbol, unknown>();
  private readonly scopedInstances = new Map<symbol, unknown>();
  private readonly disposables: Array<{ dispose(): Promise<void> | void }> = [];
  
  public static readonly defaultContainer = new Container();

  register<T>(registration: ServiceRegistration<T>): void {
    this.registrations.set(registration.token, registration);
  }

  resolve<T>(token: symbol): T {
    const registration = this.registrations.get(token);
    if (!registration) {
      throw new Error(`Service not registered: ${token.toString()}`);
    }

    switch (registration.lifetime) {
      case 'singleton':
        return this.resolveSingleton(token, registration) as T;
      case 'scoped':
        return this.resolveScoped(token, registration) as T;
      case 'transient':
        return this.resolveTransient(registration) as T;
      default:
        throw new Error(`Unknown service lifetime: ${registration.lifetime}`);
    }
  }

  createScope(): IContainer {
    const scopedContainer = new Container();
    
    // Copy registrations
    for (const [token, registration] of this.registrations) {
      scopedContainer.registrations.set(token, registration);
    }
    
    // Share singleton instances
    for (const [token, instance] of this.singletonInstances) {
      scopedContainer.singletonInstances.set(token, instance);
    }
    
    return scopedContainer;
  }

  async dispose(): Promise<void> {
    // Dispose all disposable services
    for (const disposable of this.disposables) {
      await disposable.dispose();
    }
    
    this.disposables.length = 0;
    this.singletonInstances.clear();
    this.scopedInstances.clear();
  }

  private resolveSingleton<T>(token: symbol, registration: ServiceRegistration<T>): T {
    let instance = this.singletonInstances.get(token) as T;
    if (!instance) {
      instance = registration.factory(this);
      this.singletonInstances.set(token, instance);
      this.trackDisposable(instance);
    }
    return instance;
  }

  private resolveScoped<T>(token: symbol, registration: ServiceRegistration<T>): T {
    let instance = this.scopedInstances.get(token) as T;
    if (!instance) {
      instance = registration.factory(this);
      this.scopedInstances.set(token, instance);
      this.trackDisposable(instance);
    }
    return instance;
  }

  private resolveTransient<T>(registration: ServiceRegistration<T>): T {
    const instance = registration.factory(this);
    this.trackDisposable(instance);
    return instance;
  }

  private trackDisposable(instance: unknown): void {
    if (instance && typeof instance === 'object' && 'dispose' in instance) {
      this.disposables.push(instance as { dispose(): Promise<void> | void });
    }
  }
}

// Registration helpers
export class ServiceRegistry {
  private static container = Container.defaultContainer;

  static register<T>(
    token: symbol,
    factory: (container: Container) => T,
    lifetime: ServiceLifetime = 'singleton'
  ): void {
    this.container.register({
      token,
      factory,
      lifetime,
    });
  }

  static registerClass<T>(
    token: symbol,
    constructor: new (...args: any[]) => T,
    lifetime: ServiceLifetime = 'singleton',
    dependencies: readonly symbol[] = []
  ): void {
    this.container.register({
      token,
      factory: (container) => {
        const resolvedDependencies = dependencies.map(dep => container.resolve(dep));
        return new constructor(...resolvedDependencies);
      },
      lifetime,
      dependencies,
    });
  }

  static registerValue<T>(token: symbol, value: T): void {
    this.container.register({
      token,
      factory: () => value,
      lifetime: 'singleton',
    });
  }

  static resolve<T>(token: symbol): T {
    return this.container.resolve<T>(token);
  }

  static createScope(): IContainer {
    return this.container.createScope();
  }
}

// Fluent registration API
export class ServiceBuilder<T> {
  constructor(
    private readonly token: symbol,
    private readonly factory: (container: Container) => T
  ) {}

  asSingleton(): void {
    Container.defaultContainer.register({
      token: this.token,
      factory: this.factory,
      lifetime: 'singleton',
    });
  }

  asTransient(): void {
    Container.defaultContainer.register({
      token: this.token,
      factory: this.factory,
      lifetime: 'transient',
    });
  }

  asScoped(): void {
    Container.defaultContainer.register({
      token: this.token,
      factory: this.factory,
      lifetime: 'scoped',
    });
  }
}

export function bind<T>(token: symbol): {
  to(factory: (container: Container) => T): ServiceBuilder<T>;
  toClass(constructor: new (...args: any[]) => T, dependencies?: readonly symbol[]): ServiceBuilder<T>;
  toValue(value: T): void;
} {
  return {
    to: (factory) => new ServiceBuilder(token, factory),
    toClass: (constructor, dependencies = []) => 
      new ServiceBuilder(token, (container) => {
        const resolvedDependencies = dependencies.map(dep => container.resolve(dep));
        return new constructor(...resolvedDependencies);
      }),
    toValue: (value) => ServiceRegistry.registerValue(token, value),
  };
}

// Configuration for the container
export interface ContainerConfiguration {
  readonly enableValidation: boolean;
  readonly enableCircularDependencyDetection: boolean;
  readonly enableLazyLoading: boolean;
  readonly maxResolutionDepth: number;
}

export const defaultContainerConfiguration: ContainerConfiguration = {
  enableValidation: true,
  enableCircularDependencyDetection: true,
  enableLazyLoading: false,
  maxResolutionDepth: 10,
};

// Container builder for easier setup
export class ContainerBuilder {
  private readonly registrations: ServiceRegistration[] = [];
  private configuration: ContainerConfiguration = defaultContainerConfiguration;

  addService<T>(registration: ServiceRegistration<T>): this {
    this.registrations.push(registration);
    return this;
  }

  addSingleton<T>(
    token: symbol,
    factory: (container: Container) => T
  ): this {
    return this.addService({
      token,
      factory,
      lifetime: 'singleton',
    });
  }

  addTransient<T>(
    token: symbol,
    factory: (container: Container) => T
  ): this {
    return this.addService({
      token,
      factory,
      lifetime: 'transient',
    });
  }

  addScoped<T>(
    token: symbol,
    factory: (container: Container) => T
  ): this {
    return this.addService({
      token,
      factory,
      lifetime: 'scoped',
    });
  }

  configure(config: Partial<ContainerConfiguration>): this {
    this.configuration = { ...this.configuration, ...config };
    return this;
  }

  build(): Container {
    const container = new Container();
    
    for (const registration of this.registrations) {
      container.register(registration);
    }
    
    return container;
  }
}

// Type-safe service locator pattern (use sparingly)
export class ServiceLocator {
  private static container: IContainer = Container.defaultContainer;

  static setContainer(container: IContainer): void {
    this.container = container;
  }

  static get<T>(token: symbol): T {
    return this.container.resolve<T>(token);
  }
}

// Middleware for cross-cutting concerns
export interface ServiceMiddleware {
  readonly name: string;
  intercept<T>(
    token: symbol,
    factory: (container: Container) => T,
    next: (container: Container) => T
  ): T;
}

export class LoggingMiddleware implements ServiceMiddleware {
  readonly name = 'logging';

  intercept<T>(
    token: symbol,
    factory: (container: Container) => T,
    next: (container: Container) => T
  ): T {
    console.log(`Resolving service: ${token.toString()}`);
    const start = performance.now();
    const result = next(container);
    const end = performance.now();
    console.log(`Resolved service: ${token.toString()} in ${end - start}ms`);
    return result;
  }
}