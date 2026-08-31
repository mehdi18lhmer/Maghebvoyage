import assert from "node:assert/strict";
import test from "node:test";
import { isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import frMessages from "../../messages/fr.json";
import { AppIntlProvider } from "../../src/components/providers/app-intl-provider";
import { StatusBadge } from "../../src/components/ui/status-badge";

function findElement(node: ReactNode, type: ReactElement["type"]): ReactElement | null {
  if (isValidElement(node)) {
    if (node.type === type) return node;

    const element = node as ReactElement<{ children?: ReactNode }>;
    return findElement(element.props.children, type);
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElement(child, type);
      if (match) return match;
    }
  }

  return null;
}

test("the real root layout mounts the application translation provider", async () => {
  const { default: RootLayout } = await import("../../src/app/layout");
  const tree = await RootLayout({ children: <StatusBadge kind="booking" status="CONFIRMED" /> });
  const provider = findElement(tree, AppIntlProvider) as ReactElement<ComponentProps<typeof AppIntlProvider>> | null;

  assert.ok(provider, "RootLayout must wrap dashboard routes in AppIntlProvider");
  assert.equal(provider.props.locale, "fr");
  assert.deepEqual(provider.props.messages, { StatusBadge: {} });
  assert.equal(provider.props.timeZone, "Africa/Casablanca");
});

test("localized routes reuse the root provider instead of nesting a second message catalog", async () => {
  const { default: LocaleLayout } = await import("../../src/app/[locale]/layout");
  const child = <span>Localized page</span>;

  const tree = await LocaleLayout({ children: child, params: Promise.resolve({ locale: "fr" }) });

  assert.equal(tree, child);
});

test("dashboard status badges render with French translations and no i18n fallback", () => {
  const errors: unknown[][] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => errors.push(args);

  let html: string;
  try {
    html = renderToStaticMarkup(
      <AppIntlProvider locale="fr" messages={frMessages} timeZone="Africa/Casablanca">
        <StatusBadge kind="booking" status="CONFIRMED" />
      </AppIntlProvider>
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.match(html, />Confirmée</);
  assert.deepEqual(errors, [], "Rendering the dashboard provider must not emit i18n fallback errors");
});
