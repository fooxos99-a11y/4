const path = require("path")

const rootDir = __dirname
const runner = path.join(rootDir, "scripts", "vps", "run-site.sh")
const sites = [
  { name: "site1", envFile: "./deploy/vps/sites/site-1/site.env" },
  { name: "site2", envFile: "./deploy/vps/sites/site-2/site.env" },
  { name: "site3", envFile: "./deploy/vps/sites/site-3/site.env" },
  { name: "site4", envFile: "./deploy/vps/sites/site-4/site.env" },
]

function makeSite(siteName, envFile) {
  return [
    {
      name: `habib-${siteName}-app`,
      cwd: rootDir,
      script: runner,
      args: `app ${envFile}`,
      interpreter: "/bin/bash",
      autorestart: true,
      time: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
    {
      name: `habib-${siteName}-worker`,
      cwd: rootDir,
      script: runner,
      args: `worker ${envFile}`,
      interpreter: "/bin/bash",
      autorestart: true,
      time: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ]
}

module.exports = {
  apps: sites.flatMap((site) => makeSite(site.name, site.envFile)),
}