name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: cmms
          POSTGRES_PASSWORD: cmms_password
          POSTGRES_DB: cmms_test
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgresql://cmms:cmms_password@localhost:5432/cmms_test
      NEXTAUTH_SECRET: ci-test-secret-please-override-in-real-deploys-000000
      NEXTAUTH_URL: http://localhost:3000
      NEXT_PUBLIC_APP_URL: http://localhost:3000

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

      - name: Prisma generate + migrate
        run: |
          npx prisma generate
          npx prisma migrate deploy

      - name: Unit tests
        run: npm test

      - name: API tests
        run: npm run test:api

      - name: Build
        run: npm run build

  docker-publish:
    needs: build-and-test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Log in to private registry
        uses: docker/login-action@v3
        with:
          registry: ${{ secrets.PRIVATE_REGISTRY_URL }}
          username: ${{ secrets.PRIVATE_REGISTRY_USER }}
          password: ${{ secrets.PRIVATE_REGISTRY_TOKEN }}

      - name: Build and push image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ secrets.PRIVATE_REGISTRY_URL }}/cmms-pro:${{ github.sha }}

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd /opt/cmms-pro
            docker compose pull
            docker compose up -d
