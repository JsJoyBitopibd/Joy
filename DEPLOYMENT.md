# Deployment guide

Every push to `main1` deploys this app to EC2 automatically: GitHub Actions SSHes into the server, pulls the new code, installs dependencies, and restarts the app with PM2. Sections 1–3 are one-time server setup; after that, section 4 is the whole workflow.

## 1. Prepare the EC2 instance (one-time)

1. In the EC2 console, launch an instance: Ubuntu 24.04 LTS, `t2.micro` or `t3.micro`. Create and download a key pair (e.g. `joy-key.pem`).
2. In the instance's security group, allow inbound:
   - SSH (22) from your IP only
   - HTTP (80) from anywhere
3. Allocate an Elastic IP and associate it with the instance, so the address survives restarts.
4. SSH in and install Node 20, git, and PM2:

   ```bash
   ssh -i joy-key.pem ubuntu@<EC2_PUBLIC_IP>
   ```

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs git
   sudo npm i -g pm2
   ```

## 2. First manual deploy (one-time)

On the server:

```bash
git clone https://github.com/JsJoyBitopibd/Joy.git ~/app
cd ~/app
npm ci
pm2 start server.js --name joy
pm2 save
pm2 startup
```

Run the command that `pm2 startup` prints — it makes the app restart after a reboot.

If the repo is private, give the server read access with a deploy key: run `ssh-keygen` on the EC2 box, add the public key under repo Settings → Deploy keys, and clone via the SSH URL instead.

The app listens on port 3000. Put nginx in front so visitors reach it on port 80:

```bash
sudo apt-get install -y nginx
sudo tee /etc/nginx/sites-available/default > /dev/null <<'EOF'
server {
  listen 80 default_server;
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; }
}
EOF
sudo systemctl reload nginx
```

Confirm `http://<EC2_PUBLIC_IP>` shows the site.

## 3. GitHub secrets (one-time)

Under repo Settings → Secrets and variables → Actions, add:

| Secret | Value |
|---|---|
| `EC2_HOST` | the instance's public/Elastic IP |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | full contents of `joy-key.pem` |

## 4. Deploying from now on

Push to `main1`. The workflow in [.github/workflows/deploy.yml](.github/workflows/deploy.yml) then:

1. SSHes into the server using the secrets above
2. Resets `~/app` to the pushed commit (`git reset --hard origin/main1`)
3. Installs production dependencies (`npm ci --omit=dev`)
4. Restarts the app (`pm2 restart joy`)
5. Fails the run if `http://localhost:3000` doesn't respond

Watch each run under the repo's Actions tab.

## 5. Troubleshooting

- **Run fails at the SSH step** — check the three secrets: `EC2_HOST` must be the current IP, `EC2_SSH_KEY` the full `.pem` contents including the BEGIN/END lines, and port 22 must allow the connection (GitHub runners connect from changing IPs, so either open 22 broadly during deploys or restrict it another way).
- **Run fails at the curl step** — the app didn't come back up. On the server, `pm2 logs joy` shows why.
- **Site down but no failed run** — `pm2 status` on the server; `pm2 restart joy` to recover; `sudo systemctl status nginx` if PM2 looks healthy.
- **Local edits on the server are lost after a deploy** — expected: `git reset --hard` discards them. Make all changes through the repo.
