import { ensureFamilyRemoteSecuritySchema } from "../src/services/familyProtection/familyRemoteSecuritySchema.js";

await ensureFamilyRemoteSecuritySchema();
console.log("SCHEMA_OK");
