import { Application, HttpError, Status, Router } from "https://deno.land/x/oak/mod.ts";
import { join } from "https://deno.land/std@0.123.0/path/mod.ts"
import { renderApp } from "../src/index.server.tsx";
import symbols from "./build/q-symbols.json" assert { type: 'json' };
import {
  bold,
  cyan,
  green,
  red,
} from "https://deno.land/std@0.122.0/fmt/colors.ts";

const PORT = Deno.env.get("PORT") || 8080;

const app = new Application();

// Error handler middleware
app.use(async (context, next) => {
  try {
    await next();
  } catch (e) {
    if (e instanceof HttpError) {
      // deno-lint-ignore no-explicit-any
      context.response.status = e.status as any;
      if (e.expose) {
        context.response.body = `<!DOCTYPE html>
            <html>
              <body>
                <h1>${e.status} - ${e.message}</h1>
              </body>
            </html>`;
      } else {
        context.response.body = `<!DOCTYPE html>
            <html>
              <body>
                <h1>${e.status} - ${Status[e.status]}</h1>
              </body>
            </html>`;
      }
    } else if (e instanceof Error) {
      context.response.status = 500;
      context.response.body = `<!DOCTYPE html>
            <html>
              <body>
                <h1>500 - Internal Server Error</h1>
              </body>
            </html>`;
      console.log("Unhandled Error:", red(bold(e.message)));
      console.log(e.stack);
    }
  }
});

// Logger
app.use(async (context, next) => {
  await next();
  const rt = context.response.headers.get("X-Response-Time");
  console.log(
    `${green(context.request.method)} ${cyan(context.request.url.pathname)} - ${
      bold(
        String(rt),
      )
    }`,
  );
});

// Response Time
app.use(async (context, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  context.response.headers.set("X-Response-Time", `${ms}ms`);
});

const router = new Router();
const __dirname = new URL('.', import.meta.url).pathname;
const root = join(__dirname, '..', 'public');

router.get("/", async function handleQwik(context) {
  console.log('got to qwik', context.request.url.pathname)
  const result = await renderApp({
    symbols,
    url: context.request.url,
    debug: true,
  });
  context.response.body = result.html;
})

app.use(router.routes());
app.use(router.allowedMethods())

// Static content
app.use(async (context) => {
  console.log('got to static', context.request.url.pathname);
  await context.send({ root });
})

// Page not found
app.use((context) => {
  console.log('got to not found', context.request.url.pathname);
  context.response.status = Status.NotFound
  context.response.body = `"${context.request.url}" not found`
})

app.addEventListener('listen', () => {
  console.log(`Listening on localhost:${PORT}`);
});

await app.listen({ port: 8080 });