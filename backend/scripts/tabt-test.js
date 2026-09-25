// Teste les identifiants TabT de backend/.env (un seul appel à l'opération Test).
// Usage : npm run tabt:test
import "dotenv/config";
import soap from "soap";

const { TABT_ACCOUNT, TABT_PASSWORD, TABT_WSDL_URL = "https://api.aftt.be/?wsdl" } = process.env;

if (!TABT_ACCOUNT || !TABT_PASSWORD) {
  console.error("TABT_ACCOUNT et TABT_PASSWORD doivent être renseignés dans backend/.env.");
  process.exit(1);
}

const client = await soap.createClientAsync(TABT_WSDL_URL);
client.setSecurity(new soap.BasicAuthSecurity(TABT_ACCOUNT, TABT_PASSWORD));

// Les identifiants sont envoyés dans le corps de la requête (Credentials) comme l'exige TabT.
const [result] = await client.TestAsync({ Credentials: { Account: TABT_ACCOUNT, Password: TABT_PASSWORD } });

console.log(`Compte : ${TABT_ACCOUNT}`);
console.log(`Identifiants valides : ${result.IsValidAccount}`);
console.log(`Quota autorisé : ${result.AllowedQuota} — consommé : ${result.ConsumedTicks}`);

if (!result.IsValidAccount) {
  console.error("\nIdentifiants refusés : vérifie TABT_ACCOUNT / TABT_PASSWORD dans backend/.env (mot de passe API, pas celui du site).");
  process.exit(2);
}
console.log("\nConnexion TabT OK.");
