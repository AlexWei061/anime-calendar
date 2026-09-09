"use client";

import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AvatarEditor } from "../avatar-editor";
import { useViewer } from "../hooks/use-viewer";
import type { AuthDialogMode } from "../types";

type AccountDialogContextValue = {
  openAuthDialog: (mode: AuthDialogMode, opener: HTMLButtonElement) => void;
  accountNotice: string | null;
  setAccountNotice: (notice: string | null) => void;
};
const AccountDialogContext = createContext<AccountDialogContextValue | null>(null);
function useAccountDialog() {
  const value = useContext(AccountDialogContext);
  if (!value) throw new Error("AccountProvider is missing");
  return value;
}

export function AccountProvider({ children }: { children: ReactNode; }) {
  const { authenticate, changePassword, isChangingSession } = useViewer();
  const [authDialogMode, setAuthDialogMode] = useState<AuthDialogMode | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [accountNotice, setAccountNotice] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const authDialogRef = useRef<HTMLDialogElement>(null);
  const authOpenerRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (authDialogMode && authDialogRef.current && !authDialogRef.current.open) {
      authDialogRef.current.showModal();
    }
  }, [authDialogMode]);
  const openAuthDialog = (mode: AuthDialogMode, opener: HTMLButtonElement) => {
    if (isChangingSession) return;
    authOpenerRef.current = opener;
    setAuthError(null);
    setAccountNotice(null);
    setAuthDialogMode(mode);
  };

  const handleAuthDialogClose = () => {
    setAuthDialogMode(null);
    setAuthError(null);
    if (authOpenerRef.current?.isConnected) authOpenerRef.current.focus();
  };

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingAuth || isChangingSession || !authDialogMode || authDialogMode === "change-password") return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const displayName = String(form.get("displayName") ?? "");
    setIsSubmittingAuth(true);
    setAuthError(null);
    try {
      await authenticate(authDialogMode, authDialogMode === "register" ? { email, password, displayName } : { email, password });
      authDialogRef.current?.close();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "网络错误，请重试。");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const submitPasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingAuth || isChangingSession || authDialogMode !== "change-password") return;
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) {
      setAuthError("两次输入的新密码不一致。");
      return;
    }
    setIsSubmittingAuth(true);
    setAuthError(null);
    try {
      await changePassword(currentPassword, newPassword);
      authDialogRef.current?.close();
      setAccountNotice("密码已修改，请使用新密码重新登录。");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "网络错误，请重试。");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  return <AccountDialogContext.Provider value={{ openAuthDialog, accountNotice, setAccountNotice }}>
    {children}
    {authDialogMode ? (
      <dialog
        ref={authDialogRef}
        className="auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
        onClose={handleAuthDialogClose}
        onClick={(clickEvent) => {
          if (clickEvent.target !== clickEvent.currentTarget) return;
          const rect = clickEvent.currentTarget.getBoundingClientRect();
          if (
            clickEvent.clientX < rect.left ||
            clickEvent.clientX > rect.right ||
            clickEvent.clientY < rect.top ||
            clickEvent.clientY > rect.bottom
          ) {
            clickEvent.currentTarget.close();
          }
        }}
      >
        <div className="detail-dialog-heading">
          <p className="section-kicker">账号</p>
          <button
            className="dialog-close"
            type="button"
            aria-label="关闭账号窗口"
            onClick={() => authDialogRef.current?.close()}
            autoFocus
          >
            关闭
          </button>
        </div>
        <h2 id="auth-dialog-title">
          {authDialogMode === "login"
            ? "登录"
            : authDialogMode === "register"
              ? "注册"
              : "修改密码"}
        </h2>
        <form
          className="auth-form"
          onSubmit={(submitEvent) =>
            void (authDialogMode === "change-password"
              ? submitPasswordChange(submitEvent)
              : submitAuth(submitEvent))
          }
        >
          {authDialogMode === "change-password" ? (
            <>
              <label>
                当前密码
                <input
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <label>
                新密码
                <input
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                  placeholder="至少 8 位"
                />
              </label>
              <label>
                确认新密码
                <input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                />
              </label>
            </>
          ) : (
            <>
              <label>
                邮箱
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                />
              </label>
              <label>
                密码
                <input
                  name="password"
                  type="password"
                  autoComplete={authDialogMode === "login" ? "current-password" : "new-password"}
                  required
                  minLength={8}
                  maxLength={72}
                  placeholder="至少 8 位"
                />
              </label>
            </>
          )}
          {authDialogMode === "register" ? (
            <label>
              昵称（可选）
              <input name="displayName" type="text" autoComplete="nickname" maxLength={40} />
            </label>
          ) : null}
          {authError ? (
            <p className="auth-error" role="alert">
              {authError}
            </p>
          ) : null}
          <button className="auth-submit" type="submit" disabled={isSubmittingAuth || isChangingSession}>
            {isSubmittingAuth
              ? "正在提交…"
              : authDialogMode === "login"
                ? "登录"
                : authDialogMode === "register"
                  ? "注册并登录"
                  : "修改密码并退出"}
          </button>
        </form>
        {authDialogMode !== "change-password" ? (
          <p className="auth-switch">
            {authDialogMode === "login" ? "还没有账号？" : "已有账号？"}
            <button
              type="button"
              disabled={isSubmittingAuth || isChangingSession}
              onClick={(clickEvent) =>
                openAuthDialog(authDialogMode === "login" ? "register" : "login", clickEvent.currentTarget)
              }
            >
              {authDialogMode === "login" ? "立即注册" : "直接登录"}
            </button>
          </p>
        ) : null}
      </dialog>
    ) : null}
  </AccountDialogContext.Provider>;
}

