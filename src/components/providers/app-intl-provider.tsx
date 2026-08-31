"use client";

import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps, ReactNode } from "react";

type NextIntlProviderProps = ComponentProps<typeof NextIntlClientProvider>;

type AppIntlProviderProps = {
  children: ReactNode;
  locale: NextIntlProviderProps["locale"];
  messages: NextIntlProviderProps["messages"];
  timeZone: NextIntlProviderProps["timeZone"];
};

/** Makes translations available to routes outside the localized `[locale]` segment. */
export function AppIntlProvider({ children, locale, messages, timeZone }: AppIntlProviderProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      {children}
    </NextIntlClientProvider>
  );
}
