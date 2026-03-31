/**
 * 最小类型声明，用于 openclaw/plugin-sdk 子路径导入。
 * 实际类型由 OpenClaw gateway 运行时提供。
 *
 * 参考：https://docs.openclaw.ai/plugins/sdk-runtime#other-top-level-api-fields
 */
declare module 'openclaw/plugin-sdk/plugin-entry' {
  interface ToolDefinition {
    name: string;
    description: string;
    parameters: unknown;
    execute(id: string, params: unknown): Promise<{
      content: Array<{ type: 'text'; text: string }>;
    }>;
  }

  interface ToolOptions {
    optional?: boolean;
  }

  interface PluginLogger {
    debug(msg: string, ...args: unknown[]): void;
    info(msg: string, ...args: unknown[]): void;
    warn(msg: string, ...args: unknown[]): void;
    error(msg: string, ...args: unknown[]): void;
  }

  interface PluginApi {
    /** 插件 ID */
    id: string;
    /** 插件名称 */
    name: string;
    /** 完整 OpenClaw 配置 */
    config: Record<string, unknown>;
    /** 插件自身配置 (plugins.entries.<id>.config) */
    pluginConfig: Record<string, unknown>;
    /** 插件日志器 */
    logger: PluginLogger;
    /** 注册模式 */
    registrationMode: 'full' | 'setup-only' | 'setup-runtime' | 'cli-metadata';
    /** 注册工具 */
    registerTool(tool: ToolDefinition, opts?: ToolOptions): void;
  }

  interface PluginEntry {
    id: string;
    name: string;
    description?: string;
    register(api: PluginApi): void;
  }

  export function definePluginEntry(entry: PluginEntry): unknown;
}
