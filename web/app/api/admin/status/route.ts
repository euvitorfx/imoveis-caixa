import { NextRequest, NextResponse } from "next/server";

function checkAdmin(req: NextRequest) {
  return req.cookies.get("admin_token")?.value === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const repo = process.env.GITHUB_REPO ?? "euvitorfx/imoveis-caixa";
  const ghHeaders: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) ghHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const [runsResult, deploymentsResult] = await Promise.allSettled([
    fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=100`, {
      headers: ghHeaders,
      cache: "no-store",
    }),
    fetch(
      `https://api.vercel.com/v6/deployments?projectId=${process.env.VERCEL_PROJECT_ID}&limit=15`,
      {
        headers: { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}` },
        cache: "no-store",
      }
    ),
  ]);

  // GitHub — latest run per workflow
  let workflows: unknown[] = [];
  if (runsResult.status === "fulfilled" && runsResult.value.ok) {
    const data = await runsResult.value.json();
    const latest: Record<number, unknown> = {};
    for (const run of data.workflow_runs ?? []) {
      if (!latest[run.workflow_id as number]) latest[run.workflow_id as number] = run;
    }
    workflows = Object.values(latest);
  }

  // Vercel — latest deployments
  let deployments: unknown[] = [];
  if (deploymentsResult.status === "fulfilled" && deploymentsResult.value.ok) {
    const data = await deploymentsResult.value.json();
    deployments = data.deployments ?? [];
  }

  return NextResponse.json({ workflows, deployments });
}
