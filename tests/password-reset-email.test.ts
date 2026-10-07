import assert from "node:assert/strict";
import test from "node:test";
import { createPasswordResetEmailText } from "../server/password-reset-email";

test("recovery email includes the account username, login guidance and unchanged recovery link", () => {
  const url = "https://example.invalid/reset-password#token=fixture-token";
  const text = createPasswordResetEmailText("fixture-gebruiker", url);
  assert.ok(text.includes("Je gebruikersnaam: fixture-gebruiker"));
  assert.ok(text.includes("Je kunt inloggen met je e-mailadres of deze gebruikersnaam."));
  assert.ok(text.includes(url));
  assert.ok(text.includes("30 minuten geldig"));
  assert.ok(text.includes("één keer"));
});
