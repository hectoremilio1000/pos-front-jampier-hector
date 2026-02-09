// src/pages/LoginScreen.tsx
import { useAuth } from "@/components/Auth/AuthContext";
import TecladoVirtual from "@/components/TecladoVirtual";
import { message } from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const MOBILE_MEDIA_QUERY = "(max-width: 767px)";
const KEYBOARD_VISIBILITY_STORAGE_KEY_DESKTOP =
  "pos_centro_login_keyboard_visible_desktop";
const KEYBOARD_VISIBILITY_STORAGE_KEY_MOBILE =
  "pos_centro_login_keyboard_visible_mobile";

const getIsMobileViewport = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
};

const getKeyboardVisibilityPreference = (isMobileViewport: boolean): boolean => {
  if (typeof window === "undefined") return !isMobileViewport;

  const storageKey = isMobileViewport
    ? KEYBOARD_VISIBILITY_STORAGE_KEY_MOBILE
    : KEYBOARD_VISIBILITY_STORAGE_KEY_DESKTOP;

  const savedPreference = window.localStorage.getItem(storageKey);
  if (savedPreference === null) return !isMobileViewport;

  return savedPreference !== "false";
};

const LoginScreen: React.FC = () => {
  const [password, setPassword] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [tecladoActive, setTecladoActive] = useState<"email" | "password">(
    "email"
  );
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    getIsMobileViewport()
  );
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(() =>
    getKeyboardVisibilityPreference(getIsMobileViewport())
  );

  const { token, login } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (token) navigate("/dashboard"); // 🔁 Si ya está logueado, redirige
  }, [token, navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQueryList = window.matchMedia(MOBILE_MEDIA_QUERY);
    const applyViewportPreference = (isMobile: boolean) => {
      setIsMobileViewport(isMobile);
      setIsKeyboardVisible(getKeyboardVisibilityPreference(isMobile));
    };

    applyViewportPreference(mediaQueryList.matches);

    const onMediaQueryChange = (event: MediaQueryListEvent) => {
      applyViewportPreference(event.matches);
    };

    mediaQueryList.addEventListener("change", onMediaQueryChange);

    return () => {
      mediaQueryList.removeEventListener("change", onMediaQueryChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storageKey = isMobileViewport
      ? KEYBOARD_VISIBILITY_STORAGE_KEY_MOBILE
      : KEYBOARD_VISIBILITY_STORAGE_KEY_DESKTOP;

    window.localStorage.setItem(storageKey, String(isKeyboardVisible));
  }, [isKeyboardVisible, isMobileViewport]);

  const handleLogin = async () => {
    if (email === "" || password === "") {
      message.warning(
        "El correo y la contraseña deben estar llenos para continuar"
      );
      return;
    }
    try {
      await login(email, password);
    } catch (err) {
      console.log(err);
      alert("Error de autenticación");
    }
    // if (password === "1234") navigate("/control");
  };

  const appendToActiveInput = (value: string) => {
    if (tecladoActive === "email") {
      setEmail((prev) => prev + value);
      return;
    }
    setPassword((prev) => prev + value);
  };

  const addSpaceToActiveInput = () => appendToActiveInput(" ");

  const removeFromActiveInput = () => {
    if (tecladoActive === "email") {
      setEmail((prev) => prev.slice(0, -1));
      return;
    }
    setPassword((prev) => prev.slice(0, -1));
  };

  const clearActiveInput = () => {
    if (tecladoActive === "email") {
      setEmail("");
      return;
    }
    setPassword("");
  };

  const activeText = tecladoActive === "email" ? email : password;
  const setActiveText = tecladoActive === "email" ? setEmail : setPassword;

  return (
    <div className="w-full min-h-screen bg-blue-700 text-gray-800 font-sans px-4 py-6 md:py-8">
      <div className="mx-auto w-full max-w-[1720px] grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 items-start">
        {isKeyboardVisible && (
          <section className="w-full xl:col-span-7">
            <div className="mx-auto rounded-lg bg-white/95 p-4 sm:p-5 shadow-lg">
              <TecladoVirtual
                onKeyPress={appendToActiveInput}
                onBackspace={removeFromActiveInput}
                onSpace={addSpaceToActiveInput}
                onClear={clearActiveInput}
                text={activeText}
                setTexto={setActiveText}
              />
            </div>
          </section>
        )}

        <section
          className={`${isKeyboardVisible ? "w-full xl:col-span-5" : "w-full"} flex w-full justify-center`}
        >
          <div className="w-full max-w-xl xl:max-w-[640px] flex flex-col gap-4 md:gap-5">
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={() => setIsKeyboardVisible((prev) => !prev)}
                className="rounded bg-gray-700 px-3 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-gray-600"
              >
                {isKeyboardVisible
                  ? "Ocultar teclado touch"
                  : "Mostrar teclado touch"}
              </button>
            </div>

            <div className="w-full text-white text-base sm:text-lg">
              🕒 {new Date().toLocaleString("es-MX", { hour12: false })}
            </div>
            <div className="py-6 md:py-10 w-full">
              <h1 className="font-bold">
                <span className="text-white w-full inline-block text-3xl md:text-4xl">
                  GrowthSuite
                </span>
                <span className="text-yellow-500 w-full inline-block text-4xl md:text-6xl">
                  POS Centro Control
                </span>
              </h1>
            </div>

            <label
              className="w-full text-start font-bold text-white"
              htmlFor="Username"
            >
              Correo electrónico
            </label>
            <input
              type="email"
              className="w-full border text-center py-2 px-4 rounded shadow bg-white"
              placeholder="EMAIL"
              value={email}
              onFocus={() => setTecladoActive("email")}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label
              className="w-full text-start font-bold text-white"
              htmlFor="Password"
            >
              Contraseña
            </label>
            <input
              type="password"
              className="w-full border text-center py-2 px-4 rounded shadow bg-white"
              placeholder="CONTRASEÑA"
              value={password}
              onFocus={() => setTecladoActive("password")}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="button"
              onClick={() => handleLogin()}
              className="bg-yellow-500 text-white text-center justify-center py-2 px-6 rounded w-full shadow text-lg flex items-center gap-2"
            >
              ENTRAR <span>➡️</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LoginScreen;
