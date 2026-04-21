export const createSupabaseStub = <T extends (...args: any[]) => any>(
  moduleName: string,
  exportName: string,
): T =>
  ((..._args: any[]) => {
    throw new Error(
      `[admin-data-provider] Supabase provider is not implemented for ${moduleName}.${exportName}. ` +
        `Keep this module on Firebase or add the Supabase implementation before switching it.`,
    )
  }) as unknown as T
