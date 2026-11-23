/** Version en ligne : l'appli restée ouverte la compare à la sienne. */
export const dynamic = "force-dynamic";

export const GET = () => Response.json({ version: process.env.NEXT_PUBLIC_VERSION }, { headers: { "Cache-Control": "no-store" } });
