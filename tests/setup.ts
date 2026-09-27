import { config } from "dotenv";

// Tests always run against stayaxis_test, never stayaxis_dev.
config({ path: ".env.test" });
