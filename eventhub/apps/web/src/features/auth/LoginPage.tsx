import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { titleOf } from "../../api/queries";
import { useCurrentUser, useLogin, useRegister } from "./useAuth";

export function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { data: user } = useCurrentUser();
  const login = useLogin();
  const register = useRegister();
  const navigate = useNavigate();
  const location = useLocation();

  const from =
    (location.state as { from?: string } | null)?.from ?? "/me";

  if (user) {
    return <Navigate to={from} replace />;
  }

  const activeMutation = mode === "login" ? login : register;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    activeMutation.mutate(
      { email, password },
      {
        onSuccess: () => {
          navigate(from, { replace: true });
        },
      },
    );
  };

  const switchMode = (next: "login" | "register") => {
    setMode(next);
    login.reset();
    register.reset();
  };

  return (
    <section className="auth-card event-card">
      <div className="filters__group" role="tablist" aria-label="Режим автентифікації">
        <button
          type="button"
          role="tab"
          className="chip"
          aria-selected={mode === "login"}
          aria-pressed={mode === "login"}
          onClick={() => switchMode("login")}
        >
          Вхід
        </button>
        <button
          type="button"
          role="tab"
          className="chip"
          aria-selected={mode === "register"}
          aria-pressed={mode === "register"}
          onClick={() => switchMode("register")}
        >
          Реєстрація
        </button>
      </div>

      <h2>{mode === "login" ? "Вхід у систему" : "Створення облікового запису"}</h2>

      <form className="auth-form" onSubmit={onSubmit}>
        <label className="auth-form__field">
          <span>Електронна пошта</span>
          <input
            type="email"
            required
            autoComplete="email"
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@example.com"
          />
        </label>

        <label className="auth-form__field">
          <span>
            Пароль {mode === "register" ? "(від 10 символів)" : ""}
          </span>
          <input
            type="password"
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "register" ? 10 : 1}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {activeMutation.isError && (
          <p className="auth-form__error" role="alert">
            {titleOf(activeMutation.error)}
          </p>
        )}

        <button
          type="submit"
          className="button"
          disabled={activeMutation.isPending}
        >
          {activeMutation.isPending
            ? "Зачекайте…"
            : mode === "login"
              ? "Увійти"
              : "Зареєструватися"}
        </button>
      </form>
    </section>
  );
}
