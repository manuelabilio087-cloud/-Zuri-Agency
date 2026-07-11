import { app } from "@/app";
import { env } from "@/config/env";

app.listen(env.PORT, () => {
  console.log(`🚀 Zuri Agency API a correr na porta ${env.PORT} (${env.NODE_ENV})`);
});
