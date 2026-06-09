
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model MoneyHolder
 * 
 */
export type MoneyHolder = $Result.DefaultSelection<Prisma.$MoneyHolderPayload>
/**
 * Model MoneyMovement
 * 
 */
export type MoneyMovement = $Result.DefaultSelection<Prisma.$MoneyMovementPayload>

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more MoneyHolders
 * const moneyHolders = await prisma.moneyHolder.findMany()
 * ```
 *
 * 
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   * 
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more MoneyHolders
   * const moneyHolders = await prisma.moneyHolder.findMany()
   * ```
   *
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb, ExtArgs>

      /**
   * `prisma.moneyHolder`: Exposes CRUD operations for the **MoneyHolder** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more MoneyHolders
    * const moneyHolders = await prisma.moneyHolder.findMany()
    * ```
    */
  get moneyHolder(): Prisma.MoneyHolderDelegate<ExtArgs>;

  /**
   * `prisma.moneyMovement`: Exposes CRUD operations for the **MoneyMovement** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more MoneyMovements
    * const moneyMovements = await prisma.moneyMovement.findMany()
    * ```
    */
  get moneyMovement(): Prisma.MoneyMovementDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError
  export import NotFoundError = runtime.NotFoundError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 5.22.0
   * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    MoneyHolder: 'MoneyHolder',
    MoneyMovement: 'MoneyMovement'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.InternalArgs, clientOptions: PrismaClientOptions }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], this['params']['clientOptions']>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> = {
    meta: {
      modelProps: "moneyHolder" | "moneyMovement"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      MoneyHolder: {
        payload: Prisma.$MoneyHolderPayload<ExtArgs>
        fields: Prisma.MoneyHolderFieldRefs
        operations: {
          findUnique: {
            args: Prisma.MoneyHolderFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MoneyHolderPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.MoneyHolderFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MoneyHolderPayload>
          }
          findFirst: {
            args: Prisma.MoneyHolderFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MoneyHolderPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.MoneyHolderFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MoneyHolderPayload>
          }
          findMany: {
            args: Prisma.MoneyHolderFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MoneyHolderPayload>[]
          }
          create: {
            args: Prisma.MoneyHolderCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MoneyHolderPayload>
          }
          createMany: {
            args: Prisma.MoneyHolderCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.MoneyHolderCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MoneyHolderPayload>[]
          }
          delete: {
            args: Prisma.MoneyHolderDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MoneyHolderPayload>
          }
          update: {
            args: Prisma.MoneyHolderUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MoneyHolderPayload>
          }
          deleteMany: {
            args: Prisma.MoneyHolderDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.MoneyHolderUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.MoneyHolderUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MoneyHolderPayload>
          }
          aggregate: {
            args: Prisma.MoneyHolderAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMoneyHolder>
          }
          groupBy: {
            args: Prisma.MoneyHolderGroupByArgs<ExtArgs>
            result: $Utils.Optional<MoneyHolderGroupByOutputType>[]
          }
          count: {
            args: Prisma.MoneyHolderCountArgs<ExtArgs>
            result: $Utils.Optional<MoneyHolderCountAggregateOutputType> | number
          }
        }
      }
      MoneyMovement: {
        payload: Prisma.$MoneyMovementPayload<ExtArgs>
        fields: Prisma.MoneyMovementFieldRefs
        operations: {
          findUnique: {
            args: Prisma.MoneyMovementFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MoneyMovementPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.MoneyMovementFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MoneyMovementPayload>
          }
          findFirst: {
            args: Prisma.MoneyMovementFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MoneyMovementPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.MoneyMovementFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MoneyMovementPayload>
          }
          findMany: {
            args: Prisma.MoneyMovementFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MoneyMovementPayload>[]
          }
          create: {
            args: Prisma.MoneyMovementCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MoneyMovementPayload>
          }
          createMany: {
            args: Prisma.MoneyMovementCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.MoneyMovementCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MoneyMovementPayload>[]
          }
          delete: {
            args: Prisma.MoneyMovementDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MoneyMovementPayload>
          }
          update: {
            args: Prisma.MoneyMovementUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MoneyMovementPayload>
          }
          deleteMany: {
            args: Prisma.MoneyMovementDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.MoneyMovementUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.MoneyMovementUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MoneyMovementPayload>
          }
          aggregate: {
            args: Prisma.MoneyMovementAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMoneyMovement>
          }
          groupBy: {
            args: Prisma.MoneyMovementGroupByArgs<ExtArgs>
            result: $Utils.Optional<MoneyMovementGroupByOutputType>[]
          }
          count: {
            args: Prisma.MoneyMovementCountArgs<ExtArgs>
            result: $Utils.Optional<MoneyMovementCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
  }


  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type MoneyHolderCountOutputType
   */

  export type MoneyHolderCountOutputType = {
    movementsFrom: number
    movementsTo: number
  }

  export type MoneyHolderCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    movementsFrom?: boolean | MoneyHolderCountOutputTypeCountMovementsFromArgs
    movementsTo?: boolean | MoneyHolderCountOutputTypeCountMovementsToArgs
  }

  // Custom InputTypes
  /**
   * MoneyHolderCountOutputType without action
   */
  export type MoneyHolderCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyHolderCountOutputType
     */
    select?: MoneyHolderCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * MoneyHolderCountOutputType without action
   */
  export type MoneyHolderCountOutputTypeCountMovementsFromArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MoneyMovementWhereInput
  }

  /**
   * MoneyHolderCountOutputType without action
   */
  export type MoneyHolderCountOutputTypeCountMovementsToArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MoneyMovementWhereInput
  }


  /**
   * Models
   */

  /**
   * Model MoneyHolder
   */

  export type AggregateMoneyHolder = {
    _count: MoneyHolderCountAggregateOutputType | null
    _avg: MoneyHolderAvgAggregateOutputType | null
    _sum: MoneyHolderSumAggregateOutputType | null
    _min: MoneyHolderMinAggregateOutputType | null
    _max: MoneyHolderMaxAggregateOutputType | null
  }

  export type MoneyHolderAvgAggregateOutputType = {
    expectedBalance: number | null
    actualBalance: number | null
  }

  export type MoneyHolderSumAggregateOutputType = {
    expectedBalance: number | null
    actualBalance: number | null
  }

  export type MoneyHolderMinAggregateOutputType = {
    id: string | null
    name: string | null
    emoji: string | null
    color: string | null
    expectedBalance: number | null
    actualBalance: number | null
    isSpecialTransit: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type MoneyHolderMaxAggregateOutputType = {
    id: string | null
    name: string | null
    emoji: string | null
    color: string | null
    expectedBalance: number | null
    actualBalance: number | null
    isSpecialTransit: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type MoneyHolderCountAggregateOutputType = {
    id: number
    name: number
    emoji: number
    color: number
    expectedBalance: number
    actualBalance: number
    isSpecialTransit: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type MoneyHolderAvgAggregateInputType = {
    expectedBalance?: true
    actualBalance?: true
  }

  export type MoneyHolderSumAggregateInputType = {
    expectedBalance?: true
    actualBalance?: true
  }

  export type MoneyHolderMinAggregateInputType = {
    id?: true
    name?: true
    emoji?: true
    color?: true
    expectedBalance?: true
    actualBalance?: true
    isSpecialTransit?: true
    createdAt?: true
    updatedAt?: true
  }

  export type MoneyHolderMaxAggregateInputType = {
    id?: true
    name?: true
    emoji?: true
    color?: true
    expectedBalance?: true
    actualBalance?: true
    isSpecialTransit?: true
    createdAt?: true
    updatedAt?: true
  }

  export type MoneyHolderCountAggregateInputType = {
    id?: true
    name?: true
    emoji?: true
    color?: true
    expectedBalance?: true
    actualBalance?: true
    isSpecialTransit?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type MoneyHolderAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MoneyHolder to aggregate.
     */
    where?: MoneyHolderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MoneyHolders to fetch.
     */
    orderBy?: MoneyHolderOrderByWithRelationInput | MoneyHolderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: MoneyHolderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MoneyHolders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MoneyHolders.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned MoneyHolders
    **/
    _count?: true | MoneyHolderCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: MoneyHolderAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: MoneyHolderSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MoneyHolderMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MoneyHolderMaxAggregateInputType
  }

  export type GetMoneyHolderAggregateType<T extends MoneyHolderAggregateArgs> = {
        [P in keyof T & keyof AggregateMoneyHolder]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMoneyHolder[P]>
      : GetScalarType<T[P], AggregateMoneyHolder[P]>
  }




  export type MoneyHolderGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MoneyHolderWhereInput
    orderBy?: MoneyHolderOrderByWithAggregationInput | MoneyHolderOrderByWithAggregationInput[]
    by: MoneyHolderScalarFieldEnum[] | MoneyHolderScalarFieldEnum
    having?: MoneyHolderScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MoneyHolderCountAggregateInputType | true
    _avg?: MoneyHolderAvgAggregateInputType
    _sum?: MoneyHolderSumAggregateInputType
    _min?: MoneyHolderMinAggregateInputType
    _max?: MoneyHolderMaxAggregateInputType
  }

  export type MoneyHolderGroupByOutputType = {
    id: string
    name: string
    emoji: string
    color: string
    expectedBalance: number
    actualBalance: number
    isSpecialTransit: boolean
    createdAt: Date
    updatedAt: Date
    _count: MoneyHolderCountAggregateOutputType | null
    _avg: MoneyHolderAvgAggregateOutputType | null
    _sum: MoneyHolderSumAggregateOutputType | null
    _min: MoneyHolderMinAggregateOutputType | null
    _max: MoneyHolderMaxAggregateOutputType | null
  }

  type GetMoneyHolderGroupByPayload<T extends MoneyHolderGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MoneyHolderGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MoneyHolderGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MoneyHolderGroupByOutputType[P]>
            : GetScalarType<T[P], MoneyHolderGroupByOutputType[P]>
        }
      >
    >


  export type MoneyHolderSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    emoji?: boolean
    color?: boolean
    expectedBalance?: boolean
    actualBalance?: boolean
    isSpecialTransit?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    movementsFrom?: boolean | MoneyHolder$movementsFromArgs<ExtArgs>
    movementsTo?: boolean | MoneyHolder$movementsToArgs<ExtArgs>
    _count?: boolean | MoneyHolderCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["moneyHolder"]>

  export type MoneyHolderSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    emoji?: boolean
    color?: boolean
    expectedBalance?: boolean
    actualBalance?: boolean
    isSpecialTransit?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["moneyHolder"]>

  export type MoneyHolderSelectScalar = {
    id?: boolean
    name?: boolean
    emoji?: boolean
    color?: boolean
    expectedBalance?: boolean
    actualBalance?: boolean
    isSpecialTransit?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type MoneyHolderInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    movementsFrom?: boolean | MoneyHolder$movementsFromArgs<ExtArgs>
    movementsTo?: boolean | MoneyHolder$movementsToArgs<ExtArgs>
    _count?: boolean | MoneyHolderCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type MoneyHolderIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $MoneyHolderPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "MoneyHolder"
    objects: {
      movementsFrom: Prisma.$MoneyMovementPayload<ExtArgs>[]
      movementsTo: Prisma.$MoneyMovementPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      emoji: string
      color: string
      expectedBalance: number
      actualBalance: number
      isSpecialTransit: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["moneyHolder"]>
    composites: {}
  }

  type MoneyHolderGetPayload<S extends boolean | null | undefined | MoneyHolderDefaultArgs> = $Result.GetResult<Prisma.$MoneyHolderPayload, S>

  type MoneyHolderCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<MoneyHolderFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: MoneyHolderCountAggregateInputType | true
    }

  export interface MoneyHolderDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['MoneyHolder'], meta: { name: 'MoneyHolder' } }
    /**
     * Find zero or one MoneyHolder that matches the filter.
     * @param {MoneyHolderFindUniqueArgs} args - Arguments to find a MoneyHolder
     * @example
     * // Get one MoneyHolder
     * const moneyHolder = await prisma.moneyHolder.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends MoneyHolderFindUniqueArgs>(args: SelectSubset<T, MoneyHolderFindUniqueArgs<ExtArgs>>): Prisma__MoneyHolderClient<$Result.GetResult<Prisma.$MoneyHolderPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one MoneyHolder that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {MoneyHolderFindUniqueOrThrowArgs} args - Arguments to find a MoneyHolder
     * @example
     * // Get one MoneyHolder
     * const moneyHolder = await prisma.moneyHolder.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends MoneyHolderFindUniqueOrThrowArgs>(args: SelectSubset<T, MoneyHolderFindUniqueOrThrowArgs<ExtArgs>>): Prisma__MoneyHolderClient<$Result.GetResult<Prisma.$MoneyHolderPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first MoneyHolder that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MoneyHolderFindFirstArgs} args - Arguments to find a MoneyHolder
     * @example
     * // Get one MoneyHolder
     * const moneyHolder = await prisma.moneyHolder.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends MoneyHolderFindFirstArgs>(args?: SelectSubset<T, MoneyHolderFindFirstArgs<ExtArgs>>): Prisma__MoneyHolderClient<$Result.GetResult<Prisma.$MoneyHolderPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first MoneyHolder that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MoneyHolderFindFirstOrThrowArgs} args - Arguments to find a MoneyHolder
     * @example
     * // Get one MoneyHolder
     * const moneyHolder = await prisma.moneyHolder.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends MoneyHolderFindFirstOrThrowArgs>(args?: SelectSubset<T, MoneyHolderFindFirstOrThrowArgs<ExtArgs>>): Prisma__MoneyHolderClient<$Result.GetResult<Prisma.$MoneyHolderPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more MoneyHolders that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MoneyHolderFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all MoneyHolders
     * const moneyHolders = await prisma.moneyHolder.findMany()
     * 
     * // Get first 10 MoneyHolders
     * const moneyHolders = await prisma.moneyHolder.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const moneyHolderWithIdOnly = await prisma.moneyHolder.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends MoneyHolderFindManyArgs>(args?: SelectSubset<T, MoneyHolderFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MoneyHolderPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a MoneyHolder.
     * @param {MoneyHolderCreateArgs} args - Arguments to create a MoneyHolder.
     * @example
     * // Create one MoneyHolder
     * const MoneyHolder = await prisma.moneyHolder.create({
     *   data: {
     *     // ... data to create a MoneyHolder
     *   }
     * })
     * 
     */
    create<T extends MoneyHolderCreateArgs>(args: SelectSubset<T, MoneyHolderCreateArgs<ExtArgs>>): Prisma__MoneyHolderClient<$Result.GetResult<Prisma.$MoneyHolderPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many MoneyHolders.
     * @param {MoneyHolderCreateManyArgs} args - Arguments to create many MoneyHolders.
     * @example
     * // Create many MoneyHolders
     * const moneyHolder = await prisma.moneyHolder.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends MoneyHolderCreateManyArgs>(args?: SelectSubset<T, MoneyHolderCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many MoneyHolders and returns the data saved in the database.
     * @param {MoneyHolderCreateManyAndReturnArgs} args - Arguments to create many MoneyHolders.
     * @example
     * // Create many MoneyHolders
     * const moneyHolder = await prisma.moneyHolder.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many MoneyHolders and only return the `id`
     * const moneyHolderWithIdOnly = await prisma.moneyHolder.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends MoneyHolderCreateManyAndReturnArgs>(args?: SelectSubset<T, MoneyHolderCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MoneyHolderPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a MoneyHolder.
     * @param {MoneyHolderDeleteArgs} args - Arguments to delete one MoneyHolder.
     * @example
     * // Delete one MoneyHolder
     * const MoneyHolder = await prisma.moneyHolder.delete({
     *   where: {
     *     // ... filter to delete one MoneyHolder
     *   }
     * })
     * 
     */
    delete<T extends MoneyHolderDeleteArgs>(args: SelectSubset<T, MoneyHolderDeleteArgs<ExtArgs>>): Prisma__MoneyHolderClient<$Result.GetResult<Prisma.$MoneyHolderPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one MoneyHolder.
     * @param {MoneyHolderUpdateArgs} args - Arguments to update one MoneyHolder.
     * @example
     * // Update one MoneyHolder
     * const moneyHolder = await prisma.moneyHolder.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends MoneyHolderUpdateArgs>(args: SelectSubset<T, MoneyHolderUpdateArgs<ExtArgs>>): Prisma__MoneyHolderClient<$Result.GetResult<Prisma.$MoneyHolderPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more MoneyHolders.
     * @param {MoneyHolderDeleteManyArgs} args - Arguments to filter MoneyHolders to delete.
     * @example
     * // Delete a few MoneyHolders
     * const { count } = await prisma.moneyHolder.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends MoneyHolderDeleteManyArgs>(args?: SelectSubset<T, MoneyHolderDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MoneyHolders.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MoneyHolderUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many MoneyHolders
     * const moneyHolder = await prisma.moneyHolder.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends MoneyHolderUpdateManyArgs>(args: SelectSubset<T, MoneyHolderUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one MoneyHolder.
     * @param {MoneyHolderUpsertArgs} args - Arguments to update or create a MoneyHolder.
     * @example
     * // Update or create a MoneyHolder
     * const moneyHolder = await prisma.moneyHolder.upsert({
     *   create: {
     *     // ... data to create a MoneyHolder
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the MoneyHolder we want to update
     *   }
     * })
     */
    upsert<T extends MoneyHolderUpsertArgs>(args: SelectSubset<T, MoneyHolderUpsertArgs<ExtArgs>>): Prisma__MoneyHolderClient<$Result.GetResult<Prisma.$MoneyHolderPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of MoneyHolders.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MoneyHolderCountArgs} args - Arguments to filter MoneyHolders to count.
     * @example
     * // Count the number of MoneyHolders
     * const count = await prisma.moneyHolder.count({
     *   where: {
     *     // ... the filter for the MoneyHolders we want to count
     *   }
     * })
    **/
    count<T extends MoneyHolderCountArgs>(
      args?: Subset<T, MoneyHolderCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MoneyHolderCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a MoneyHolder.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MoneyHolderAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends MoneyHolderAggregateArgs>(args: Subset<T, MoneyHolderAggregateArgs>): Prisma.PrismaPromise<GetMoneyHolderAggregateType<T>>

    /**
     * Group by MoneyHolder.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MoneyHolderGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends MoneyHolderGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: MoneyHolderGroupByArgs['orderBy'] }
        : { orderBy?: MoneyHolderGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, MoneyHolderGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMoneyHolderGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the MoneyHolder model
   */
  readonly fields: MoneyHolderFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for MoneyHolder.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__MoneyHolderClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    movementsFrom<T extends MoneyHolder$movementsFromArgs<ExtArgs> = {}>(args?: Subset<T, MoneyHolder$movementsFromArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MoneyMovementPayload<ExtArgs>, T, "findMany"> | Null>
    movementsTo<T extends MoneyHolder$movementsToArgs<ExtArgs> = {}>(args?: Subset<T, MoneyHolder$movementsToArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MoneyMovementPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the MoneyHolder model
   */ 
  interface MoneyHolderFieldRefs {
    readonly id: FieldRef<"MoneyHolder", 'String'>
    readonly name: FieldRef<"MoneyHolder", 'String'>
    readonly emoji: FieldRef<"MoneyHolder", 'String'>
    readonly color: FieldRef<"MoneyHolder", 'String'>
    readonly expectedBalance: FieldRef<"MoneyHolder", 'Float'>
    readonly actualBalance: FieldRef<"MoneyHolder", 'Float'>
    readonly isSpecialTransit: FieldRef<"MoneyHolder", 'Boolean'>
    readonly createdAt: FieldRef<"MoneyHolder", 'DateTime'>
    readonly updatedAt: FieldRef<"MoneyHolder", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * MoneyHolder findUnique
   */
  export type MoneyHolderFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyHolder
     */
    select?: MoneyHolderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyHolderInclude<ExtArgs> | null
    /**
     * Filter, which MoneyHolder to fetch.
     */
    where: MoneyHolderWhereUniqueInput
  }

  /**
   * MoneyHolder findUniqueOrThrow
   */
  export type MoneyHolderFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyHolder
     */
    select?: MoneyHolderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyHolderInclude<ExtArgs> | null
    /**
     * Filter, which MoneyHolder to fetch.
     */
    where: MoneyHolderWhereUniqueInput
  }

  /**
   * MoneyHolder findFirst
   */
  export type MoneyHolderFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyHolder
     */
    select?: MoneyHolderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyHolderInclude<ExtArgs> | null
    /**
     * Filter, which MoneyHolder to fetch.
     */
    where?: MoneyHolderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MoneyHolders to fetch.
     */
    orderBy?: MoneyHolderOrderByWithRelationInput | MoneyHolderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MoneyHolders.
     */
    cursor?: MoneyHolderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MoneyHolders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MoneyHolders.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MoneyHolders.
     */
    distinct?: MoneyHolderScalarFieldEnum | MoneyHolderScalarFieldEnum[]
  }

  /**
   * MoneyHolder findFirstOrThrow
   */
  export type MoneyHolderFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyHolder
     */
    select?: MoneyHolderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyHolderInclude<ExtArgs> | null
    /**
     * Filter, which MoneyHolder to fetch.
     */
    where?: MoneyHolderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MoneyHolders to fetch.
     */
    orderBy?: MoneyHolderOrderByWithRelationInput | MoneyHolderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MoneyHolders.
     */
    cursor?: MoneyHolderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MoneyHolders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MoneyHolders.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MoneyHolders.
     */
    distinct?: MoneyHolderScalarFieldEnum | MoneyHolderScalarFieldEnum[]
  }

  /**
   * MoneyHolder findMany
   */
  export type MoneyHolderFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyHolder
     */
    select?: MoneyHolderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyHolderInclude<ExtArgs> | null
    /**
     * Filter, which MoneyHolders to fetch.
     */
    where?: MoneyHolderWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MoneyHolders to fetch.
     */
    orderBy?: MoneyHolderOrderByWithRelationInput | MoneyHolderOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing MoneyHolders.
     */
    cursor?: MoneyHolderWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MoneyHolders from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MoneyHolders.
     */
    skip?: number
    distinct?: MoneyHolderScalarFieldEnum | MoneyHolderScalarFieldEnum[]
  }

  /**
   * MoneyHolder create
   */
  export type MoneyHolderCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyHolder
     */
    select?: MoneyHolderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyHolderInclude<ExtArgs> | null
    /**
     * The data needed to create a MoneyHolder.
     */
    data: XOR<MoneyHolderCreateInput, MoneyHolderUncheckedCreateInput>
  }

  /**
   * MoneyHolder createMany
   */
  export type MoneyHolderCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many MoneyHolders.
     */
    data: MoneyHolderCreateManyInput | MoneyHolderCreateManyInput[]
  }

  /**
   * MoneyHolder createManyAndReturn
   */
  export type MoneyHolderCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyHolder
     */
    select?: MoneyHolderSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many MoneyHolders.
     */
    data: MoneyHolderCreateManyInput | MoneyHolderCreateManyInput[]
  }

  /**
   * MoneyHolder update
   */
  export type MoneyHolderUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyHolder
     */
    select?: MoneyHolderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyHolderInclude<ExtArgs> | null
    /**
     * The data needed to update a MoneyHolder.
     */
    data: XOR<MoneyHolderUpdateInput, MoneyHolderUncheckedUpdateInput>
    /**
     * Choose, which MoneyHolder to update.
     */
    where: MoneyHolderWhereUniqueInput
  }

  /**
   * MoneyHolder updateMany
   */
  export type MoneyHolderUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update MoneyHolders.
     */
    data: XOR<MoneyHolderUpdateManyMutationInput, MoneyHolderUncheckedUpdateManyInput>
    /**
     * Filter which MoneyHolders to update
     */
    where?: MoneyHolderWhereInput
  }

  /**
   * MoneyHolder upsert
   */
  export type MoneyHolderUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyHolder
     */
    select?: MoneyHolderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyHolderInclude<ExtArgs> | null
    /**
     * The filter to search for the MoneyHolder to update in case it exists.
     */
    where: MoneyHolderWhereUniqueInput
    /**
     * In case the MoneyHolder found by the `where` argument doesn't exist, create a new MoneyHolder with this data.
     */
    create: XOR<MoneyHolderCreateInput, MoneyHolderUncheckedCreateInput>
    /**
     * In case the MoneyHolder was found with the provided `where` argument, update it with this data.
     */
    update: XOR<MoneyHolderUpdateInput, MoneyHolderUncheckedUpdateInput>
  }

  /**
   * MoneyHolder delete
   */
  export type MoneyHolderDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyHolder
     */
    select?: MoneyHolderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyHolderInclude<ExtArgs> | null
    /**
     * Filter which MoneyHolder to delete.
     */
    where: MoneyHolderWhereUniqueInput
  }

  /**
   * MoneyHolder deleteMany
   */
  export type MoneyHolderDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MoneyHolders to delete
     */
    where?: MoneyHolderWhereInput
  }

  /**
   * MoneyHolder.movementsFrom
   */
  export type MoneyHolder$movementsFromArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyMovement
     */
    select?: MoneyMovementSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyMovementInclude<ExtArgs> | null
    where?: MoneyMovementWhereInput
    orderBy?: MoneyMovementOrderByWithRelationInput | MoneyMovementOrderByWithRelationInput[]
    cursor?: MoneyMovementWhereUniqueInput
    take?: number
    skip?: number
    distinct?: MoneyMovementScalarFieldEnum | MoneyMovementScalarFieldEnum[]
  }

  /**
   * MoneyHolder.movementsTo
   */
  export type MoneyHolder$movementsToArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyMovement
     */
    select?: MoneyMovementSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyMovementInclude<ExtArgs> | null
    where?: MoneyMovementWhereInput
    orderBy?: MoneyMovementOrderByWithRelationInput | MoneyMovementOrderByWithRelationInput[]
    cursor?: MoneyMovementWhereUniqueInput
    take?: number
    skip?: number
    distinct?: MoneyMovementScalarFieldEnum | MoneyMovementScalarFieldEnum[]
  }

  /**
   * MoneyHolder without action
   */
  export type MoneyHolderDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyHolder
     */
    select?: MoneyHolderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyHolderInclude<ExtArgs> | null
  }


  /**
   * Model MoneyMovement
   */

  export type AggregateMoneyMovement = {
    _count: MoneyMovementCountAggregateOutputType | null
    _avg: MoneyMovementAvgAggregateOutputType | null
    _sum: MoneyMovementSumAggregateOutputType | null
    _min: MoneyMovementMinAggregateOutputType | null
    _max: MoneyMovementMaxAggregateOutputType | null
  }

  export type MoneyMovementAvgAggregateOutputType = {
    amount: number | null
    amountInUsd: number | null
  }

  export type MoneyMovementSumAggregateOutputType = {
    amount: number | null
    amountInUsd: number | null
  }

  export type MoneyMovementMinAggregateOutputType = {
    id: string | null
    amount: number | null
    currency: string | null
    amountInUsd: number | null
    fromHolderId: string | null
    toHolderId: string | null
    note: string | null
    photoPath: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type MoneyMovementMaxAggregateOutputType = {
    id: string | null
    amount: number | null
    currency: string | null
    amountInUsd: number | null
    fromHolderId: string | null
    toHolderId: string | null
    note: string | null
    photoPath: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type MoneyMovementCountAggregateOutputType = {
    id: number
    amount: number
    currency: number
    amountInUsd: number
    fromHolderId: number
    toHolderId: number
    note: number
    photoPath: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type MoneyMovementAvgAggregateInputType = {
    amount?: true
    amountInUsd?: true
  }

  export type MoneyMovementSumAggregateInputType = {
    amount?: true
    amountInUsd?: true
  }

  export type MoneyMovementMinAggregateInputType = {
    id?: true
    amount?: true
    currency?: true
    amountInUsd?: true
    fromHolderId?: true
    toHolderId?: true
    note?: true
    photoPath?: true
    createdAt?: true
    updatedAt?: true
  }

  export type MoneyMovementMaxAggregateInputType = {
    id?: true
    amount?: true
    currency?: true
    amountInUsd?: true
    fromHolderId?: true
    toHolderId?: true
    note?: true
    photoPath?: true
    createdAt?: true
    updatedAt?: true
  }

  export type MoneyMovementCountAggregateInputType = {
    id?: true
    amount?: true
    currency?: true
    amountInUsd?: true
    fromHolderId?: true
    toHolderId?: true
    note?: true
    photoPath?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type MoneyMovementAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MoneyMovement to aggregate.
     */
    where?: MoneyMovementWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MoneyMovements to fetch.
     */
    orderBy?: MoneyMovementOrderByWithRelationInput | MoneyMovementOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: MoneyMovementWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MoneyMovements from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MoneyMovements.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned MoneyMovements
    **/
    _count?: true | MoneyMovementCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: MoneyMovementAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: MoneyMovementSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MoneyMovementMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MoneyMovementMaxAggregateInputType
  }

  export type GetMoneyMovementAggregateType<T extends MoneyMovementAggregateArgs> = {
        [P in keyof T & keyof AggregateMoneyMovement]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMoneyMovement[P]>
      : GetScalarType<T[P], AggregateMoneyMovement[P]>
  }




  export type MoneyMovementGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MoneyMovementWhereInput
    orderBy?: MoneyMovementOrderByWithAggregationInput | MoneyMovementOrderByWithAggregationInput[]
    by: MoneyMovementScalarFieldEnum[] | MoneyMovementScalarFieldEnum
    having?: MoneyMovementScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MoneyMovementCountAggregateInputType | true
    _avg?: MoneyMovementAvgAggregateInputType
    _sum?: MoneyMovementSumAggregateInputType
    _min?: MoneyMovementMinAggregateInputType
    _max?: MoneyMovementMaxAggregateInputType
  }

  export type MoneyMovementGroupByOutputType = {
    id: string
    amount: number
    currency: string
    amountInUsd: number
    fromHolderId: string | null
    toHolderId: string | null
    note: string | null
    photoPath: string | null
    createdAt: Date
    updatedAt: Date
    _count: MoneyMovementCountAggregateOutputType | null
    _avg: MoneyMovementAvgAggregateOutputType | null
    _sum: MoneyMovementSumAggregateOutputType | null
    _min: MoneyMovementMinAggregateOutputType | null
    _max: MoneyMovementMaxAggregateOutputType | null
  }

  type GetMoneyMovementGroupByPayload<T extends MoneyMovementGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MoneyMovementGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MoneyMovementGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MoneyMovementGroupByOutputType[P]>
            : GetScalarType<T[P], MoneyMovementGroupByOutputType[P]>
        }
      >
    >


  export type MoneyMovementSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    amount?: boolean
    currency?: boolean
    amountInUsd?: boolean
    fromHolderId?: boolean
    toHolderId?: boolean
    note?: boolean
    photoPath?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    fromHolder?: boolean | MoneyMovement$fromHolderArgs<ExtArgs>
    toHolder?: boolean | MoneyMovement$toHolderArgs<ExtArgs>
  }, ExtArgs["result"]["moneyMovement"]>

  export type MoneyMovementSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    amount?: boolean
    currency?: boolean
    amountInUsd?: boolean
    fromHolderId?: boolean
    toHolderId?: boolean
    note?: boolean
    photoPath?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    fromHolder?: boolean | MoneyMovement$fromHolderArgs<ExtArgs>
    toHolder?: boolean | MoneyMovement$toHolderArgs<ExtArgs>
  }, ExtArgs["result"]["moneyMovement"]>

  export type MoneyMovementSelectScalar = {
    id?: boolean
    amount?: boolean
    currency?: boolean
    amountInUsd?: boolean
    fromHolderId?: boolean
    toHolderId?: boolean
    note?: boolean
    photoPath?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type MoneyMovementInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    fromHolder?: boolean | MoneyMovement$fromHolderArgs<ExtArgs>
    toHolder?: boolean | MoneyMovement$toHolderArgs<ExtArgs>
  }
  export type MoneyMovementIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    fromHolder?: boolean | MoneyMovement$fromHolderArgs<ExtArgs>
    toHolder?: boolean | MoneyMovement$toHolderArgs<ExtArgs>
  }

  export type $MoneyMovementPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "MoneyMovement"
    objects: {
      fromHolder: Prisma.$MoneyHolderPayload<ExtArgs> | null
      toHolder: Prisma.$MoneyHolderPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      amount: number
      currency: string
      amountInUsd: number
      fromHolderId: string | null
      toHolderId: string | null
      note: string | null
      photoPath: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["moneyMovement"]>
    composites: {}
  }

  type MoneyMovementGetPayload<S extends boolean | null | undefined | MoneyMovementDefaultArgs> = $Result.GetResult<Prisma.$MoneyMovementPayload, S>

  type MoneyMovementCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<MoneyMovementFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: MoneyMovementCountAggregateInputType | true
    }

  export interface MoneyMovementDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['MoneyMovement'], meta: { name: 'MoneyMovement' } }
    /**
     * Find zero or one MoneyMovement that matches the filter.
     * @param {MoneyMovementFindUniqueArgs} args - Arguments to find a MoneyMovement
     * @example
     * // Get one MoneyMovement
     * const moneyMovement = await prisma.moneyMovement.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends MoneyMovementFindUniqueArgs>(args: SelectSubset<T, MoneyMovementFindUniqueArgs<ExtArgs>>): Prisma__MoneyMovementClient<$Result.GetResult<Prisma.$MoneyMovementPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one MoneyMovement that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {MoneyMovementFindUniqueOrThrowArgs} args - Arguments to find a MoneyMovement
     * @example
     * // Get one MoneyMovement
     * const moneyMovement = await prisma.moneyMovement.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends MoneyMovementFindUniqueOrThrowArgs>(args: SelectSubset<T, MoneyMovementFindUniqueOrThrowArgs<ExtArgs>>): Prisma__MoneyMovementClient<$Result.GetResult<Prisma.$MoneyMovementPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first MoneyMovement that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MoneyMovementFindFirstArgs} args - Arguments to find a MoneyMovement
     * @example
     * // Get one MoneyMovement
     * const moneyMovement = await prisma.moneyMovement.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends MoneyMovementFindFirstArgs>(args?: SelectSubset<T, MoneyMovementFindFirstArgs<ExtArgs>>): Prisma__MoneyMovementClient<$Result.GetResult<Prisma.$MoneyMovementPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first MoneyMovement that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MoneyMovementFindFirstOrThrowArgs} args - Arguments to find a MoneyMovement
     * @example
     * // Get one MoneyMovement
     * const moneyMovement = await prisma.moneyMovement.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends MoneyMovementFindFirstOrThrowArgs>(args?: SelectSubset<T, MoneyMovementFindFirstOrThrowArgs<ExtArgs>>): Prisma__MoneyMovementClient<$Result.GetResult<Prisma.$MoneyMovementPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more MoneyMovements that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MoneyMovementFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all MoneyMovements
     * const moneyMovements = await prisma.moneyMovement.findMany()
     * 
     * // Get first 10 MoneyMovements
     * const moneyMovements = await prisma.moneyMovement.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const moneyMovementWithIdOnly = await prisma.moneyMovement.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends MoneyMovementFindManyArgs>(args?: SelectSubset<T, MoneyMovementFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MoneyMovementPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a MoneyMovement.
     * @param {MoneyMovementCreateArgs} args - Arguments to create a MoneyMovement.
     * @example
     * // Create one MoneyMovement
     * const MoneyMovement = await prisma.moneyMovement.create({
     *   data: {
     *     // ... data to create a MoneyMovement
     *   }
     * })
     * 
     */
    create<T extends MoneyMovementCreateArgs>(args: SelectSubset<T, MoneyMovementCreateArgs<ExtArgs>>): Prisma__MoneyMovementClient<$Result.GetResult<Prisma.$MoneyMovementPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many MoneyMovements.
     * @param {MoneyMovementCreateManyArgs} args - Arguments to create many MoneyMovements.
     * @example
     * // Create many MoneyMovements
     * const moneyMovement = await prisma.moneyMovement.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends MoneyMovementCreateManyArgs>(args?: SelectSubset<T, MoneyMovementCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many MoneyMovements and returns the data saved in the database.
     * @param {MoneyMovementCreateManyAndReturnArgs} args - Arguments to create many MoneyMovements.
     * @example
     * // Create many MoneyMovements
     * const moneyMovement = await prisma.moneyMovement.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many MoneyMovements and only return the `id`
     * const moneyMovementWithIdOnly = await prisma.moneyMovement.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends MoneyMovementCreateManyAndReturnArgs>(args?: SelectSubset<T, MoneyMovementCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MoneyMovementPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a MoneyMovement.
     * @param {MoneyMovementDeleteArgs} args - Arguments to delete one MoneyMovement.
     * @example
     * // Delete one MoneyMovement
     * const MoneyMovement = await prisma.moneyMovement.delete({
     *   where: {
     *     // ... filter to delete one MoneyMovement
     *   }
     * })
     * 
     */
    delete<T extends MoneyMovementDeleteArgs>(args: SelectSubset<T, MoneyMovementDeleteArgs<ExtArgs>>): Prisma__MoneyMovementClient<$Result.GetResult<Prisma.$MoneyMovementPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one MoneyMovement.
     * @param {MoneyMovementUpdateArgs} args - Arguments to update one MoneyMovement.
     * @example
     * // Update one MoneyMovement
     * const moneyMovement = await prisma.moneyMovement.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends MoneyMovementUpdateArgs>(args: SelectSubset<T, MoneyMovementUpdateArgs<ExtArgs>>): Prisma__MoneyMovementClient<$Result.GetResult<Prisma.$MoneyMovementPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more MoneyMovements.
     * @param {MoneyMovementDeleteManyArgs} args - Arguments to filter MoneyMovements to delete.
     * @example
     * // Delete a few MoneyMovements
     * const { count } = await prisma.moneyMovement.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends MoneyMovementDeleteManyArgs>(args?: SelectSubset<T, MoneyMovementDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MoneyMovements.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MoneyMovementUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many MoneyMovements
     * const moneyMovement = await prisma.moneyMovement.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends MoneyMovementUpdateManyArgs>(args: SelectSubset<T, MoneyMovementUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one MoneyMovement.
     * @param {MoneyMovementUpsertArgs} args - Arguments to update or create a MoneyMovement.
     * @example
     * // Update or create a MoneyMovement
     * const moneyMovement = await prisma.moneyMovement.upsert({
     *   create: {
     *     // ... data to create a MoneyMovement
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the MoneyMovement we want to update
     *   }
     * })
     */
    upsert<T extends MoneyMovementUpsertArgs>(args: SelectSubset<T, MoneyMovementUpsertArgs<ExtArgs>>): Prisma__MoneyMovementClient<$Result.GetResult<Prisma.$MoneyMovementPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of MoneyMovements.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MoneyMovementCountArgs} args - Arguments to filter MoneyMovements to count.
     * @example
     * // Count the number of MoneyMovements
     * const count = await prisma.moneyMovement.count({
     *   where: {
     *     // ... the filter for the MoneyMovements we want to count
     *   }
     * })
    **/
    count<T extends MoneyMovementCountArgs>(
      args?: Subset<T, MoneyMovementCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MoneyMovementCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a MoneyMovement.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MoneyMovementAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends MoneyMovementAggregateArgs>(args: Subset<T, MoneyMovementAggregateArgs>): Prisma.PrismaPromise<GetMoneyMovementAggregateType<T>>

    /**
     * Group by MoneyMovement.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MoneyMovementGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends MoneyMovementGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: MoneyMovementGroupByArgs['orderBy'] }
        : { orderBy?: MoneyMovementGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, MoneyMovementGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMoneyMovementGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the MoneyMovement model
   */
  readonly fields: MoneyMovementFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for MoneyMovement.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__MoneyMovementClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    fromHolder<T extends MoneyMovement$fromHolderArgs<ExtArgs> = {}>(args?: Subset<T, MoneyMovement$fromHolderArgs<ExtArgs>>): Prisma__MoneyHolderClient<$Result.GetResult<Prisma.$MoneyHolderPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    toHolder<T extends MoneyMovement$toHolderArgs<ExtArgs> = {}>(args?: Subset<T, MoneyMovement$toHolderArgs<ExtArgs>>): Prisma__MoneyHolderClient<$Result.GetResult<Prisma.$MoneyHolderPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the MoneyMovement model
   */ 
  interface MoneyMovementFieldRefs {
    readonly id: FieldRef<"MoneyMovement", 'String'>
    readonly amount: FieldRef<"MoneyMovement", 'Float'>
    readonly currency: FieldRef<"MoneyMovement", 'String'>
    readonly amountInUsd: FieldRef<"MoneyMovement", 'Float'>
    readonly fromHolderId: FieldRef<"MoneyMovement", 'String'>
    readonly toHolderId: FieldRef<"MoneyMovement", 'String'>
    readonly note: FieldRef<"MoneyMovement", 'String'>
    readonly photoPath: FieldRef<"MoneyMovement", 'String'>
    readonly createdAt: FieldRef<"MoneyMovement", 'DateTime'>
    readonly updatedAt: FieldRef<"MoneyMovement", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * MoneyMovement findUnique
   */
  export type MoneyMovementFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyMovement
     */
    select?: MoneyMovementSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyMovementInclude<ExtArgs> | null
    /**
     * Filter, which MoneyMovement to fetch.
     */
    where: MoneyMovementWhereUniqueInput
  }

  /**
   * MoneyMovement findUniqueOrThrow
   */
  export type MoneyMovementFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyMovement
     */
    select?: MoneyMovementSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyMovementInclude<ExtArgs> | null
    /**
     * Filter, which MoneyMovement to fetch.
     */
    where: MoneyMovementWhereUniqueInput
  }

  /**
   * MoneyMovement findFirst
   */
  export type MoneyMovementFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyMovement
     */
    select?: MoneyMovementSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyMovementInclude<ExtArgs> | null
    /**
     * Filter, which MoneyMovement to fetch.
     */
    where?: MoneyMovementWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MoneyMovements to fetch.
     */
    orderBy?: MoneyMovementOrderByWithRelationInput | MoneyMovementOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MoneyMovements.
     */
    cursor?: MoneyMovementWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MoneyMovements from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MoneyMovements.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MoneyMovements.
     */
    distinct?: MoneyMovementScalarFieldEnum | MoneyMovementScalarFieldEnum[]
  }

  /**
   * MoneyMovement findFirstOrThrow
   */
  export type MoneyMovementFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyMovement
     */
    select?: MoneyMovementSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyMovementInclude<ExtArgs> | null
    /**
     * Filter, which MoneyMovement to fetch.
     */
    where?: MoneyMovementWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MoneyMovements to fetch.
     */
    orderBy?: MoneyMovementOrderByWithRelationInput | MoneyMovementOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MoneyMovements.
     */
    cursor?: MoneyMovementWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MoneyMovements from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MoneyMovements.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MoneyMovements.
     */
    distinct?: MoneyMovementScalarFieldEnum | MoneyMovementScalarFieldEnum[]
  }

  /**
   * MoneyMovement findMany
   */
  export type MoneyMovementFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyMovement
     */
    select?: MoneyMovementSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyMovementInclude<ExtArgs> | null
    /**
     * Filter, which MoneyMovements to fetch.
     */
    where?: MoneyMovementWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MoneyMovements to fetch.
     */
    orderBy?: MoneyMovementOrderByWithRelationInput | MoneyMovementOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing MoneyMovements.
     */
    cursor?: MoneyMovementWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MoneyMovements from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MoneyMovements.
     */
    skip?: number
    distinct?: MoneyMovementScalarFieldEnum | MoneyMovementScalarFieldEnum[]
  }

  /**
   * MoneyMovement create
   */
  export type MoneyMovementCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyMovement
     */
    select?: MoneyMovementSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyMovementInclude<ExtArgs> | null
    /**
     * The data needed to create a MoneyMovement.
     */
    data: XOR<MoneyMovementCreateInput, MoneyMovementUncheckedCreateInput>
  }

  /**
   * MoneyMovement createMany
   */
  export type MoneyMovementCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many MoneyMovements.
     */
    data: MoneyMovementCreateManyInput | MoneyMovementCreateManyInput[]
  }

  /**
   * MoneyMovement createManyAndReturn
   */
  export type MoneyMovementCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyMovement
     */
    select?: MoneyMovementSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many MoneyMovements.
     */
    data: MoneyMovementCreateManyInput | MoneyMovementCreateManyInput[]
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyMovementIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * MoneyMovement update
   */
  export type MoneyMovementUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyMovement
     */
    select?: MoneyMovementSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyMovementInclude<ExtArgs> | null
    /**
     * The data needed to update a MoneyMovement.
     */
    data: XOR<MoneyMovementUpdateInput, MoneyMovementUncheckedUpdateInput>
    /**
     * Choose, which MoneyMovement to update.
     */
    where: MoneyMovementWhereUniqueInput
  }

  /**
   * MoneyMovement updateMany
   */
  export type MoneyMovementUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update MoneyMovements.
     */
    data: XOR<MoneyMovementUpdateManyMutationInput, MoneyMovementUncheckedUpdateManyInput>
    /**
     * Filter which MoneyMovements to update
     */
    where?: MoneyMovementWhereInput
  }

  /**
   * MoneyMovement upsert
   */
  export type MoneyMovementUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyMovement
     */
    select?: MoneyMovementSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyMovementInclude<ExtArgs> | null
    /**
     * The filter to search for the MoneyMovement to update in case it exists.
     */
    where: MoneyMovementWhereUniqueInput
    /**
     * In case the MoneyMovement found by the `where` argument doesn't exist, create a new MoneyMovement with this data.
     */
    create: XOR<MoneyMovementCreateInput, MoneyMovementUncheckedCreateInput>
    /**
     * In case the MoneyMovement was found with the provided `where` argument, update it with this data.
     */
    update: XOR<MoneyMovementUpdateInput, MoneyMovementUncheckedUpdateInput>
  }

  /**
   * MoneyMovement delete
   */
  export type MoneyMovementDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyMovement
     */
    select?: MoneyMovementSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyMovementInclude<ExtArgs> | null
    /**
     * Filter which MoneyMovement to delete.
     */
    where: MoneyMovementWhereUniqueInput
  }

  /**
   * MoneyMovement deleteMany
   */
  export type MoneyMovementDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MoneyMovements to delete
     */
    where?: MoneyMovementWhereInput
  }

  /**
   * MoneyMovement.fromHolder
   */
  export type MoneyMovement$fromHolderArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyHolder
     */
    select?: MoneyHolderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyHolderInclude<ExtArgs> | null
    where?: MoneyHolderWhereInput
  }

  /**
   * MoneyMovement.toHolder
   */
  export type MoneyMovement$toHolderArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyHolder
     */
    select?: MoneyHolderSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyHolderInclude<ExtArgs> | null
    where?: MoneyHolderWhereInput
  }

  /**
   * MoneyMovement without action
   */
  export type MoneyMovementDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MoneyMovement
     */
    select?: MoneyMovementSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MoneyMovementInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const MoneyHolderScalarFieldEnum: {
    id: 'id',
    name: 'name',
    emoji: 'emoji',
    color: 'color',
    expectedBalance: 'expectedBalance',
    actualBalance: 'actualBalance',
    isSpecialTransit: 'isSpecialTransit',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type MoneyHolderScalarFieldEnum = (typeof MoneyHolderScalarFieldEnum)[keyof typeof MoneyHolderScalarFieldEnum]


  export const MoneyMovementScalarFieldEnum: {
    id: 'id',
    amount: 'amount',
    currency: 'currency',
    amountInUsd: 'amountInUsd',
    fromHolderId: 'fromHolderId',
    toHolderId: 'toHolderId',
    note: 'note',
    photoPath: 'photoPath',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type MoneyMovementScalarFieldEnum = (typeof MoneyMovementScalarFieldEnum)[keyof typeof MoneyMovementScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    
  /**
   * Deep Input Types
   */


  export type MoneyHolderWhereInput = {
    AND?: MoneyHolderWhereInput | MoneyHolderWhereInput[]
    OR?: MoneyHolderWhereInput[]
    NOT?: MoneyHolderWhereInput | MoneyHolderWhereInput[]
    id?: StringFilter<"MoneyHolder"> | string
    name?: StringFilter<"MoneyHolder"> | string
    emoji?: StringFilter<"MoneyHolder"> | string
    color?: StringFilter<"MoneyHolder"> | string
    expectedBalance?: FloatFilter<"MoneyHolder"> | number
    actualBalance?: FloatFilter<"MoneyHolder"> | number
    isSpecialTransit?: BoolFilter<"MoneyHolder"> | boolean
    createdAt?: DateTimeFilter<"MoneyHolder"> | Date | string
    updatedAt?: DateTimeFilter<"MoneyHolder"> | Date | string
    movementsFrom?: MoneyMovementListRelationFilter
    movementsTo?: MoneyMovementListRelationFilter
  }

  export type MoneyHolderOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    emoji?: SortOrder
    color?: SortOrder
    expectedBalance?: SortOrder
    actualBalance?: SortOrder
    isSpecialTransit?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    movementsFrom?: MoneyMovementOrderByRelationAggregateInput
    movementsTo?: MoneyMovementOrderByRelationAggregateInput
  }

  export type MoneyHolderWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    name?: string
    AND?: MoneyHolderWhereInput | MoneyHolderWhereInput[]
    OR?: MoneyHolderWhereInput[]
    NOT?: MoneyHolderWhereInput | MoneyHolderWhereInput[]
    emoji?: StringFilter<"MoneyHolder"> | string
    color?: StringFilter<"MoneyHolder"> | string
    expectedBalance?: FloatFilter<"MoneyHolder"> | number
    actualBalance?: FloatFilter<"MoneyHolder"> | number
    isSpecialTransit?: BoolFilter<"MoneyHolder"> | boolean
    createdAt?: DateTimeFilter<"MoneyHolder"> | Date | string
    updatedAt?: DateTimeFilter<"MoneyHolder"> | Date | string
    movementsFrom?: MoneyMovementListRelationFilter
    movementsTo?: MoneyMovementListRelationFilter
  }, "id" | "name">

  export type MoneyHolderOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    emoji?: SortOrder
    color?: SortOrder
    expectedBalance?: SortOrder
    actualBalance?: SortOrder
    isSpecialTransit?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: MoneyHolderCountOrderByAggregateInput
    _avg?: MoneyHolderAvgOrderByAggregateInput
    _max?: MoneyHolderMaxOrderByAggregateInput
    _min?: MoneyHolderMinOrderByAggregateInput
    _sum?: MoneyHolderSumOrderByAggregateInput
  }

  export type MoneyHolderScalarWhereWithAggregatesInput = {
    AND?: MoneyHolderScalarWhereWithAggregatesInput | MoneyHolderScalarWhereWithAggregatesInput[]
    OR?: MoneyHolderScalarWhereWithAggregatesInput[]
    NOT?: MoneyHolderScalarWhereWithAggregatesInput | MoneyHolderScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"MoneyHolder"> | string
    name?: StringWithAggregatesFilter<"MoneyHolder"> | string
    emoji?: StringWithAggregatesFilter<"MoneyHolder"> | string
    color?: StringWithAggregatesFilter<"MoneyHolder"> | string
    expectedBalance?: FloatWithAggregatesFilter<"MoneyHolder"> | number
    actualBalance?: FloatWithAggregatesFilter<"MoneyHolder"> | number
    isSpecialTransit?: BoolWithAggregatesFilter<"MoneyHolder"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"MoneyHolder"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"MoneyHolder"> | Date | string
  }

  export type MoneyMovementWhereInput = {
    AND?: MoneyMovementWhereInput | MoneyMovementWhereInput[]
    OR?: MoneyMovementWhereInput[]
    NOT?: MoneyMovementWhereInput | MoneyMovementWhereInput[]
    id?: StringFilter<"MoneyMovement"> | string
    amount?: FloatFilter<"MoneyMovement"> | number
    currency?: StringFilter<"MoneyMovement"> | string
    amountInUsd?: FloatFilter<"MoneyMovement"> | number
    fromHolderId?: StringNullableFilter<"MoneyMovement"> | string | null
    toHolderId?: StringNullableFilter<"MoneyMovement"> | string | null
    note?: StringNullableFilter<"MoneyMovement"> | string | null
    photoPath?: StringNullableFilter<"MoneyMovement"> | string | null
    createdAt?: DateTimeFilter<"MoneyMovement"> | Date | string
    updatedAt?: DateTimeFilter<"MoneyMovement"> | Date | string
    fromHolder?: XOR<MoneyHolderNullableRelationFilter, MoneyHolderWhereInput> | null
    toHolder?: XOR<MoneyHolderNullableRelationFilter, MoneyHolderWhereInput> | null
  }

  export type MoneyMovementOrderByWithRelationInput = {
    id?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    amountInUsd?: SortOrder
    fromHolderId?: SortOrderInput | SortOrder
    toHolderId?: SortOrderInput | SortOrder
    note?: SortOrderInput | SortOrder
    photoPath?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    fromHolder?: MoneyHolderOrderByWithRelationInput
    toHolder?: MoneyHolderOrderByWithRelationInput
  }

  export type MoneyMovementWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: MoneyMovementWhereInput | MoneyMovementWhereInput[]
    OR?: MoneyMovementWhereInput[]
    NOT?: MoneyMovementWhereInput | MoneyMovementWhereInput[]
    amount?: FloatFilter<"MoneyMovement"> | number
    currency?: StringFilter<"MoneyMovement"> | string
    amountInUsd?: FloatFilter<"MoneyMovement"> | number
    fromHolderId?: StringNullableFilter<"MoneyMovement"> | string | null
    toHolderId?: StringNullableFilter<"MoneyMovement"> | string | null
    note?: StringNullableFilter<"MoneyMovement"> | string | null
    photoPath?: StringNullableFilter<"MoneyMovement"> | string | null
    createdAt?: DateTimeFilter<"MoneyMovement"> | Date | string
    updatedAt?: DateTimeFilter<"MoneyMovement"> | Date | string
    fromHolder?: XOR<MoneyHolderNullableRelationFilter, MoneyHolderWhereInput> | null
    toHolder?: XOR<MoneyHolderNullableRelationFilter, MoneyHolderWhereInput> | null
  }, "id">

  export type MoneyMovementOrderByWithAggregationInput = {
    id?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    amountInUsd?: SortOrder
    fromHolderId?: SortOrderInput | SortOrder
    toHolderId?: SortOrderInput | SortOrder
    note?: SortOrderInput | SortOrder
    photoPath?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: MoneyMovementCountOrderByAggregateInput
    _avg?: MoneyMovementAvgOrderByAggregateInput
    _max?: MoneyMovementMaxOrderByAggregateInput
    _min?: MoneyMovementMinOrderByAggregateInput
    _sum?: MoneyMovementSumOrderByAggregateInput
  }

  export type MoneyMovementScalarWhereWithAggregatesInput = {
    AND?: MoneyMovementScalarWhereWithAggregatesInput | MoneyMovementScalarWhereWithAggregatesInput[]
    OR?: MoneyMovementScalarWhereWithAggregatesInput[]
    NOT?: MoneyMovementScalarWhereWithAggregatesInput | MoneyMovementScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"MoneyMovement"> | string
    amount?: FloatWithAggregatesFilter<"MoneyMovement"> | number
    currency?: StringWithAggregatesFilter<"MoneyMovement"> | string
    amountInUsd?: FloatWithAggregatesFilter<"MoneyMovement"> | number
    fromHolderId?: StringNullableWithAggregatesFilter<"MoneyMovement"> | string | null
    toHolderId?: StringNullableWithAggregatesFilter<"MoneyMovement"> | string | null
    note?: StringNullableWithAggregatesFilter<"MoneyMovement"> | string | null
    photoPath?: StringNullableWithAggregatesFilter<"MoneyMovement"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"MoneyMovement"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"MoneyMovement"> | Date | string
  }

  export type MoneyHolderCreateInput = {
    id?: string
    name: string
    emoji?: string
    color?: string
    expectedBalance?: number
    actualBalance?: number
    isSpecialTransit?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    movementsFrom?: MoneyMovementCreateNestedManyWithoutFromHolderInput
    movementsTo?: MoneyMovementCreateNestedManyWithoutToHolderInput
  }

  export type MoneyHolderUncheckedCreateInput = {
    id?: string
    name: string
    emoji?: string
    color?: string
    expectedBalance?: number
    actualBalance?: number
    isSpecialTransit?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    movementsFrom?: MoneyMovementUncheckedCreateNestedManyWithoutFromHolderInput
    movementsTo?: MoneyMovementUncheckedCreateNestedManyWithoutToHolderInput
  }

  export type MoneyHolderUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    emoji?: StringFieldUpdateOperationsInput | string
    color?: StringFieldUpdateOperationsInput | string
    expectedBalance?: FloatFieldUpdateOperationsInput | number
    actualBalance?: FloatFieldUpdateOperationsInput | number
    isSpecialTransit?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    movementsFrom?: MoneyMovementUpdateManyWithoutFromHolderNestedInput
    movementsTo?: MoneyMovementUpdateManyWithoutToHolderNestedInput
  }

  export type MoneyHolderUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    emoji?: StringFieldUpdateOperationsInput | string
    color?: StringFieldUpdateOperationsInput | string
    expectedBalance?: FloatFieldUpdateOperationsInput | number
    actualBalance?: FloatFieldUpdateOperationsInput | number
    isSpecialTransit?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    movementsFrom?: MoneyMovementUncheckedUpdateManyWithoutFromHolderNestedInput
    movementsTo?: MoneyMovementUncheckedUpdateManyWithoutToHolderNestedInput
  }

  export type MoneyHolderCreateManyInput = {
    id?: string
    name: string
    emoji?: string
    color?: string
    expectedBalance?: number
    actualBalance?: number
    isSpecialTransit?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MoneyHolderUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    emoji?: StringFieldUpdateOperationsInput | string
    color?: StringFieldUpdateOperationsInput | string
    expectedBalance?: FloatFieldUpdateOperationsInput | number
    actualBalance?: FloatFieldUpdateOperationsInput | number
    isSpecialTransit?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MoneyHolderUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    emoji?: StringFieldUpdateOperationsInput | string
    color?: StringFieldUpdateOperationsInput | string
    expectedBalance?: FloatFieldUpdateOperationsInput | number
    actualBalance?: FloatFieldUpdateOperationsInput | number
    isSpecialTransit?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MoneyMovementCreateInput = {
    id?: string
    amount: number
    currency?: string
    amountInUsd: number
    note?: string | null
    photoPath?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    fromHolder?: MoneyHolderCreateNestedOneWithoutMovementsFromInput
    toHolder?: MoneyHolderCreateNestedOneWithoutMovementsToInput
  }

  export type MoneyMovementUncheckedCreateInput = {
    id?: string
    amount: number
    currency?: string
    amountInUsd: number
    fromHolderId?: string | null
    toHolderId?: string | null
    note?: string | null
    photoPath?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MoneyMovementUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    amountInUsd?: FloatFieldUpdateOperationsInput | number
    note?: NullableStringFieldUpdateOperationsInput | string | null
    photoPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    fromHolder?: MoneyHolderUpdateOneWithoutMovementsFromNestedInput
    toHolder?: MoneyHolderUpdateOneWithoutMovementsToNestedInput
  }

  export type MoneyMovementUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    amountInUsd?: FloatFieldUpdateOperationsInput | number
    fromHolderId?: NullableStringFieldUpdateOperationsInput | string | null
    toHolderId?: NullableStringFieldUpdateOperationsInput | string | null
    note?: NullableStringFieldUpdateOperationsInput | string | null
    photoPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MoneyMovementCreateManyInput = {
    id?: string
    amount: number
    currency?: string
    amountInUsd: number
    fromHolderId?: string | null
    toHolderId?: string | null
    note?: string | null
    photoPath?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MoneyMovementUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    amountInUsd?: FloatFieldUpdateOperationsInput | number
    note?: NullableStringFieldUpdateOperationsInput | string | null
    photoPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MoneyMovementUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    amountInUsd?: FloatFieldUpdateOperationsInput | number
    fromHolderId?: NullableStringFieldUpdateOperationsInput | string | null
    toHolderId?: NullableStringFieldUpdateOperationsInput | string | null
    note?: NullableStringFieldUpdateOperationsInput | string | null
    photoPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type FloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type MoneyMovementListRelationFilter = {
    every?: MoneyMovementWhereInput
    some?: MoneyMovementWhereInput
    none?: MoneyMovementWhereInput
  }

  export type MoneyMovementOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type MoneyHolderCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    emoji?: SortOrder
    color?: SortOrder
    expectedBalance?: SortOrder
    actualBalance?: SortOrder
    isSpecialTransit?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MoneyHolderAvgOrderByAggregateInput = {
    expectedBalance?: SortOrder
    actualBalance?: SortOrder
  }

  export type MoneyHolderMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    emoji?: SortOrder
    color?: SortOrder
    expectedBalance?: SortOrder
    actualBalance?: SortOrder
    isSpecialTransit?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MoneyHolderMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    emoji?: SortOrder
    color?: SortOrder
    expectedBalance?: SortOrder
    actualBalance?: SortOrder
    isSpecialTransit?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MoneyHolderSumOrderByAggregateInput = {
    expectedBalance?: SortOrder
    actualBalance?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type FloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type MoneyHolderNullableRelationFilter = {
    is?: MoneyHolderWhereInput | null
    isNot?: MoneyHolderWhereInput | null
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type MoneyMovementCountOrderByAggregateInput = {
    id?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    amountInUsd?: SortOrder
    fromHolderId?: SortOrder
    toHolderId?: SortOrder
    note?: SortOrder
    photoPath?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MoneyMovementAvgOrderByAggregateInput = {
    amount?: SortOrder
    amountInUsd?: SortOrder
  }

  export type MoneyMovementMaxOrderByAggregateInput = {
    id?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    amountInUsd?: SortOrder
    fromHolderId?: SortOrder
    toHolderId?: SortOrder
    note?: SortOrder
    photoPath?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MoneyMovementMinOrderByAggregateInput = {
    id?: SortOrder
    amount?: SortOrder
    currency?: SortOrder
    amountInUsd?: SortOrder
    fromHolderId?: SortOrder
    toHolderId?: SortOrder
    note?: SortOrder
    photoPath?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MoneyMovementSumOrderByAggregateInput = {
    amount?: SortOrder
    amountInUsd?: SortOrder
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type MoneyMovementCreateNestedManyWithoutFromHolderInput = {
    create?: XOR<MoneyMovementCreateWithoutFromHolderInput, MoneyMovementUncheckedCreateWithoutFromHolderInput> | MoneyMovementCreateWithoutFromHolderInput[] | MoneyMovementUncheckedCreateWithoutFromHolderInput[]
    connectOrCreate?: MoneyMovementCreateOrConnectWithoutFromHolderInput | MoneyMovementCreateOrConnectWithoutFromHolderInput[]
    createMany?: MoneyMovementCreateManyFromHolderInputEnvelope
    connect?: MoneyMovementWhereUniqueInput | MoneyMovementWhereUniqueInput[]
  }

  export type MoneyMovementCreateNestedManyWithoutToHolderInput = {
    create?: XOR<MoneyMovementCreateWithoutToHolderInput, MoneyMovementUncheckedCreateWithoutToHolderInput> | MoneyMovementCreateWithoutToHolderInput[] | MoneyMovementUncheckedCreateWithoutToHolderInput[]
    connectOrCreate?: MoneyMovementCreateOrConnectWithoutToHolderInput | MoneyMovementCreateOrConnectWithoutToHolderInput[]
    createMany?: MoneyMovementCreateManyToHolderInputEnvelope
    connect?: MoneyMovementWhereUniqueInput | MoneyMovementWhereUniqueInput[]
  }

  export type MoneyMovementUncheckedCreateNestedManyWithoutFromHolderInput = {
    create?: XOR<MoneyMovementCreateWithoutFromHolderInput, MoneyMovementUncheckedCreateWithoutFromHolderInput> | MoneyMovementCreateWithoutFromHolderInput[] | MoneyMovementUncheckedCreateWithoutFromHolderInput[]
    connectOrCreate?: MoneyMovementCreateOrConnectWithoutFromHolderInput | MoneyMovementCreateOrConnectWithoutFromHolderInput[]
    createMany?: MoneyMovementCreateManyFromHolderInputEnvelope
    connect?: MoneyMovementWhereUniqueInput | MoneyMovementWhereUniqueInput[]
  }

  export type MoneyMovementUncheckedCreateNestedManyWithoutToHolderInput = {
    create?: XOR<MoneyMovementCreateWithoutToHolderInput, MoneyMovementUncheckedCreateWithoutToHolderInput> | MoneyMovementCreateWithoutToHolderInput[] | MoneyMovementUncheckedCreateWithoutToHolderInput[]
    connectOrCreate?: MoneyMovementCreateOrConnectWithoutToHolderInput | MoneyMovementCreateOrConnectWithoutToHolderInput[]
    createMany?: MoneyMovementCreateManyToHolderInputEnvelope
    connect?: MoneyMovementWhereUniqueInput | MoneyMovementWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type FloatFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type MoneyMovementUpdateManyWithoutFromHolderNestedInput = {
    create?: XOR<MoneyMovementCreateWithoutFromHolderInput, MoneyMovementUncheckedCreateWithoutFromHolderInput> | MoneyMovementCreateWithoutFromHolderInput[] | MoneyMovementUncheckedCreateWithoutFromHolderInput[]
    connectOrCreate?: MoneyMovementCreateOrConnectWithoutFromHolderInput | MoneyMovementCreateOrConnectWithoutFromHolderInput[]
    upsert?: MoneyMovementUpsertWithWhereUniqueWithoutFromHolderInput | MoneyMovementUpsertWithWhereUniqueWithoutFromHolderInput[]
    createMany?: MoneyMovementCreateManyFromHolderInputEnvelope
    set?: MoneyMovementWhereUniqueInput | MoneyMovementWhereUniqueInput[]
    disconnect?: MoneyMovementWhereUniqueInput | MoneyMovementWhereUniqueInput[]
    delete?: MoneyMovementWhereUniqueInput | MoneyMovementWhereUniqueInput[]
    connect?: MoneyMovementWhereUniqueInput | MoneyMovementWhereUniqueInput[]
    update?: MoneyMovementUpdateWithWhereUniqueWithoutFromHolderInput | MoneyMovementUpdateWithWhereUniqueWithoutFromHolderInput[]
    updateMany?: MoneyMovementUpdateManyWithWhereWithoutFromHolderInput | MoneyMovementUpdateManyWithWhereWithoutFromHolderInput[]
    deleteMany?: MoneyMovementScalarWhereInput | MoneyMovementScalarWhereInput[]
  }

  export type MoneyMovementUpdateManyWithoutToHolderNestedInput = {
    create?: XOR<MoneyMovementCreateWithoutToHolderInput, MoneyMovementUncheckedCreateWithoutToHolderInput> | MoneyMovementCreateWithoutToHolderInput[] | MoneyMovementUncheckedCreateWithoutToHolderInput[]
    connectOrCreate?: MoneyMovementCreateOrConnectWithoutToHolderInput | MoneyMovementCreateOrConnectWithoutToHolderInput[]
    upsert?: MoneyMovementUpsertWithWhereUniqueWithoutToHolderInput | MoneyMovementUpsertWithWhereUniqueWithoutToHolderInput[]
    createMany?: MoneyMovementCreateManyToHolderInputEnvelope
    set?: MoneyMovementWhereUniqueInput | MoneyMovementWhereUniqueInput[]
    disconnect?: MoneyMovementWhereUniqueInput | MoneyMovementWhereUniqueInput[]
    delete?: MoneyMovementWhereUniqueInput | MoneyMovementWhereUniqueInput[]
    connect?: MoneyMovementWhereUniqueInput | MoneyMovementWhereUniqueInput[]
    update?: MoneyMovementUpdateWithWhereUniqueWithoutToHolderInput | MoneyMovementUpdateWithWhereUniqueWithoutToHolderInput[]
    updateMany?: MoneyMovementUpdateManyWithWhereWithoutToHolderInput | MoneyMovementUpdateManyWithWhereWithoutToHolderInput[]
    deleteMany?: MoneyMovementScalarWhereInput | MoneyMovementScalarWhereInput[]
  }

  export type MoneyMovementUncheckedUpdateManyWithoutFromHolderNestedInput = {
    create?: XOR<MoneyMovementCreateWithoutFromHolderInput, MoneyMovementUncheckedCreateWithoutFromHolderInput> | MoneyMovementCreateWithoutFromHolderInput[] | MoneyMovementUncheckedCreateWithoutFromHolderInput[]
    connectOrCreate?: MoneyMovementCreateOrConnectWithoutFromHolderInput | MoneyMovementCreateOrConnectWithoutFromHolderInput[]
    upsert?: MoneyMovementUpsertWithWhereUniqueWithoutFromHolderInput | MoneyMovementUpsertWithWhereUniqueWithoutFromHolderInput[]
    createMany?: MoneyMovementCreateManyFromHolderInputEnvelope
    set?: MoneyMovementWhereUniqueInput | MoneyMovementWhereUniqueInput[]
    disconnect?: MoneyMovementWhereUniqueInput | MoneyMovementWhereUniqueInput[]
    delete?: MoneyMovementWhereUniqueInput | MoneyMovementWhereUniqueInput[]
    connect?: MoneyMovementWhereUniqueInput | MoneyMovementWhereUniqueInput[]
    update?: MoneyMovementUpdateWithWhereUniqueWithoutFromHolderInput | MoneyMovementUpdateWithWhereUniqueWithoutFromHolderInput[]
    updateMany?: MoneyMovementUpdateManyWithWhereWithoutFromHolderInput | MoneyMovementUpdateManyWithWhereWithoutFromHolderInput[]
    deleteMany?: MoneyMovementScalarWhereInput | MoneyMovementScalarWhereInput[]
  }

  export type MoneyMovementUncheckedUpdateManyWithoutToHolderNestedInput = {
    create?: XOR<MoneyMovementCreateWithoutToHolderInput, MoneyMovementUncheckedCreateWithoutToHolderInput> | MoneyMovementCreateWithoutToHolderInput[] | MoneyMovementUncheckedCreateWithoutToHolderInput[]
    connectOrCreate?: MoneyMovementCreateOrConnectWithoutToHolderInput | MoneyMovementCreateOrConnectWithoutToHolderInput[]
    upsert?: MoneyMovementUpsertWithWhereUniqueWithoutToHolderInput | MoneyMovementUpsertWithWhereUniqueWithoutToHolderInput[]
    createMany?: MoneyMovementCreateManyToHolderInputEnvelope
    set?: MoneyMovementWhereUniqueInput | MoneyMovementWhereUniqueInput[]
    disconnect?: MoneyMovementWhereUniqueInput | MoneyMovementWhereUniqueInput[]
    delete?: MoneyMovementWhereUniqueInput | MoneyMovementWhereUniqueInput[]
    connect?: MoneyMovementWhereUniqueInput | MoneyMovementWhereUniqueInput[]
    update?: MoneyMovementUpdateWithWhereUniqueWithoutToHolderInput | MoneyMovementUpdateWithWhereUniqueWithoutToHolderInput[]
    updateMany?: MoneyMovementUpdateManyWithWhereWithoutToHolderInput | MoneyMovementUpdateManyWithWhereWithoutToHolderInput[]
    deleteMany?: MoneyMovementScalarWhereInput | MoneyMovementScalarWhereInput[]
  }

  export type MoneyHolderCreateNestedOneWithoutMovementsFromInput = {
    create?: XOR<MoneyHolderCreateWithoutMovementsFromInput, MoneyHolderUncheckedCreateWithoutMovementsFromInput>
    connectOrCreate?: MoneyHolderCreateOrConnectWithoutMovementsFromInput
    connect?: MoneyHolderWhereUniqueInput
  }

  export type MoneyHolderCreateNestedOneWithoutMovementsToInput = {
    create?: XOR<MoneyHolderCreateWithoutMovementsToInput, MoneyHolderUncheckedCreateWithoutMovementsToInput>
    connectOrCreate?: MoneyHolderCreateOrConnectWithoutMovementsToInput
    connect?: MoneyHolderWhereUniqueInput
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type MoneyHolderUpdateOneWithoutMovementsFromNestedInput = {
    create?: XOR<MoneyHolderCreateWithoutMovementsFromInput, MoneyHolderUncheckedCreateWithoutMovementsFromInput>
    connectOrCreate?: MoneyHolderCreateOrConnectWithoutMovementsFromInput
    upsert?: MoneyHolderUpsertWithoutMovementsFromInput
    disconnect?: MoneyHolderWhereInput | boolean
    delete?: MoneyHolderWhereInput | boolean
    connect?: MoneyHolderWhereUniqueInput
    update?: XOR<XOR<MoneyHolderUpdateToOneWithWhereWithoutMovementsFromInput, MoneyHolderUpdateWithoutMovementsFromInput>, MoneyHolderUncheckedUpdateWithoutMovementsFromInput>
  }

  export type MoneyHolderUpdateOneWithoutMovementsToNestedInput = {
    create?: XOR<MoneyHolderCreateWithoutMovementsToInput, MoneyHolderUncheckedCreateWithoutMovementsToInput>
    connectOrCreate?: MoneyHolderCreateOrConnectWithoutMovementsToInput
    upsert?: MoneyHolderUpsertWithoutMovementsToInput
    disconnect?: MoneyHolderWhereInput | boolean
    delete?: MoneyHolderWhereInput | boolean
    connect?: MoneyHolderWhereUniqueInput
    update?: XOR<XOR<MoneyHolderUpdateToOneWithWhereWithoutMovementsToInput, MoneyHolderUpdateWithoutMovementsToInput>, MoneyHolderUncheckedUpdateWithoutMovementsToInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedFloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type MoneyMovementCreateWithoutFromHolderInput = {
    id?: string
    amount: number
    currency?: string
    amountInUsd: number
    note?: string | null
    photoPath?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    toHolder?: MoneyHolderCreateNestedOneWithoutMovementsToInput
  }

  export type MoneyMovementUncheckedCreateWithoutFromHolderInput = {
    id?: string
    amount: number
    currency?: string
    amountInUsd: number
    toHolderId?: string | null
    note?: string | null
    photoPath?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MoneyMovementCreateOrConnectWithoutFromHolderInput = {
    where: MoneyMovementWhereUniqueInput
    create: XOR<MoneyMovementCreateWithoutFromHolderInput, MoneyMovementUncheckedCreateWithoutFromHolderInput>
  }

  export type MoneyMovementCreateManyFromHolderInputEnvelope = {
    data: MoneyMovementCreateManyFromHolderInput | MoneyMovementCreateManyFromHolderInput[]
  }

  export type MoneyMovementCreateWithoutToHolderInput = {
    id?: string
    amount: number
    currency?: string
    amountInUsd: number
    note?: string | null
    photoPath?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    fromHolder?: MoneyHolderCreateNestedOneWithoutMovementsFromInput
  }

  export type MoneyMovementUncheckedCreateWithoutToHolderInput = {
    id?: string
    amount: number
    currency?: string
    amountInUsd: number
    fromHolderId?: string | null
    note?: string | null
    photoPath?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MoneyMovementCreateOrConnectWithoutToHolderInput = {
    where: MoneyMovementWhereUniqueInput
    create: XOR<MoneyMovementCreateWithoutToHolderInput, MoneyMovementUncheckedCreateWithoutToHolderInput>
  }

  export type MoneyMovementCreateManyToHolderInputEnvelope = {
    data: MoneyMovementCreateManyToHolderInput | MoneyMovementCreateManyToHolderInput[]
  }

  export type MoneyMovementUpsertWithWhereUniqueWithoutFromHolderInput = {
    where: MoneyMovementWhereUniqueInput
    update: XOR<MoneyMovementUpdateWithoutFromHolderInput, MoneyMovementUncheckedUpdateWithoutFromHolderInput>
    create: XOR<MoneyMovementCreateWithoutFromHolderInput, MoneyMovementUncheckedCreateWithoutFromHolderInput>
  }

  export type MoneyMovementUpdateWithWhereUniqueWithoutFromHolderInput = {
    where: MoneyMovementWhereUniqueInput
    data: XOR<MoneyMovementUpdateWithoutFromHolderInput, MoneyMovementUncheckedUpdateWithoutFromHolderInput>
  }

  export type MoneyMovementUpdateManyWithWhereWithoutFromHolderInput = {
    where: MoneyMovementScalarWhereInput
    data: XOR<MoneyMovementUpdateManyMutationInput, MoneyMovementUncheckedUpdateManyWithoutFromHolderInput>
  }

  export type MoneyMovementScalarWhereInput = {
    AND?: MoneyMovementScalarWhereInput | MoneyMovementScalarWhereInput[]
    OR?: MoneyMovementScalarWhereInput[]
    NOT?: MoneyMovementScalarWhereInput | MoneyMovementScalarWhereInput[]
    id?: StringFilter<"MoneyMovement"> | string
    amount?: FloatFilter<"MoneyMovement"> | number
    currency?: StringFilter<"MoneyMovement"> | string
    amountInUsd?: FloatFilter<"MoneyMovement"> | number
    fromHolderId?: StringNullableFilter<"MoneyMovement"> | string | null
    toHolderId?: StringNullableFilter<"MoneyMovement"> | string | null
    note?: StringNullableFilter<"MoneyMovement"> | string | null
    photoPath?: StringNullableFilter<"MoneyMovement"> | string | null
    createdAt?: DateTimeFilter<"MoneyMovement"> | Date | string
    updatedAt?: DateTimeFilter<"MoneyMovement"> | Date | string
  }

  export type MoneyMovementUpsertWithWhereUniqueWithoutToHolderInput = {
    where: MoneyMovementWhereUniqueInput
    update: XOR<MoneyMovementUpdateWithoutToHolderInput, MoneyMovementUncheckedUpdateWithoutToHolderInput>
    create: XOR<MoneyMovementCreateWithoutToHolderInput, MoneyMovementUncheckedCreateWithoutToHolderInput>
  }

  export type MoneyMovementUpdateWithWhereUniqueWithoutToHolderInput = {
    where: MoneyMovementWhereUniqueInput
    data: XOR<MoneyMovementUpdateWithoutToHolderInput, MoneyMovementUncheckedUpdateWithoutToHolderInput>
  }

  export type MoneyMovementUpdateManyWithWhereWithoutToHolderInput = {
    where: MoneyMovementScalarWhereInput
    data: XOR<MoneyMovementUpdateManyMutationInput, MoneyMovementUncheckedUpdateManyWithoutToHolderInput>
  }

  export type MoneyHolderCreateWithoutMovementsFromInput = {
    id?: string
    name: string
    emoji?: string
    color?: string
    expectedBalance?: number
    actualBalance?: number
    isSpecialTransit?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    movementsTo?: MoneyMovementCreateNestedManyWithoutToHolderInput
  }

  export type MoneyHolderUncheckedCreateWithoutMovementsFromInput = {
    id?: string
    name: string
    emoji?: string
    color?: string
    expectedBalance?: number
    actualBalance?: number
    isSpecialTransit?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    movementsTo?: MoneyMovementUncheckedCreateNestedManyWithoutToHolderInput
  }

  export type MoneyHolderCreateOrConnectWithoutMovementsFromInput = {
    where: MoneyHolderWhereUniqueInput
    create: XOR<MoneyHolderCreateWithoutMovementsFromInput, MoneyHolderUncheckedCreateWithoutMovementsFromInput>
  }

  export type MoneyHolderCreateWithoutMovementsToInput = {
    id?: string
    name: string
    emoji?: string
    color?: string
    expectedBalance?: number
    actualBalance?: number
    isSpecialTransit?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    movementsFrom?: MoneyMovementCreateNestedManyWithoutFromHolderInput
  }

  export type MoneyHolderUncheckedCreateWithoutMovementsToInput = {
    id?: string
    name: string
    emoji?: string
    color?: string
    expectedBalance?: number
    actualBalance?: number
    isSpecialTransit?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    movementsFrom?: MoneyMovementUncheckedCreateNestedManyWithoutFromHolderInput
  }

  export type MoneyHolderCreateOrConnectWithoutMovementsToInput = {
    where: MoneyHolderWhereUniqueInput
    create: XOR<MoneyHolderCreateWithoutMovementsToInput, MoneyHolderUncheckedCreateWithoutMovementsToInput>
  }

  export type MoneyHolderUpsertWithoutMovementsFromInput = {
    update: XOR<MoneyHolderUpdateWithoutMovementsFromInput, MoneyHolderUncheckedUpdateWithoutMovementsFromInput>
    create: XOR<MoneyHolderCreateWithoutMovementsFromInput, MoneyHolderUncheckedCreateWithoutMovementsFromInput>
    where?: MoneyHolderWhereInput
  }

  export type MoneyHolderUpdateToOneWithWhereWithoutMovementsFromInput = {
    where?: MoneyHolderWhereInput
    data: XOR<MoneyHolderUpdateWithoutMovementsFromInput, MoneyHolderUncheckedUpdateWithoutMovementsFromInput>
  }

  export type MoneyHolderUpdateWithoutMovementsFromInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    emoji?: StringFieldUpdateOperationsInput | string
    color?: StringFieldUpdateOperationsInput | string
    expectedBalance?: FloatFieldUpdateOperationsInput | number
    actualBalance?: FloatFieldUpdateOperationsInput | number
    isSpecialTransit?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    movementsTo?: MoneyMovementUpdateManyWithoutToHolderNestedInput
  }

  export type MoneyHolderUncheckedUpdateWithoutMovementsFromInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    emoji?: StringFieldUpdateOperationsInput | string
    color?: StringFieldUpdateOperationsInput | string
    expectedBalance?: FloatFieldUpdateOperationsInput | number
    actualBalance?: FloatFieldUpdateOperationsInput | number
    isSpecialTransit?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    movementsTo?: MoneyMovementUncheckedUpdateManyWithoutToHolderNestedInput
  }

  export type MoneyHolderUpsertWithoutMovementsToInput = {
    update: XOR<MoneyHolderUpdateWithoutMovementsToInput, MoneyHolderUncheckedUpdateWithoutMovementsToInput>
    create: XOR<MoneyHolderCreateWithoutMovementsToInput, MoneyHolderUncheckedCreateWithoutMovementsToInput>
    where?: MoneyHolderWhereInput
  }

  export type MoneyHolderUpdateToOneWithWhereWithoutMovementsToInput = {
    where?: MoneyHolderWhereInput
    data: XOR<MoneyHolderUpdateWithoutMovementsToInput, MoneyHolderUncheckedUpdateWithoutMovementsToInput>
  }

  export type MoneyHolderUpdateWithoutMovementsToInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    emoji?: StringFieldUpdateOperationsInput | string
    color?: StringFieldUpdateOperationsInput | string
    expectedBalance?: FloatFieldUpdateOperationsInput | number
    actualBalance?: FloatFieldUpdateOperationsInput | number
    isSpecialTransit?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    movementsFrom?: MoneyMovementUpdateManyWithoutFromHolderNestedInput
  }

  export type MoneyHolderUncheckedUpdateWithoutMovementsToInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    emoji?: StringFieldUpdateOperationsInput | string
    color?: StringFieldUpdateOperationsInput | string
    expectedBalance?: FloatFieldUpdateOperationsInput | number
    actualBalance?: FloatFieldUpdateOperationsInput | number
    isSpecialTransit?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    movementsFrom?: MoneyMovementUncheckedUpdateManyWithoutFromHolderNestedInput
  }

  export type MoneyMovementCreateManyFromHolderInput = {
    id?: string
    amount: number
    currency?: string
    amountInUsd: number
    toHolderId?: string | null
    note?: string | null
    photoPath?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MoneyMovementCreateManyToHolderInput = {
    id?: string
    amount: number
    currency?: string
    amountInUsd: number
    fromHolderId?: string | null
    note?: string | null
    photoPath?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MoneyMovementUpdateWithoutFromHolderInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    amountInUsd?: FloatFieldUpdateOperationsInput | number
    note?: NullableStringFieldUpdateOperationsInput | string | null
    photoPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    toHolder?: MoneyHolderUpdateOneWithoutMovementsToNestedInput
  }

  export type MoneyMovementUncheckedUpdateWithoutFromHolderInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    amountInUsd?: FloatFieldUpdateOperationsInput | number
    toHolderId?: NullableStringFieldUpdateOperationsInput | string | null
    note?: NullableStringFieldUpdateOperationsInput | string | null
    photoPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MoneyMovementUncheckedUpdateManyWithoutFromHolderInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    amountInUsd?: FloatFieldUpdateOperationsInput | number
    toHolderId?: NullableStringFieldUpdateOperationsInput | string | null
    note?: NullableStringFieldUpdateOperationsInput | string | null
    photoPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MoneyMovementUpdateWithoutToHolderInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    amountInUsd?: FloatFieldUpdateOperationsInput | number
    note?: NullableStringFieldUpdateOperationsInput | string | null
    photoPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    fromHolder?: MoneyHolderUpdateOneWithoutMovementsFromNestedInput
  }

  export type MoneyMovementUncheckedUpdateWithoutToHolderInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    amountInUsd?: FloatFieldUpdateOperationsInput | number
    fromHolderId?: NullableStringFieldUpdateOperationsInput | string | null
    note?: NullableStringFieldUpdateOperationsInput | string | null
    photoPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MoneyMovementUncheckedUpdateManyWithoutToHolderInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    currency?: StringFieldUpdateOperationsInput | string
    amountInUsd?: FloatFieldUpdateOperationsInput | number
    fromHolderId?: NullableStringFieldUpdateOperationsInput | string | null
    note?: NullableStringFieldUpdateOperationsInput | string | null
    photoPath?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use MoneyHolderCountOutputTypeDefaultArgs instead
     */
    export type MoneyHolderCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = MoneyHolderCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use MoneyHolderDefaultArgs instead
     */
    export type MoneyHolderArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = MoneyHolderDefaultArgs<ExtArgs>
    /**
     * @deprecated Use MoneyMovementDefaultArgs instead
     */
    export type MoneyMovementArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = MoneyMovementDefaultArgs<ExtArgs>

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}