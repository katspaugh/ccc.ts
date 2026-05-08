declare const __ctxBrand: unique symbol
declare const __payloadBrand: unique symbol

export type StateToken<Name extends string, Ctx> = {
  readonly id: Name
  readonly [__ctxBrand]?: (_: never) => Ctx
}

export type EventConstructor<Type extends string, Payload extends object> = {
  readonly type: Type
  readonly [__payloadBrand]?: (_: never) => Payload
} & (Payload extends Record<PropertyKey, never>
  ? () => { readonly type: Type }
  : (payload: Payload) => { readonly type: Type } & Payload)

export type StatesMap = Record<string, object>
export type EventsMap = Record<string, object>

export type StatesOf<S extends StatesMap> = {
  [K in keyof S & string]: StateToken<K, S[K]>
}

export type EventsOf<E extends EventsMap> = {
  [K in keyof E & string]: EventConstructor<K, E[K]>
}

export type ContextOf<T> = T extends StateToken<string, infer C> ? C : never
export type PayloadOf<T> = T extends EventConstructor<string, infer P> ? P : never

export type StateValue<S extends StatesMap> = {
  [K in keyof S & string]: {
    readonly name: K
    readonly context: S[K]
    is<N extends keyof S & string>(
      token: StateToken<N, S[N]>
    ): this is { readonly name: N; readonly context: S[N] }
  }
}[keyof S & string]

export type EventValue<E extends EventsMap> = {
  [K in keyof E & string]: { readonly type: K } & E[K]
}[keyof E & string]