export function SignInPrompt() {
  const { currentUser, authLoaded, isChangingSession } = useViewer();
  const { openAuthDialog } = useAccountDialog();
  return !currentUser && authLoaded ? (
    <button className="sign-in-prompt-button" type="button" aria-haspopup="dialog" disabled={isChangingSession}
      onClick={(event) => openAuthDialog("login", event.currentTarget)}>
      登录 / 注册
    </button>
  ) : null;
}

function AccountMenu() {
  const { currentUser, authLoaded, isChangingSession, signOut: revokeSession, deleteAvatar: removeAvatar, updateAvatar } = useViewer();
  const { openAuthDialog, accountNotice, setAccountNotice } = useAccountDialog();
  const [accountError, setAccountError] = useState<string | null>(null);
  const [isAccountCardOpen, setIsAccountCardOpen] = useState(false);
  const accountAreaRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isAccountCardOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!accountAreaRef.current?.contains(event.target as Node)) {
        setIsAccountCardOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (document.querySelector<HTMLDialogElement>(".avatar-crop-dialog")?.open) return;
        setIsAccountCardOpen(false);
        accountTriggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountCardOpen]);
  const openPasswordChangeFromAccount = () => {
    if (!accountTriggerRef.current) return;
    setIsAccountCardOpen(false);
    openAuthDialog("change-password", accountTriggerRef.current);
  };

  const signOut = async () => {
    setAccountError(null);
    setAccountNotice(null);
    try {
      await revokeSession();
      setIsAccountCardOpen(false);
    } catch {
      setAccountError("退出失败，请重试。");
    }
  };
  const deleteAvatar = async () => {
    if (!currentUser?.avatarUrl || !window.confirm("删除头像并恢复默认头像？")) return;
    setAccountError(null);
    try {
      await removeAvatar();
    } catch {
      setAccountError("删除头像失败，请重试。");
    }
  };
  return (
    <div className="account-area" ref={accountAreaRef}>
      {currentUser ? (
        <>
          <button
            className="account-trigger"
            ref={accountTriggerRef}
            type="button"
            aria-expanded={isAccountCardOpen}
            aria-controls="account-card"
            onClick={() => setIsAccountCardOpen((isOpen) => !isOpen)}
          >
            <span>{currentUser.displayName}</span>
            <span className="account-trigger-chevron" aria-hidden="true">⌄</span>
          </button>
          {isAccountCardOpen ? (
            <div className="account-card" id="account-card" role="group" aria-label="账号操作">
              <div className="account-profile">
                <AvatarEditor
                  displayName={currentUser.displayName}
                  avatarUrl={currentUser.avatarUrl}
                  onAvatarChange={(avatarUrl) => {
                    updateAvatar(avatarUrl);
                    setAccountError(null);
                  }}
                  onError={setAccountError}
                />
                <span className="account-identity">
                  <strong>{currentUser.displayName}</strong>
                  <span className="account-email" title={currentUser.email}>
                    {currentUser.email}
                  </span>
                </span>
              </div>
              <span className="account-card-divider" aria-hidden="true" />
              {currentUser.avatarUrl ? (
                <button
                  className="account-card-action account-card-action-danger"
                  type="button"
                  onClick={() => void deleteAvatar()}
                >
                  <span className="account-action-icon" aria-hidden="true">⌫</span>
                  <span>删除头像</span>
                </button>
              ) : null}
              <button className="account-card-action" type="button" disabled={isChangingSession} onClick={openPasswordChangeFromAccount}>
                <span className="account-action-icon" aria-hidden="true">✎</span>
                修改密码
              </button>
              <button
                className="account-card-action account-card-action-danger"
                type="button"
                disabled={isChangingSession}
                onClick={() => void signOut()}
              >
                <span className="account-action-icon" aria-hidden="true">↪</span>
                退出登录
              </button>
              {accountError ? <span className="account-card-error" role="alert">{accountError}</span> : null}
            </div>
          ) : null}
        </>
      ) : authLoaded ? (
        <button
          type="button"
          aria-haspopup="dialog"
          disabled={isChangingSession}
          onClick={(clickEvent) => openAuthDialog("login", clickEvent.currentTarget)}
        >
          登录 / 注册
        </button>
      ) : null}
      {!currentUser && accountError ? <span role="alert">{accountError}</span> : null}
      {accountNotice ? <span className="account-notice" role="status">{accountNotice}</span> : null}
    </div>
  );
}

export function AccountControls() {
  const { currentUser } = useViewer();
  return <AccountMenu key={currentUser?.email ?? "signed-out"} />;
}
