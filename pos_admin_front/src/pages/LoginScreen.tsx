// src/pages/LoginScreen.tsx
import { useAuth } from "@/components/Auth/AuthContext";
import TecladoVirtual from "@/components/TecladoVirtual";
import { message } from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const TOUCH_MEDIA_QUERY = "(max-width: 1024px), (hover: none) and (pointer: coarse)";
const KEYBOARD_VISIBILITY_STORAGE_KEY_DESKTOP =
  "pos_admin_login_keyboard_visible_desktop";
const KEYBOARD_VISIBILITY_STORAGE_KEY_MOBILE =
  "pos_admin_login_keyboard_visible_mobile";

const getIsTouchViewport = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia(TOUCH_MEDIA_QUERY).matches;
};

const getKeyboardVisibilityPreference = (isTouchViewport: boolean): boolean => {
  if (typeof window === "undefined") return !isTouchViewport;
  if (isTouchViewport) return false;

  const storageKey = KEYBOARD_VISIBILITY_STORAGE_KEY_DESKTOP;

  const savedPreference = window.localStorage.getItem(storageKey);

  if (savedPreference === null) return true;

  return savedPreference !== "false";
};

const LoginScreen: React.FC = () => {
  const [password, setPassword] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [tecladoActive, setTecladoActive] = useState<"email" | "password">(
    "email"
  );
  const [isTouchViewport, setIsTouchViewport] = useState<boolean>(() =>
    getIsTouchViewport()
  );
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(() =>
    getKeyboardVisibilityPreference(getIsTouchViewport())
  );

  const { token, login } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (token) navigate("/dashboard"); // 🔁 Si ya está logueado, redirige
  }, [token, navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQueryList = window.matchMedia(TOUCH_MEDIA_QUERY);
    const applyViewportPreference = (isTouch: boolean) => {
      setIsTouchViewport(isTouch);
      setIsKeyboardVisible(getKeyboardVisibilityPreference(isTouch));
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

    if (isTouchViewport) {
      window.localStorage.setItem(KEYBOARD_VISIBILITY_STORAGE_KEY_MOBILE, "false");
      return;
    }

    window.localStorage.setItem(
      KEYBOARD_VISIBILITY_STORAGE_KEY_DESKTOP,
      String(isKeyboardVisible)
    );
  }, [isKeyboardVisible, isTouchViewport]);

  const handleLogin = async () => {
    if (email === "" || password === "") {
      message.warning(
        "EL Email y el password deben estar llenos para continuar"
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
        {!isTouchViewport && isKeyboardVisible && (
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
          className={`${
            !isTouchViewport && isKeyboardVisible
              ? "w-full xl:col-span-5"
              : "w-full"
          } flex w-full justify-center`}
        >
          <div className="w-full max-w-xl xl:max-w-[640px] flex flex-col gap-4 md:gap-5">
            {!isTouchViewport && (
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
            )}

            <div className="w-full text-white text-base sm:text-lg">
              🕒 {new Date().toLocaleString("es-MX", { hour12: false })}
            </div>
            <div className="py-6 md:py-10 w-full">
              <h1 className="font-bold">
                <span className="text-white w-full inline-block text-3xl md:text-4xl">
                  GrowthSuite
                </span>
                <span className="text-yellow-500 w-full inline-block text-4xl md:text-6xl">
                  POS Admin
                </span>
              </h1>
            </div>

            <label
              className="w-full text-start font-bold text-white"
              htmlFor="Username"
            >
              Username Email
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
              Password
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
