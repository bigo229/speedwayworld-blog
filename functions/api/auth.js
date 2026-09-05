export async function onRequest(context) {
  const { env } = context;
  const clientId = env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return new Response("Missing GITHUB_CLIENT_ID environment variable.", { status: 500 });
  }

  // Requesting 'repo' scope gives Decap CMS full read/write access to your repository
  const gitHubAuthUrl = `https://github.com{clientId}&scope=repo`;

  return Response.redirect(gitHubAuthUrl, 302);
}
