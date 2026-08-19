import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import translations from "./translations";


// =========================================================
// CONTEXT
// =========================================================

const LanguageContext =
  createContext(null);


// =========================================================
// LANGUAGE PROVIDER
// =========================================================

export function LanguageProvider({
  children
}) {

  const [
    language,
    setLanguageState
  ] = useState(() => {

    return (
      localStorage.getItem(
        "nearconnect_language"
      ) || "en"
    );

  });


  // =======================================================
  // CHANGE LANGUAGE
  // =======================================================

  const setLanguage =
    (newLanguage) => {

      if (
        !translations[newLanguage]
      ) {

        return;

      }


      setLanguageState(
        newLanguage
      );


      localStorage.setItem(
        "nearconnect_language",
        newLanguage
      );


      // Optional browser-wide event
      // Useful for components outside React.

      window.dispatchEvent(
        new CustomEvent(
          "nearconnect-language-change",
          {
            detail: {
              language:
                newLanguage
            }
          }
        )
      );

    };


  // =======================================================
  // TRANSLATION FUNCTION
  // =======================================================

  const t =
    (key) => {

      const parts =
        String(key)
          .split(".");


      let value =
        translations[
          language
        ];


      for (
        const part
        of parts
      ) {

        if (
          value &&
          typeof value ===
            "object" &&
          part in value
        ) {

          value =
            value[part];

        } else {

          value =
            undefined;

          break;

        }

      }


      // ----------------------------------------------------
      // Fallback to English
      // ----------------------------------------------------

      if (
        value === undefined
      ) {

        let fallback =
          translations.en;


        for (
          const part
          of parts
        ) {

          if (
            fallback &&
            typeof fallback ===
              "object" &&
            part in fallback
          ) {

            fallback =
              fallback[part];

          } else {

            fallback =
              undefined;

            break;

          }

        }


        if (
          fallback !== undefined
        ) {

          return fallback;

        }


        // If no translation exists,
        // show the original key.

        return key;

      }


      return value;

    };


  // =======================================================
  // DOCUMENT LANGUAGE
  // =======================================================

  useEffect(() => {

    document.documentElement.lang =
      language === "te"
        ? "te"
        : "en";


    document.documentElement
      .setAttribute(
        "data-language",
        language
      );

  }, [
    language
  ]);


  // =======================================================
  // CONTEXT VALUE
  // =======================================================

  const contextValue =
    useMemo(
      () => ({

        language,

        setLanguage,

        t,

        isTelugu:
          language === "te",

        isEnglish:
          language === "en"

      }),

      [
        language
      ]
    );


  return (

    <LanguageContext.Provider
      value={
        contextValue
      }
    >
      {children}
    </LanguageContext.Provider>

  );

}


// =========================================================
// HOOK
// =========================================================

export function useLanguage() {

  const context =
    useContext(
      LanguageContext
    );


  if (!context) {

    throw new Error(
      "useLanguage must be used inside LanguageProvider"
    );

  }


  return context;

}


export default LanguageContext;