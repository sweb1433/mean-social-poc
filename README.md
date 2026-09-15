# POC: Users, Timeline & File Uploads

Minimal full-stack POC: Node/Express REST API + MongoDB + JWT auth, an Angular
21 SPA, and file uploads (profile pictures, resumes, post attachments) to S3.
Built to run cheaply on a single AWS free-tier EC2 instance behind Nginx.



## Stack

- **API**: Node.js, Express, Mongoose, JWT, express-validator, multer-s3
- **DB**: MongoDB Atlas (free M0 cluster)
- **Frontend**: Angular 21 (standalone components, signals, no UI kit — plain CSS)
- **Storage**: AWS S3 (profile pictures, resumes, post attachments)
- **Deploy target**: 1× EC2 instance running Nginx (serves the Angular build +
  reverse-proxies `/api` to Node/PM2)

## Features

- Signup / login (JWT), two roles: `user`, `admin`
- Users: view/edit own profile, upload a profile picture, upload up to 3 resumes
- Timeline: any logged-in user can post text and/or one attachment (image or
  document), see everyone's posts, delete their own posts (admins can delete any)
- Admin: list/search/paginate users, create a user, edit name/email/role,
  delete a user (cascades: their posts + all their S3 files are cleaned up)

## Repo layout

```
server/   Express API (see server/README below via .env.example)
client/   Angular SPA
deploy/   Nginx config + IAM/S3 policy templates for the EC2 deployment
```

## 1. Local development

### Backend

```bash
cd server
npm install
cp .env.example .env   # or just edit the .env already there
npm run dev             # nodemon, http://localhost:3000
```

You need a MongoDB instance for this to boot — either run `mongod` locally, or
point `MONGODB_URI` straight at your Atlas cluster (see §2). Leave
`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` empty until you've created a
bucket (§3) — every route works except the three upload endpoints, which will
500 until S3 is configured.

Create the first admin (signup always creates a plain `user`):

```bash
npm run seed:admin   # reads ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME from .env
```

### Frontend

```bash
cd client
npm install
npm start   # ng serve, http://localhost:4200
```

`src/environments/environment.development.ts` points at
`http://localhost:3000/api`. The production build (`environment.ts`) uses a
relative `/api` path, since Nginx will serve both from the same origin.

## 2. MongoDB Atlas (free, forever — not part of your AWS credit)

1. Create a free account at mongodb.com/cloud/atlas, create an **M0** cluster.
2. Database Access → add a user with a strong password.
3. Network Access → add your IP (or `0.0.0.0/0` for a quick POC — tighten
   later, or restrict to your EC2 instance's IP once deployed).
4. Get the connection string ("Connect your application") and paste it into
   `server/.env` as `MONGODB_URI` (include a database name in the path, e.g.
   `.../poc-app?retryWrites=true&w=majority`).

## 3. AWS S3

1. Create a bucket (pick a region close to where your EC2 instance will run).
2. Apply `deploy/s3-bucket-policy.json.example` (replace the bucket name) so
   uploaded files are readable via their direct S3 URL — that's what the API
   returns and what the Angular app renders directly (`<img src="...">`,
   download links). **Trade-off**: this makes objects public-read; anyone
   with the exact URL (a random UUID per file) can view it. Fine for a POC;
   if you need real privacy — especially for resumes — swap
   `buildPublicUrl` in `server/src/utils/s3File.js` for S3 presigned GET URLs
   instead, and drop the bucket policy.
3. Local dev only: create an IAM user with `deploy/iam-bucket-policy.json.example`
   attached, generate an access key, put it in `server/.env`
   (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`). **Delete this key** once
   you deploy to EC2 — the EC2 instance should use an IAM role instead (§4),
   never long-lived keys on the box.

## 4. Deploying to EC2 (the actual POC)

Keep this to **one** `t2.micro`/`t3.micro` instance — no load balancer, no NAT
gateway, no RDS. That's what keeps this inside the free credit.

1. **Launch**: Ubuntu, t2.micro/t3.micro, a small gp3 volume (8–20GB).
   Security group: 22 (your IP only), 80 (anywhere), 443 if you set up TLS.
2. **IAM role**: create a role with `deploy/iam-bucket-policy.json.example`
   attached and assign it to the instance. The SDK on the server picks up
   these credentials automatically — that's why `s3.js` only sets explicit
   credentials when `AWS_ACCESS_KEY_ID` is present.
3. **Install runtime**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs nginx
   sudo npm install -g pm2
   ```
4. **Ship the code** (git clone, or scp the two folders).
5. **Backend**:
   ```bash
   cd server && npm install --omit=dev
   # edit .env: real MONGODB_URI, a strong JWT_SECRET, S3_BUCKET_NAME,
   # AWS_REGION, leave AWS_ACCESS_KEY_ID/SECRET empty (using the IAM role)
   npm run seed:admin
   pm2 start src/server.js --name poc-api
   pm2 save && pm2 startup   # survives reboot
   ```
6. **Frontend build** (build locally or on the instance):
   ```bash
   cd client && npm install && npm run build
   sudo mkdir -p /var/www/poc-app
   sudo cp -r dist/client/browser /var/www/poc-app/
   ```
7. **Nginx**: copy `deploy/nginx.conf.example` to
   `/etc/nginx/sites-available/poc-app`, fill in your IP/domain, symlink into
   `sites-enabled`, remove the default site, `nginx -t && systemctl reload nginx`.
8. Visit `http://<ec2-public-ip>/`.

Optional: a real domain + `certbot --nginx` for free HTTPS.

## 5. Keeping this inside the free credit

- **Stop the instance** when you're not actively using it — a stopped
  instance only costs a few cents/month for the EBS volume.
- Set a **billing budget/alarm** (e.g. $5) right away.
- Don't add: NAT Gateway, Load Balancer, RDS, ElastiCache, CloudFront — none
  of these are needed for this POC and they're the components that actually
  rack up cost.
- Don't allocate an Elastic IP unless you need a fixed address — an EIP not
  attached to a *running* instance is billed hourly.
- MongoDB Atlas M0 and this app's S3 usage are effectively free at POC scale;
  EC2 compute (while running) is the only thing drawing from the $100 credit.

## Notes / things kept deliberately minimal

- No refresh tokens — JWT expires after 7 days (`JWT_EXPIRES_IN`), the user
  just logs in again. Fine for a POC, not for production.
- No automated test suite — the API was manually verified end-to-end
  (signup/login/CRUD/admin/roles) against a local MongoDB, and the UI was
  driven through the same flows in a real browser during development.
- S3 objects are public-read (see §3's trade-off note) rather than using
  presigned URLs, to keep the code simple.
