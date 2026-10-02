// Sweeps every leftover `@example.test` account (and their test-only
// families + files) — for runs killed before their own cleanup ran:
//
//   node .claude/skills/run-photos/scripts/purge-test-accounts.mjs
//
// Real accounts and any family with a real member are never touched (see
// _test-accounts.mjs).

import { purgeAllTestAccounts } from "./_test-accounts.mjs";

const r = await purgeAllTestAccounts();
console.log(`purged ${r.users} test account(s), ${r.families} family(ies), ${r.files} file(s)`);
