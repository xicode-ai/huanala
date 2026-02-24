/**
 * AuthProvider 标准接口
 * 与技术框架无关的统一认证契约，支持可插拔切换后端认证方式
 */
export interface AuthProvider {
  /** 获取当前 access token，若无有效 token 返回 null */
  getToken(): Promise<string | null>;
  /** 验证当前会话是否有效 */
  validateSession(): Promise<boolean>;
  /** 处理认证错误，返回是否已处理（如已跳转登录页） */
  onAuthError(statusCode: number): Promise<boolean>;
}

// ─── 全局 AuthProvider 注册 ─────────────────────────────────

let currentProvider: AuthProvider | null = null;

/**
 * 注册全局 AuthProvider 实例
 */
export const setAuthProvider = (provider: AuthProvider): void => {
  currentProvider = provider;
};

/**
 * 获取当前全局 AuthProvider 实例
 * @throws 若未注册则抛出错误
 */
export const getAuthProvider = (): AuthProvider => {
  if (!currentProvider) {
    throw new Error('[AuthProvider] 未初始化，请先调用 setAuthProvider() 注册认证提供者');
  }
  return currentProvider;
};
